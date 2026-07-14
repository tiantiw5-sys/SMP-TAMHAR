-- Migrasi: pecah absensi murid dari blob JSONB tunggal (portal_collections,
-- collection_key='studentAttendance') jadi tabel normal 1-baris-per-catatan.
--
-- KENAPA: desain lama menyimpan SELURUH riwayat absensi sebagai satu baris
-- JSONB. Setiap 1 murid scan barcode, Supabase Realtime broadcast SELURUH
-- array itu (bukan cuma baris yang berubah) ke SEMUA klien yang sedang
-- terhubung (dashboard, kiosk absen, dll) — ini penyebab utama lonjakan
-- egress, makin parah seiring riwayat absensi menumpuk sepanjang tahun ajaran.
--
-- Aman dijalankan berulang (idempotent). Ditulis 2026-07-13 dini hari.

create table if not exists public.student_attendance (
  id text primary key,
  student_id text not null,
  student_name text not null,
  class_name text not null,
  date date not null,
  status text not null check (status in ('Hadir', 'Izin', 'Sakit', 'Alpa')),
  check_in_at timestamptz,
  source text not null check (source in ('scan', 'manual')),
  recorded_by text,
  note text,
  updated_at timestamptz not null default now()
);

-- Satu murid cuma boleh punya 1 catatan per tanggal (sama seperti invarian
-- lama yang dijaga manual lewat konvensi id `att-{studentId}-{date}`) —
-- sekarang database sendiri yang menjamin lewat constraint, dipakai juga
-- oleh upsert_student_attendance() di bawah untuk ON CONFLICT.
create unique index if not exists student_attendance_student_date_uidx
  on public.student_attendance (student_id, date);

create index if not exists student_attendance_date_idx
  on public.student_attendance (date);

alter table public.student_attendance enable row level security;

-- Realtime — supaya dashboard/kiosk lain tetap dapat update seketika, tapi
-- sekarang Postgres cuma kirim BARIS yang berubah, bukan seluruh riwayat.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'student_attendance'
  ) then
    alter publication supabase_realtime add table public.student_attendance;
  end if;
end $$;

-- RLS: sama persis dengan aturan collection_key='studentAttendance' yang lama
-- (lihat schema.sql portal_collections_staff_select) — semua staf yang login
-- KECUALI role 'Orang Tua' boleh baca (Orang Tua tetap lewat RPC
-- get_my_child_attendance() di bawah, bukan baca tabel langsung).
drop policy if exists "student_attendance_select" on public.student_attendance;
create policy "student_attendance_select"
  on public.student_attendance for select
  to authenticated
  using (public.current_role_name() <> 'Orang Tua');

drop policy if exists "student_attendance_write" on public.student_attendance;
create policy "student_attendance_write"
  on public.student_attendance for insert
  to authenticated
  with check (public.current_role_name() in ('Super Admin', 'Managerial Sekolah', 'Guru Piket'));

drop policy if exists "student_attendance_update" on public.student_attendance;
create policy "student_attendance_update"
  on public.student_attendance for update
  to authenticated
  using (public.current_role_name() in ('Super Admin', 'Managerial Sekolah', 'Guru Piket'))
  with check (public.current_role_name() in ('Super Admin', 'Managerial Sekolah', 'Guru Piket'));

drop policy if exists "student_attendance_delete" on public.student_attendance;
create policy "student_attendance_delete"
  on public.student_attendance for delete
  to authenticated
  using (public.current_role_name() in ('Super Admin', 'Managerial Sekolah', 'Guru Piket'));

