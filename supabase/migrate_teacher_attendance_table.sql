-- Migrasi: pecah absensi guru dari blob JSONB tunggal (portal_collections,
-- collection_key='teacherAttendanceLog') jadi tabel normal 1-baris-per-catatan.
-- Pola & alasan PERSIS sama seperti migrate_student_attendance_table.sql —
-- lihat file itu untuk detail. Ringkasnya: desain lama menyimpan SELURUH
-- riwayat absensi guru sebagai satu baris JSONB, jadi tiap 1 guru scan
-- kartu QR atau di-absen manual, Supabase Realtime broadcast SELURUH array
-- itu (bukan cuma baris yang berubah) ke SEMUA klien yang terhubung. Dengan
-- ditambahkannya kiosk scan QR guru, tulisan ke koleksi ini jadi jauh lebih
-- sering (tiap guru datang, tiap pagi) — makin mendesak untuk dipecah sebelum
-- riwayatnya menumpuk sepanjang tahun ajaran seperti yang sudah terjadi di
-- studentAttendance.
--
-- Aman dijalankan berulang (idempotent).

create table if not exists public.teacher_attendance (
  id text primary key,
  teacher_id text not null,
  teacher_name text not null,
  date date not null,
  status text not null check (status in ('Hadir', 'Izin', 'Sakit', 'Alpa')),
  recorded_by text,
  updated_at timestamptz not null default now()
);

-- Satu guru cuma boleh punya 1 catatan per tanggal (invarian yang sama
-- dijaga manual lewat konvensi id `tatt-{teacherId}-{date}`) — sekarang
-- database sendiri yang menjamin, dipakai juga oleh upsert_teacher_attendance
-- di bawah untuk ON CONFLICT.
create unique index if not exists teacher_attendance_teacher_date_uidx
  on public.teacher_attendance (teacher_id, date);

create index if not exists teacher_attendance_date_idx
  on public.teacher_attendance (date);

alter table public.teacher_attendance enable row level security;

-- Realtime — dashboard/kiosk lain tetap dapat update seketika, tapi sekarang
-- Postgres cuma kirim BARIS yang berubah, bukan seluruh riwayat.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'teacher_attendance'
  ) then
    alter publication supabase_realtime add table public.teacher_attendance;
  end if;
end $$;

-- RLS: role yang diizinkan PERSIS sama dengan aturan
-- collection_key='teacherAttendanceLog' yang lama (lihat schema.sql
-- portal_collections_staff_select/authenticated_write/update) — beda dengan
-- student_attendance, di sini 'Guru' (bukan cuma 'Guru Piket') juga boleh
-- baca & tulis, karena tab "Guru Piket" di dashboard memang bisa diakses
-- guru biasa untuk absen manual, bukan cuma panitia piket.
drop policy if exists "teacher_attendance_select" on public.teacher_attendance;
create policy "teacher_attendance_select"
  on public.teacher_attendance for select
  to authenticated
  using (public.current_role_name() in ('Super Admin', 'Managerial Sekolah', 'Guru Piket', 'Guru'));

drop policy if exists "teacher_attendance_write" on public.teacher_attendance;
create policy "teacher_attendance_write"
  on public.teacher_attendance for insert
  to authenticated
  with check (public.current_role_name() in ('Super Admin', 'Managerial Sekolah', 'Guru Piket', 'Guru'));

drop policy if exists "teacher_attendance_update" on public.teacher_attendance;
create policy "teacher_attendance_update"
  on public.teacher_attendance for update
  to authenticated
  using (public.current_role_name() in ('Super Admin', 'Managerial Sekolah', 'Guru Piket', 'Guru'))
  with check (public.current_role_name() in ('Super Admin', 'Managerial Sekolah', 'Guru Piket', 'Guru'));

drop policy if exists "teacher_attendance_delete" on public.teacher_attendance;
create policy "teacher_attendance_delete"
  on public.teacher_attendance for delete
  to authenticated
  using (public.current_role_name() in ('Super Admin', 'Managerial Sekolah', 'Guru Piket', 'Guru'));

