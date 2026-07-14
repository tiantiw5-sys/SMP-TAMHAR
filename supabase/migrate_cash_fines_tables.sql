-- Migrasi: pecah kas OSIS (cash) dan denda siswa (fines) dari blob JSONB
-- tunggal (portal_collections) jadi tabel normal 1-baris-per-transaksi, pola
-- persis sama seperti migrate_student_attendance_table.sql dan
-- migrate_activity_logs_table.sql.
--
-- KENAPA: sama seperti logs — append_to_collection/update_collection_item/
-- delete_collection_item memang atomik (tidak saling menimpa antar sesi),
-- tapi Supabase Realtime tetap broadcast SELURUH baris (= seluruh riwayat
-- transaksi kas/denda) tiap kali ada 1 transaksi ditambah/diedit/dihapus.
-- Volume kas/fines jauh lebih kecil dari logs, tapi pola & risikonya identik.
--
-- CATATAN field 'date': tanggal disimpan client sebagai
-- `new Date().toLocaleDateString('id-ID')` (contoh: "14/7/2026"), BUKAN
-- format ISO — disimpan apa adanya sebagai teks (txn_date), tidak dipaksa
-- jadi kolom `date` SQL supaya tidak ada risiko salah parse format lokal.
--
-- Aman dijalankan berulang (idempotent). Ditulis 2026-07-14.

-- ============================== CASH ==============================

create table if not exists public.cash_transactions (
  id text primary key,
  type text not null check (type in ('Masuk', 'Keluar')),
  amount numeric not null,
  description text not null,
  category text not null check (category in ('Iuran Bulanan', 'Konsumsi', 'Dokumentasi', 'Sponsorship', 'Lain-lain')),
  txn_date text not null,
  author text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cash_transactions_created_at_idx
  on public.cash_transactions (created_at desc);

alter table public.cash_transactions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'cash_transactions'
  ) then
    alter publication supabase_realtime add table public.cash_transactions;
  end if;
end $$;

-- RLS: sama persis dengan aturan collection_key='cash' yang lama.
drop policy if exists "cash_transactions_select" on public.cash_transactions;
create policy "cash_transactions_select"
  on public.cash_transactions for select
  to authenticated
  using (public.current_role_name() in ('Super Admin', 'Managerial OSIS', 'Managerial Sekolah'));

drop policy if exists "cash_transactions_insert" on public.cash_transactions;
create policy "cash_transactions_insert"
  on public.cash_transactions for insert
  to authenticated
  with check (public.current_role_name() in ('Super Admin', 'Managerial OSIS', 'Managerial Sekolah'));

drop policy if exists "cash_transactions_update" on public.cash_transactions;
create policy "cash_transactions_update"
  on public.cash_transactions for update
  to authenticated
  using (public.current_role_name() in ('Super Admin', 'Managerial OSIS', 'Managerial Sekolah'))
  with check (public.current_role_name() in ('Super Admin', 'Managerial OSIS', 'Managerial Sekolah'));

drop policy if exists "cash_transactions_delete" on public.cash_transactions;
create policy "cash_transactions_delete"
  on public.cash_transactions for delete
  to authenticated
  using (public.current_role_name() in ('Super Admin', 'Managerial OSIS', 'Managerial Sekolah'));

