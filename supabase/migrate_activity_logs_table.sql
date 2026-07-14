-- Migrasi: pecah log aktivitas dari blob JSONB tunggal (portal_collections,
-- collection_key='logs') jadi tabel normal 1-baris-per-entri, sama seperti
-- migrate_student_attendance_table.sql untuk studentAttendance.
--
-- KENAPA: 'logs' tumbuh TERUS TANPA BATAS (dicatat di puluhan titik — login,
-- logout, tiap tambah/edit/hapus/export data apa pun) dan disimpan sebagai
-- SATU baris JSONB berisi seluruh riwayat. append_to_collection() memang
-- sudah atomik (tidak saling menimpa antar sesi), TAPI itu tidak menghindari
-- masalah egress: Supabase Realtime (Postgres Changes) selalu broadcast
-- SELURUH baris yang berubah, jadi tiap 1 log baru tetap mengirim ulang
-- SELURUH array log yang sudah menumpuk ke semua klien yang terhubung. Fix
-- ini sama persis root cause-nya dengan kasus studentAttendance kemarin.
--
-- Aman dijalankan berulang (idempotent). Ditulis 2026-07-14.

create table if not exists public.activity_logs (
  id text primary key,
  user_name text not null,
  role text not null,
  action text not null check (action in ('Login', 'Logout', 'Tambah', 'Edit', 'Hapus', 'Export')),
  details text not null,
  client_timestamp text not null,
  created_at timestamptz not null default now()
);

create index if not exists activity_logs_created_at_idx
  on public.activity_logs (created_at desc);

alter table public.activity_logs enable row level security;

-- Realtime — dashboard lain tetap dapat update seketika, tapi sekarang
-- Postgres cuma kirim SATU baris baru, bukan seluruh riwayat log.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'activity_logs'
  ) then
    alter publication supabase_realtime add table public.activity_logs;
  end if;
end $$;

-- RLS: sama persis dengan aturan collection_key='logs' yang lama (lihat
-- schema.sql portal_collections_staff_select) — cuma role manajerial yang
-- boleh baca. SENGAJA tidak ada policy UPDATE/DELETE sama sekali: log
-- aktivitas sekarang append-only murni di level database (bukan cuma
-- konvensi di kode), jadi lebih tahan terhadap penghapusan/pengubahan jejak
-- audit dibanding desain lama yang masih lewat update_collection_item/
-- delete_collection_item generik.
drop policy if exists "activity_logs_select" on public.activity_logs;
create policy "activity_logs_select"
  on public.activity_logs for select
  to authenticated
  using (public.current_role_name() in ('Super Admin', 'Managerial OSIS', 'Managerial Sekolah'));

drop policy if exists "activity_logs_insert" on public.activity_logs;
create policy "activity_logs_insert"
  on public.activity_logs for insert
  to authenticated
  with check (public.current_role_name() in ('Super Admin', 'Managerial OSIS', 'Managerial Sekolah'));

-- Ganti appendToCollection('logs', ...) yang dulu dipakai addActivityLog() di
-- App.tsx — sekarang INSERT satu baris, dan hasil kembaliannya juga cuma
-- satu item (bukan seluruh array) supaya klien tidak perlu menerima ulang
-- riwayat lengkap tiap kali mencatat 1 aksi baru.
create or replace function public.append_activity_log(p_log jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
  result public.activity_logs;
begin
  select role into caller_role from public.profiles where id = auth.uid();
  if caller_role is null or caller_role not in ('Super Admin', 'Managerial OSIS', 'Managerial Sekolah') then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  insert into public.activity_logs (id, user_name, role, action, details, client_timestamp)
  values (
    p_log->>'id',
    p_log->>'user',
    p_log->>'role',
    p_log->>'action',
    p_log->>'details',
    p_log->>'timestamp'
  )
  returning * into result;

  return jsonb_build_object(
    'id', result.id,
    'user', result.user_name,
    'role', result.role,
    'action', result.action,
    'details', result.details,
    'timestamp', result.client_timestamp
  );
end;
$$;

revoke all on function public.append_activity_log(jsonb) from public, anon;
grant execute on function public.append_activity_log(jsonb) to authenticated;

-- Backfill: pindahkan sisa log lama (kalau masih ada) dari blob JSONB ke
-- tabel baru, lalu kosongkan blob lama supaya tidak ada 2 sumber data.
-- client_timestamp lama berformat "YYYY-MM-DD HH:MM" hasil dari
-- `new Date().toISOString().replace('T', ' ').substring(0, 16)` di App.tsx —
-- dibalik persis (ganti spasi jadi 'T', tambah ':00Z') untuk merekonstruksi
-- created_at yang akurat, supaya urutan riwayat lama tetap benar terhadap
-- log baru setelah migrasi. Kalau formatnya tidak cocok (data lama yang
-- tidak wajar), fallback ke now() daripada gagal seluruh migrasi.
insert into public.activity_logs (id, user_name, role, action, details, client_timestamp, created_at)
select
  elem->>'id',
  elem->>'user',
  elem->>'role',
  elem->>'action',
  elem->>'details',
  elem->>'timestamp',
  case
    when (elem->>'timestamp') ~ '^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$'
    then (replace(elem->>'timestamp', ' ', 'T') || ':00Z')::timestamptz
    else now()
  end
from public.portal_collections pc,
     jsonb_array_elements(pc.payload) as elem
where pc.collection_key = 'logs'
  and elem->>'id' is not null
on conflict (id) do nothing;

update public.portal_collections
set payload = '[]'::jsonb,
    updated_at = now()
where collection_key = 'logs'
  and payload <> '[]'::jsonb;