-- Ganti upsert_item_by_id khusus untuk absensi murid: insert-atau-update SATU
-- baris, dicocokkan lewat (student_id, date) — keputusan "timpa" vs "baru"
-- tetap diputuskan DATABASE dalam satu transaksi (bukan ditebak di browser),
-- persis sifat atomik yang sama seperti upsert_item_by_id lama, cuma sekarang
-- hasil & broadcast Realtime-nya cuma 1 baris, bukan seluruh array.
create or replace function public.upsert_student_attendance(p_record jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
  result public.student_attendance;
begin
  select role into caller_role from public.profiles where id = auth.uid();
  if caller_role is null or caller_role not in ('Super Admin', 'Managerial Sekolah', 'Guru Piket') then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  insert into public.student_attendance (
    id, student_id, student_name, class_name, date, status, check_in_at, source, recorded_by, note, updated_at
  ) values (
    p_record->>'id',
    p_record->>'studentId',
    p_record->>'studentName',
    p_record->>'className',
    (p_record->>'date')::date,
    p_record->>'status',
    nullif(p_record->>'checkInAt', '')::timestamptz,
    p_record->>'source',
    nullif(p_record->>'recordedBy', ''),
    nullif(p_record->>'note', ''),
    now()
  )
  on conflict (student_id, date) do update set
    id = excluded.id,
    student_name = excluded.student_name,
    class_name = excluded.class_name,
    status = excluded.status,
    check_in_at = excluded.check_in_at,
    source = excluded.source,
    recorded_by = excluded.recorded_by,
    note = excluded.note,
    updated_at = now()
  returning * into result;

  return jsonb_build_object(
    'id', result.id,
    'studentId', result.student_id,
    'studentName', result.student_name,
    'className', result.class_name,
    'date', to_char(result.date, 'YYYY-MM-DD'),
    'status', result.status,
    'checkInAt', result.check_in_at,
    'source', result.source,
    'recordedBy', result.recorded_by,
    'note', result.note
  );
end;
$$;

revoke all on function public.upsert_student_attendance(jsonb) from public, anon;
grant execute on function public.upsert_student_attendance(jsonb) to authenticated;

-- Ganti overwriteCollection('studentAttendance', filtered) yang dulu dipakai
-- tombol "Hapus riwayat absensi tanggal X" — sekarang cukup DELETE baris
-- bertanggal itu, bukan timpa seluruh array dari salinan di browser.
create or replace function public.delete_student_attendance_for_date(p_date date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
begin
  select role into caller_role from public.profiles where id = auth.uid();
  if caller_role is null or caller_role not in ('Super Admin', 'Managerial Sekolah', 'Guru Piket') then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  delete from public.student_attendance where date = p_date;
end;
$$;

revoke all on function public.delete_student_attendance_for_date(date) from public, anon;
grant execute on function public.delete_student_attendance_for_date(date) to authenticated;

-- get_my_child_attendance() sekarang baca dari tabel normal, bukan filter
-- array JSONB. Perilaku dari sudut pandang pemanggil (Portal Orang Tua) tetap
-- sama persis — cuma sumber datanya yang berubah.
create or replace function public.get_my_child_attendance()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', sa.id,
    'studentId', sa.student_id,
    'studentName', sa.student_name,
    'className', sa.class_name,
    'date', to_char(sa.date, 'YYYY-MM-DD'),
    'status', sa.status,
    'checkInAt', sa.check_in_at,
    'source', sa.source,
    'recordedBy', sa.recorded_by,
    'note', sa.note
  ) order by sa.date desc), '[]'::jsonb)
  from public.student_attendance sa
  where sa.student_id = public.current_linked_student_id()
$$;

revoke all on function public.get_my_child_attendance() from public, anon;
grant execute on function public.get_my_child_attendance() to authenticated;

-- trim_old_attendance() (cron bulanan, lihat auto_archive_attendance.sql) —
-- bagian studentAttendance sekarang menghapus baris dari tabel normal.
-- Bagian teacherAttendanceLog TIDAK diubah (masih JSONB, di luar cakupan
-- migrasi ini) — tetap seperti definisi lama.
create or replace function public.trim_old_attendance()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cutoff date := (current_date - interval '6 months')::date;
begin
  delete from public.student_attendance where date < cutoff;

  update public.portal_collections
  set payload = (
    select coalesce(jsonb_agg(elem), '[]'::jsonb)
    from jsonb_array_elements(payload) as elem
    where (elem->>'date')::date >= cutoff
  ),
  updated_at = now()
  where collection_key = 'teacherAttendanceLog';
end;
$$;

-- Backfill: pindahkan sisa data lama (kalau masih ada) dari blob JSONB ke
-- tabel baru, lalu kosongkan blob lama supaya tidak ada 2 sumber data.
-- Aman dijalankan berulang — ON CONFLICT DO NOTHING mencegah duplikat kalau
-- script ini ke-run dua kali, dan blok kedua hanya mengosongkan kalau
-- backfill barisnya sudah beres.
insert into public.student_attendance (
  id, student_id, student_name, class_name, date, status, check_in_at, source, recorded_by, note
)
select
  elem->>'id',
  elem->>'studentId',
  elem->>'studentName',
  elem->>'className',
  (elem->>'date')::date,
  elem->>'status',
  nullif(elem->>'checkInAt', '')::timestamptz,
  coalesce(nullif(elem->>'source', ''), 'manual'),
  nullif(elem->>'recordedBy', ''),
  nullif(elem->>'note', '')
from public.portal_collections pc,
     jsonb_array_elements(pc.payload) as elem
where pc.collection_key = 'studentAttendance'
  and elem->>'id' is not null
  and elem->>'studentId' is not null
  and elem->>'date' is not null
on conflict (id) do nothing;

update public.portal_collections
set payload = '[]'::jsonb,
    updated_at = now()
where collection_key = 'studentAttendance'
  and payload <> '[]'::jsonb;