-- Satu fungsi untuk tambah BARU maupun edit (ON CONFLICT by id) — mengganti
-- appendToCollection('cash', ...) + updateCollectionItem('cash', id, ...).
create or replace function public.upsert_cash_transaction(p_item jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
  result public.cash_transactions;
begin
  select role into caller_role from public.profiles where id = auth.uid();
  if caller_role is null or caller_role not in ('Super Admin', 'Managerial OSIS', 'Managerial Sekolah') then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  insert into public.cash_transactions (id, type, amount, description, category, txn_date, author)
  values (
    p_item->>'id',
    p_item->>'type',
    (p_item->>'amount')::numeric,
    p_item->>'description',
    p_item->>'category',
    p_item->>'date',
    p_item->>'author'
  )
  on conflict (id) do update set
    type = excluded.type,
    amount = excluded.amount,
    description = excluded.description,
    category = excluded.category,
    txn_date = excluded.txn_date,
    author = excluded.author,
    updated_at = now()
  returning * into result;

  return jsonb_build_object(
    'id', result.id,
    'type', result.type,
    'amount', result.amount,
    'description', result.description,
    'category', result.category,
    'date', result.txn_date,
    'author', result.author
  );
end;
$$;

revoke all on function public.upsert_cash_transaction(jsonb) from public, anon;
grant execute on function public.upsert_cash_transaction(jsonb) to authenticated;

-- Mengganti deleteCollectionItem('cash', id).
create or replace function public.delete_cash_transaction(p_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
begin
  select role into caller_role from public.profiles where id = auth.uid();
  if caller_role is null or caller_role not in ('Super Admin', 'Managerial OSIS', 'Managerial Sekolah') then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  delete from public.cash_transactions where id = p_id;
end;
$$;

revoke all on function public.delete_cash_transaction(text) from public, anon;
grant execute on function public.delete_cash_transaction(text) to authenticated;

-- Backfill. Data lama tidak punya timestamp presisi (cuma tanggal lokal
-- string) — urutan asli (array sudah "terbaru duluan" karena item baru
-- selalu disisipkan di depan) direkonstruksi dengan menggeser created_at
-- mundur 1 detik per posisi array, supaya urutan tampilan tetap sama persis
-- tanpa perlu menebak-nebak parsing "14/7/2026".
insert into public.cash_transactions (id, type, amount, description, category, txn_date, author, created_at, updated_at)
select
  elem->>'id',
  elem->>'type',
  coalesce((elem->>'amount')::numeric, 0),
  elem->>'description',
  elem->>'category',
  elem->>'date',
  elem->>'author',
  now() - (p.ord - 1) * interval '1 second',
  now() - (p.ord - 1) * interval '1 second'
from public.portal_collections pc,
     jsonb_array_elements(pc.payload) with ordinality as p(elem, ord)
where pc.collection_key = 'cash'
  and elem->>'id' is not null
on conflict (id) do nothing;

update public.portal_collections
set payload = '[]'::jsonb,
    updated_at = now()
where collection_key = 'cash'
  and payload <> '[]'::jsonb;

-- ============================== FINES ==============================

create table if not exists public.fine_transactions (
  id text primary key,
  type text not null check (type in ('Masuk', 'Keluar')),
  amount numeric not null,
  description text not null,
  violator text,
  category text not null check (category in ('Keterlambatan', 'Atribut Tidak Lengkap', 'Kebersihan', 'Pengeluaran Kegiatan', 'Lain-lain')),
  txn_date text not null,
  author text not null,
  status text not null check (status in ('Belum Lunas', 'Lunas')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fine_transactions_created_at_idx
  on public.fine_transactions (created_at desc);

alter table public.fine_transactions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'fine_transactions'
  ) then
    alter publication supabase_realtime add table public.fine_transactions;
  end if;
end $$;

drop policy if exists "fine_transactions_select" on public.fine_transactions;
create policy "fine_transactions_select"
  on public.fine_transactions for select
  to authenticated
  using (public.current_role_name() in ('Super Admin', 'Managerial OSIS', 'Managerial Sekolah'));

drop policy if exists "fine_transactions_insert" on public.fine_transactions;
create policy "fine_transactions_insert"
  on public.fine_transactions for insert
  to authenticated
  with check (public.current_role_name() in ('Super Admin', 'Managerial OSIS', 'Managerial Sekolah'));

drop policy if exists "fine_transactions_update" on public.fine_transactions;
create policy "fine_transactions_update"
  on public.fine_transactions for update
  to authenticated
  using (public.current_role_name() in ('Super Admin', 'Managerial OSIS', 'Managerial Sekolah'))
  with check (public.current_role_name() in ('Super Admin', 'Managerial OSIS', 'Managerial Sekolah'));

drop policy if exists "fine_transactions_delete" on public.fine_transactions;
create policy "fine_transactions_delete"
  on public.fine_transactions for delete
  to authenticated
  using (public.current_role_name() in ('Super Admin', 'Managerial OSIS', 'Managerial Sekolah'));

-- Dipakai juga untuk handleToggleFinePaid (cuma ganti field status).
create or replace function public.upsert_fine_transaction(p_item jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
  result public.fine_transactions;
begin
  select role into caller_role from public.profiles where id = auth.uid();
  if caller_role is null or caller_role not in ('Super Admin', 'Managerial OSIS', 'Managerial Sekolah') then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  insert into public.fine_transactions (id, type, amount, description, violator, category, txn_date, author, status)
  values (
    p_item->>'id',
    p_item->>'type',
    (p_item->>'amount')::numeric,
    p_item->>'description',
    nullif(p_item->>'violator', ''),
    p_item->>'category',
    p_item->>'date',
    p_item->>'author',
    p_item->>'status'
  )
  on conflict (id) do update set
    type = excluded.type,
    amount = excluded.amount,
    description = excluded.description,
    violator = excluded.violator,
    category = excluded.category,
    txn_date = excluded.txn_date,
    author = excluded.author,
    status = excluded.status,
    updated_at = now()
  returning * into result;

  return jsonb_build_object(
    'id', result.id,
    'type', result.type,
    'amount', result.amount,
    'description', result.description,
    'violator', result.violator,
    'category', result.category,
    'date', result.txn_date,
    'author', result.author,
    'status', result.status
  );
end;
$$;

revoke all on function public.upsert_fine_transaction(jsonb) from public, anon;
grant execute on function public.upsert_fine_transaction(jsonb) to authenticated;

create or replace function public.delete_fine_transaction(p_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
begin
  select role into caller_role from public.profiles where id = auth.uid();
  if caller_role is null or caller_role not in ('Super Admin', 'Managerial OSIS', 'Managerial Sekolah') then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  delete from public.fine_transactions where id = p_id;
end;
$$;

revoke all on function public.delete_fine_transaction(text) from public, anon;
grant execute on function public.delete_fine_transaction(text) to authenticated;

-- Backfill — juga bersihkan tag lama "[LUNAS]"/"[BELUM LUNAS]" yang dulu
-- disisipkan ke teks deskripsi sebelum kolom `status` ada (lihat
-- normalizeFineTransaction di src/lib/portalDb.ts); kolom status di sini
-- selalu jadi sumber kebenaran, jadi cukup bersihkan teksnya saja.
insert into public.fine_transactions (id, type, amount, description, violator, category, txn_date, author, status, created_at, updated_at)
select
  elem->>'id',
  elem->>'type',
  coalesce((elem->>'amount')::numeric, 0),
  trim(regexp_replace(coalesce(elem->>'description', ''), '\s*\[(BELUM LUNAS|LUNAS)\]', '', 'gi')),
  nullif(elem->>'violator', ''),
  elem->>'category',
  elem->>'date',
  elem->>'author',
  case
    when elem->>'status' in ('Lunas', 'Belum Lunas') then elem->>'status'
    when (elem->>'description') ~* '\[BELUM LUNAS\]' then 'Belum Lunas'
    when (elem->>'description') ~* '\[LUNAS\]' then 'Lunas'
    else 'Belum Lunas'
  end,
  now() - (p.ord - 1) * interval '1 second',
  now() - (p.ord - 1) * interval '1 second'
from public.portal_collections pc,
     jsonb_array_elements(pc.payload) with ordinality as p(elem, ord)
where pc.collection_key = 'fines'
  and elem->>'id' is not null
on conflict (id) do nothing;

update public.portal_collections
set payload = '[]'::jsonb,
    updated_at = now()
where collection_key = 'fines'
  and payload <> '[]'::jsonb;