-- Insert-atau-update SATU baris (dicocokkan lewat teacher_id+date) — keputusan
-- "timpa" vs "baru" diputuskan DATABASE dalam satu transaksi, supaya scan QR
-- kiosk dan input manual guru piket untuk guru+tanggal yang sama tidak pernah
-- menghasilkan baris kembar.
create or replace function public.upsert_teacher_attendance(p_record jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
  result public.teacher_attendance;
begin
  select role into caller_role from public.profiles where id = auth.uid();
  if caller_role is null or caller_role not in ('Super Admin', 'Managerial Sekolah', 'Guru Piket', 'Guru') then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  insert into public.teacher_attendance (
    id, teacher_id, teacher_name, date, status, recorded_by, updated_at
  ) values (
    p_record->>'id',
    p_record->>'teacherId',
    p_record->>'teacherName',
    (p_record->>'date')::date,
    p_record->>'status',
    nullif(p_record->>'recordedBy', ''),
    now()
  )
  on conflict (teacher_id, date) do update set
    id = excluded.id,
    teacher_name = excluded.teacher_name,
    status = excluded.status,
    recorded_by = excluded.recorded_by,
    updated_at = now()
  returning * into result;

  return jsonb_build_object(
    'id', result.id,
    'teacherId', result.teacher_id,
    'teacherName', result.teacher_name,
    'date', to_char(result.date, 'YYYY-MM-DD'),
    'status', result.status,
    'recordedBy', result.recorded_by
  );
end;
$$;

revoke all on function public.upsert_teacher_attendance(jsonb) from public, anon;
grant execute on function public.upsert_teacher_attendance(jsonb) to authenticated;

-- Ganti "Kosongkan Hari Ini" (dulu overwriteCollection seluruh blob) —
-- sekarang cukup DELETE baris bertanggal itu.
create or replace function public.delete_teacher_attendance_for_date(p_date date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
begin
  select role into caller_role from public.profiles where id = auth.uid();
  if caller_role is null or caller_role not in ('Super Admin', 'Managerial Sekolah', 'Guru Piket', 'Guru') then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  delete from public.teacher_attendance where date = p_date;
end;
$$;

revoke all on function public.delete_teacher_attendance_for_date(date) from public, anon;
grant execute on function public.delete_teacher_attendance_for_date(date) to authenticated;

-- trim_old_attendance() (cron bulanan, lihat auto_archive_attendance.sql) —
-- sekarang bagian teacherAttendanceLog juga menghapus baris dari tabel normal,
-- bukan lagi menimpa blob JSONB. Bagian student_attendance dipertahankan
-- persis seperti didefinisikan ulang di migrate_student_attendance_table.sql.
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
  delete from public.teacher_attendance where date < cutoff;
end;
$$;

-- Backfill: pindahkan sisa data lama (kalau masih ada) dari blob JSONB ke
-- tabel baru, lalu kosongkan blob lama supaya tidak ada 2 sumber data.
-- Aman dijalankan berulang — ON CONFLICT DO NOTHING mencegah duplikat.
insert into public.teacher_attendance (
  id, teacher_id, teacher_name, date, status, recorded_by
)
select
  elem->>'id',
  elem->>'teacherId',
  elem->>'teacherName',
  (elem->>'date')::date,
  elem->>'status',
  nullif(elem->>'recordedBy', '')
from public.portal_collections pc,
     jsonb_array_elements(pc.payload) as elem
where pc.collection_key = 'teacherAttendanceLog'
  and elem->>'id' is not null
  and elem->>'teacherId' is not null
  and elem->>'date' is not null
on conflict (id) do nothing;

update public.portal_collections
set payload = '[]'::jsonb,
    updated_at = now()
where collection_key = 'teacherAttendanceLog'
  and payload <> '[]'::jsonb;
