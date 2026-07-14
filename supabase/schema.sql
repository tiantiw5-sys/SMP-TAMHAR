-- Portal SMP Taman Harapan Bekasi — skema Supabase
-- Jalankan sekali di SQL Editor (aman dijalankan berulang, semua statement idempotent).

create table if not exists public.portal_collections (
  collection_key text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists portal_collections_updated_at_idx
  on public.portal_collections (updated_at desc);

alter table public.portal_collections enable row level security;

-- Aktifkan Supabase Realtime (Postgres Changes) untuk tabel ini — supaya
-- kalau satu akun menambah/mengubah/menghapus data (kas, denda, artikel,
-- absensi, dst), SEMUA sesi/tab lain yang sedang login langsung ikut update
-- otomatis tanpa perlu refresh manual. Aman dijalankan berulang — cuma
-- ditambahkan kalau memang belum terdaftar.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'portal_collections'
  ) then
    alter publication supabase_realtime add table public.portal_collections;
  end if;
end $$;

-- Profil pengguna ERP — sumber kebenaran nama & peran (role), terhubung ke
-- akun asli Supabase Auth (auth.users). Login sekarang divalidasi oleh
-- Supabase Auth sendiri, bukan lagi hash password custom di browser.
-- email disalin dari auth.users (bukan dibaca langsung) karena tabel
-- auth.users tidak bisa diquery klien biasa — profiles inilah yang dipakai
-- tab "Pengguna & Hak Akses" untuk menampilkan ID login tiap orang.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  name text not null default '',
  role text not null default 'Normal User',
  status text not null default 'Active',
  must_change_password boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Begitu Super Admin bikin akun baru lewat Supabase Dashboard
-- (Authentication → Add User), baris profil kosong otomatis dibuat di sini
-- supaya langsung muncul di tab "Pengguna & Hak Akses" untuk diisi nama/role-nya.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, role, status)
  values (new.id, new.email, split_part(new.email, '@', 1), 'Normal User', 'Active')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- Dipakai RLS untuk baca peran (role) user yang sedang login tanpa
-- menyebabkan rekursi kebijakan pada tabel profiles itu sendiri.
create or replace function public.current_role_name()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

-- Aksi self-service satu-satunya yang boleh dilakukan user biasa ke baris
-- profilnya sendiri: mematikan tanda "wajib ganti password" setelah mereka
-- benar-benar menggantinya. Nama/role tetap hanya bisa diubah Super Admin.
create or replace function public.clear_must_change_password()
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles set must_change_password = false, updated_at = now() where id = auth.uid();
$$;

revoke all on function public.clear_must_change_password() from public, anon;
grant execute on function public.clear_must_change_password() to authenticated;

drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "profiles_update_super_admin" on public.profiles;
create policy "profiles_update_super_admin"
  on public.profiles for update
  to authenticated
  using (public.current_role_name() = 'Super Admin')
  with check (public.current_role_name() = 'Super Admin');

-- portal_collections: konten publik sekolah (artikel/galeri/guru/dsb) tetap
-- bisa dibaca siapa saja tanpa login. Tapi MENULIS sekarang wajib login
-- (authenticated) — sebelumnya anon key bisa insert/update bebas, itu celah
-- yang memungkinkan siapa pun yang tahu anon key (publik, ikut ter-bundle ke
-- JS) mengubah/menghapus data tanpa pernah login. Kas, denda, dan log
-- aktivitas ekstra dibatasi hanya untuk role manajerial.
drop policy if exists "portal_collections_anon_select" on public.portal_collections;
drop policy if exists "portal_collections_anon_insert" on public.portal_collections;
drop policy if exists "portal_collections_anon_update" on public.portal_collections;
drop policy if exists "portal_collections_public_select" on public.portal_collections;
drop policy if exists "portal_collections_staff_select" on public.portal_collections;
drop policy if exists "portal_collections_authenticated_write" on public.portal_collections;
drop policy if exists "portal_collections_authenticated_update" on public.portal_collections;
drop policy if exists "portal_collections_visits_anon_write" on public.portal_collections;
drop policy if exists "portal_collections_visits_anon_update" on public.portal_collections;

-- Anon hanya baca konten landing page (bukan siswa/kas/denda/log)
create policy "portal_collections_public_select"
  on public.portal_collections for select
  to anon
  using (collection_key in ('articles', 'gallery', 'teachers', 'uniforms', 'settings', 'visits', 'classRoster'));

-- Staf terautentikasi: publik + koleksi sesuai role.
-- 'students'/'studentAttendance' sengaja dibuka BACA untuk SEMUA role yang
-- login (bukan cuma Super Admin/Managerial Sekolah/Guru Piket) — supaya
-- panel "Kehadiran Murid per Kelas" di tab Ringkasan kelihatan untuk semua
-- akun. Ini CUMA soal baca (select) — nambah/ubah/hapus data absensi murid
-- tetap dikunci ketat lewat RPC (append_to_collection dkk, lihat di bawah),
-- yang masih memeriksa role Super Admin/Managerial Sekolah/Guru Piket saja.
create policy "portal_collections_staff_select"
  on public.portal_collections for select
  to authenticated
  using (
    collection_key in (
      'articles', 'gallery', 'teachers', 'uniforms', 'settings', 'visits',
      'students', 'studentAttendance', 'classRoster', 'teachingSchedule'
    )
    or (
      collection_key in ('cash', 'fines', 'logs')
      and public.current_role_name() in ('Super Admin', 'Managerial OSIS', 'Managerial Sekolah')
    )
    or (
      collection_key in ('attendance', 'teacherAttendanceLog')
      and public.current_role_name() in ('Super Admin', 'Managerial Sekolah', 'Guru Piket', 'Guru')
    )
    or (
      collection_key in ('notifications', 'annotations')
      and public.current_role_name() in ('Super Admin', 'Managerial OSIS', 'Managerial Sekolah', 'Guru Piket', 'Guru')
    )
  );

create policy "portal_collections_authenticated_write"
  on public.portal_collections for insert
  to authenticated
  with check (
    (
      collection_key in ('students', 'studentAttendance')
      and public.current_role_name() in ('Super Admin', 'Managerial Sekolah', 'Guru Piket')
    )
    or (
      collection_key in ('cash', 'fines', 'logs')
      and public.current_role_name() in ('Super Admin', 'Managerial OSIS', 'Managerial Sekolah')
    )
    or (
      collection_key in ('attendance', 'teacherAttendanceLog')
      and public.current_role_name() in ('Super Admin', 'Managerial Sekolah', 'Guru Piket', 'Guru')
    )
    or (
      collection_key in ('articles', 'gallery', 'teachers', 'uniforms', 'notifications', 'annotations', 'classRoster', 'teachingSchedule')
      and public.current_role_name() in ('Super Admin', 'Managerial OSIS', 'Managerial Sekolah', 'Guru Piket', 'Guru')
    )
    or (collection_key = 'settings' and public.current_role_name() = 'Super Admin')
    or (collection_key = 'visits')
  );

create policy "portal_collections_authenticated_update"
  on public.portal_collections for update
  to authenticated
  using (
    (
      collection_key in ('students', 'studentAttendance')
      and public.current_role_name() in ('Super Admin', 'Managerial Sekolah', 'Guru Piket')
    )
    or (
      collection_key in ('cash', 'fines', 'logs')
      and public.current_role_name() in ('Super Admin', 'Managerial OSIS', 'Managerial Sekolah')
    )
    or (
      collection_key in ('attendance', 'teacherAttendanceLog')
      and public.current_role_name() in ('Super Admin', 'Managerial Sekolah', 'Guru Piket', 'Guru')
    )
    or (
      collection_key in ('articles', 'gallery', 'teachers', 'uniforms', 'notifications', 'annotations', 'classRoster', 'teachingSchedule')
      and public.current_role_name() in ('Super Admin', 'Managerial OSIS', 'Managerial Sekolah', 'Guru Piket', 'Guru')
    )
    or (collection_key = 'settings' and public.current_role_name() = 'Super Admin')
    or (collection_key = 'visits')
  )
  with check (
    (
      collection_key in ('students', 'studentAttendance')
      and public.current_role_name() in ('Super Admin', 'Managerial Sekolah', 'Guru Piket')
    )
    or (
      collection_key in ('cash', 'fines', 'logs')
      and public.current_role_name() in ('Super Admin', 'Managerial OSIS', 'Managerial Sekolah')
    )
    or (
      collection_key in ('attendance', 'teacherAttendanceLog')
      and public.current_role_name() in ('Super Admin', 'Managerial Sekolah', 'Guru Piket', 'Guru')
    )
    or (
      collection_key in ('articles', 'gallery', 'teachers', 'uniforms', 'notifications', 'annotations', 'classRoster', 'teachingSchedule')
      and public.current_role_name() in ('Super Admin', 'Managerial OSIS', 'Managerial Sekolah', 'Guru Piket', 'Guru')
    )
    or (collection_key = 'settings' and public.current_role_name() = 'Super Admin')
    or (collection_key = 'visits')
  );

-- Counter kunjungan landing page (tanpa login)
create policy "portal_collections_visits_anon_write"
  on public.portal_collections for insert
  to anon
  with check (collection_key = 'visits');

create policy "portal_collections_visits_anon_update"
  on public.portal_collections for update
  to anon
  using (collection_key = 'visits')
  with check (collection_key = 'visits');

-- Catatan: collection_key = 'users' di portal_collections sudah pensiun
-- (digantikan tabel profiles + auth.users di atas). Baris lamanya boleh
-- dibiarkan saja, sudah tidak dipakai kode aplikasi.

-- Menambah SATU item ke sebuah koleksi (artikel/galeri/kas/denda) secara
-- atomik di database — bukan browser mengirim ulang seluruh daftar. Ini
-- menutup celah nyata yang pernah terjadi: dua orang login bersamaan lalu
-- sama-sama menambah data, dan yang menyimpan belakangan (dengan salinan
-- daftar yang sudah usang di memori browser-nya) menimpa tambahan orang
-- lain. Karena UPDATE ini dieksekusi Postgres sendiri, dua permintaan yang
-- datang nyaris bersamaan otomatis diantre & tidak saling menimpa.
create or replace function public.append_to_collection(p_key text, p_item jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
  caller_role text;
begin
  select role into caller_role from public.profiles where id = auth.uid();
  if p_key in ('cash', 'fines', 'logs') then
    if caller_role is null or caller_role not in ('Super Admin', 'Managerial OSIS', 'Managerial Sekolah') then
      raise exception 'insufficient_privilege' using errcode = '42501';
    end if;
  elsif p_key in ('students', 'studentAttendance') then
    if caller_role is null or caller_role not in ('Super Admin', 'Managerial Sekolah', 'Guru Piket') then
      raise exception 'insufficient_privilege' using errcode = '42501';
    end if;
  elsif p_key = 'attendance' then
    if caller_role is null or caller_role not in ('Super Admin', 'Managerial Sekolah', 'Guru Piket', 'Guru') then
      raise exception 'insufficient_privilege' using errcode = '42501';
    end if;
  elsif p_key = 'settings' then
    if caller_role is null or caller_role <> 'Super Admin' then
      raise exception 'insufficient_privilege' using errcode = '42501';
    end if;
  elsif p_key in ('articles', 'gallery', 'teachers', 'uniforms', 'notifications', 'annotations') then
    if caller_role is null or caller_role not in ('Super Admin', 'Managerial OSIS', 'Managerial Sekolah', 'Guru Piket', 'Guru') then
      raise exception 'insufficient_privilege' using errcode = '42501';
    end if;
  end if;

  -- Item baru diletakkan di depan (bukan belakang) supaya urutan tetap
  -- "terbaru duluan", konsisten dengan cara aplikasi menampilkan daftar.
  update public.portal_collections
  set payload = jsonb_build_array(p_item) || coalesce(payload, '[]'::jsonb),
      updated_at = now()
  where collection_key = p_key
  returning payload into result;

  if result is null then
    insert into public.portal_collections (collection_key, payload)
    values (p_key, jsonb_build_array(p_item))
    returning payload into result;
  end if;

  return result;
end;
$$;

-- Supabase otomatis kasih akses "anon" ke fungsi baru terlepas dari revoke
-- ke PUBLIC (anon bukan bagian dari PUBLIC dalam hal hak akses Postgres) —
-- makanya di sini direvoke eksplisit dari anon juga, bukan cuma public.
revoke all on function public.append_to_collection(text, jsonb) from public, anon;
grant execute on function public.append_to_collection(text, jsonb) to authenticated;

-- Mengubah SATU item yang sudah ada (dicari lewat field id) secara atomik —
-- dua orang mengedit dua item yang berbeda di koleksi yang sama pada waktu
-- nyaris bersamaan tidak akan saling menimpa, karena masing-masing hanya
-- menyentuh posisi item miliknya sendiri di dalam array, bukan mengganti
-- seluruh array dari salinan yang mungkin sudah usang.
create or replace function public.update_collection_item(p_key text, p_item_id text, p_item jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
  caller_role text;
  target_idx int;
begin
  select role into caller_role from public.profiles where id = auth.uid();
  if p_key in ('cash', 'fines', 'logs') then
    if caller_role is null or caller_role not in ('Super Admin', 'Managerial OSIS', 'Managerial Sekolah') then
      raise exception 'insufficient_privilege' using errcode = '42501';
    end if;
  elsif p_key in ('students', 'studentAttendance') then
    if caller_role is null or caller_role not in ('Super Admin', 'Managerial Sekolah', 'Guru Piket') then
      raise exception 'insufficient_privilege' using errcode = '42501';
    end if;
  elsif p_key = 'attendance' then
    if caller_role is null or caller_role not in ('Super Admin', 'Managerial Sekolah', 'Guru Piket', 'Guru') then
      raise exception 'insufficient_privilege' using errcode = '42501';
    end if;
  elsif p_key = 'settings' then
    if caller_role is null or caller_role <> 'Super Admin' then
      raise exception 'insufficient_privilege' using errcode = '42501';
    end if;
  elsif p_key in ('articles', 'gallery', 'teachers', 'uniforms', 'notifications', 'annotations') then
    if caller_role is null or caller_role not in ('Super Admin', 'Managerial OSIS', 'Managerial Sekolah', 'Guru Piket', 'Guru') then
      raise exception 'insufficient_privilege' using errcode = '42501';
    end if;
  end if;

  select (p.ord - 1) into target_idx
  from public.portal_collections pc,
       jsonb_array_elements(pc.payload) with ordinality as p(elem, ord)
  where pc.collection_key = p_key and p.elem->>'id' = p_item_id
  limit 1;

  if target_idx is null then
    raise exception 'item_not_found' using errcode = 'P0002';
  end if;

  update public.portal_collections
  set payload = jsonb_set(payload, array[target_idx::text], p_item, false),
      updated_at = now()
  where collection_key = p_key
  returning payload into result;

  return result;
end;
$$;

revoke all on function public.update_collection_item(text, text, jsonb) from public, anon;
grant execute on function public.update_collection_item(text, text, jsonb) to authenticated;

-- Menghapus SATU item (dicari lewat field id) secara atomik — sama seperti
-- di atas, tidak mengganti seluruh array dari salinan yang mungkin usang.
create or replace function public.delete_collection_item(p_key text, p_item_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
  caller_role text;
begin
  select role into caller_role from public.profiles where id = auth.uid();
  if p_key in ('cash', 'fines', 'logs') then
    if caller_role is null or caller_role not in ('Super Admin', 'Managerial OSIS', 'Managerial Sekolah') then
      raise exception 'insufficient_privilege' using errcode = '42501';
    end if;
  elsif p_key in ('students', 'studentAttendance') then
    if caller_role is null or caller_role not in ('Super Admin', 'Managerial Sekolah', 'Guru Piket') then
      raise exception 'insufficient_privilege' using errcode = '42501';
    end if;
  elsif p_key = 'attendance' then
    if caller_role is null or caller_role not in ('Super Admin', 'Managerial Sekolah', 'Guru Piket', 'Guru') then
      raise exception 'insufficient_privilege' using errcode = '42501';
    end if;
  elsif p_key = 'settings' then
    if caller_role is null or caller_role <> 'Super Admin' then
      raise exception 'insufficient_privilege' using errcode = '42501';
    end if;
  elsif p_key in ('articles', 'gallery', 'teachers', 'uniforms', 'notifications', 'annotations') then
    if caller_role is null or caller_role not in ('Super Admin', 'Managerial OSIS', 'Managerial Sekolah', 'Guru Piket', 'Guru') then
      raise exception 'insufficient_privilege' using errcode = '42501';
    end if;
  end if;

  update public.portal_collections
  set payload = (
        select coalesce(jsonb_agg(elem), '[]'::jsonb)
        from jsonb_array_elements(payload) elem
        where elem->>'id' is distinct from p_item_id
      ),
      updated_at = now()
  where collection_key = p_key
  returning payload into result;

  return result;
end;
$$;

revoke all on function public.delete_collection_item(text, text) from public, anon;
grant execute on function public.delete_collection_item(text, text) to authenticated;

-- Migrasi data satu kali: kolom 'uniforms' sebelumnya disimpan sebagai objek
-- {version, items:[...]} (format lama dari mode full-replace), sedangkan
-- append_to_collection/update_collection_item/delete_collection_item di atas
-- mengasumsikan payload berupa jsonb ARRAY polos. Kalau dibiarkan berformat
-- objek, sekali Super Admin klik "Tambah/Edit/Hapus Seragam" datanya akan
-- rusak jadi array 2 elemen berisi [item_baru, objek_lama_utuh]. Statement
-- ini aman dijalankan berulang — cuma jalan kalau payload masih berbentuk
-- objek dengan key 'items'.
update public.portal_collections
set payload = payload -> 'items'
where collection_key = 'uniforms'
  and jsonb_typeof(payload) = 'object'
  and payload ? 'items';

-- Ubah kolom profiles.role dari teks bebas jadi ENUM (daftar pilihan tetap) —
-- supaya di Supabase Studio → Table Editor, kolom "role" muncul sebagai
-- DROPDOWN (klik, pilih dari daftar), bukan kotak teks yang harus diketik
-- persis (rawan typo/salah huruf besar-kecil, yang bikin RLS diam-diam gagal
-- mencocokkan karena perbandingannya case-sensitive).
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum (
      'Super Admin',
      'Managerial OSIS',
      'Managerial Sekolah',
      'Guru Piket',
      'Guru',
      'Normal User'
    );
  end if;
end $$;

alter table public.profiles alter column role drop default;
alter table public.profiles
  alter column role type public.user_role using role::public.user_role;
alter table public.profiles alter column role set default 'Normal User';

-- Nambah ATAU menimpa satu item (dicari lewat field id) dalam satu langkah
-- atomik — dipakai khusus untuk absensi murid, supaya kalau kartu yang sama
-- ke-scan dua kali hampir bersamaan (dobel pencet, atau 2 kiosk gerbang scan
-- murid yang sama nyaris bareng), keputusan "ini sudah ada, timpa" atau "ini
-- baru, tambahkan" diputuskan oleh DATABASE (dalam satu transaksi), bukan
-- ditebak duluan oleh HP/laptop sebelum kirim ke server. Menghindari celah
-- dua baris kembar untuk murid+tanggal yang sama akibat race condition.
create or replace function public.upsert_item_by_id(p_key text, p_item jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
  caller_role text;
  target_idx int;
  item_id text := p_item->>'id';
begin
  select role into caller_role from public.profiles where id = auth.uid();
  if p_key in ('cash', 'fines', 'logs') then
    if caller_role is null or caller_role not in ('Super Admin', 'Managerial OSIS', 'Managerial Sekolah') then
      raise exception 'insufficient_privilege' using errcode = '42501';
    end if;
  elsif p_key in ('students', 'studentAttendance') then
    if caller_role is null or caller_role not in ('Super Admin', 'Managerial Sekolah', 'Guru Piket') then
      raise exception 'insufficient_privilege' using errcode = '42501';
    end if;
  elsif p_key = 'attendance' then
    if caller_role is null or caller_role not in ('Super Admin', 'Managerial Sekolah', 'Guru Piket', 'Guru') then
      raise exception 'insufficient_privilege' using errcode = '42501';
    end if;
  elsif p_key = 'settings' then
    if caller_role is null or caller_role <> 'Super Admin' then
      raise exception 'insufficient_privilege' using errcode = '42501';
    end if;
  elsif p_key in ('articles', 'gallery', 'teachers', 'uniforms', 'notifications', 'annotations') then
    if caller_role is null or caller_role not in ('Super Admin', 'Managerial OSIS', 'Managerial Sekolah', 'Guru Piket', 'Guru') then
      raise exception 'insufficient_privilege' using errcode = '42501';
    end if;
  end if;

  select (p.ord - 1) into target_idx
  from public.portal_collections pc,
       jsonb_array_elements(pc.payload) with ordinality as p(elem, ord)
  where pc.collection_key = p_key and p.elem->>'id' = item_id
  limit 1;

  if target_idx is not null then
    update public.portal_collections
    set payload = jsonb_set(payload, array[target_idx::text], p_item, false),
        updated_at = now()
    where collection_key = p_key
    returning payload into result;
  else
    update public.portal_collections
    set payload = jsonb_build_array(p_item) || coalesce(payload, '[]'::jsonb),
        updated_at = now()
    where collection_key = p_key
    returning payload into result;

    if result is null then
      insert into public.portal_collections (collection_key, payload)
      values (p_key, jsonb_build_array(p_item))
      returning payload into result;
    end if;
  end if;

  return result;
end;
$$;

revoke all on function public.upsert_item_by_id(text, jsonb) from public, anon;
grant execute on function public.upsert_item_by_id(text, jsonb) to authenticated;

-- Naikkan counter kunjungan HARI INI secara atomik di server (bukan baca
-- lalu tulis balik dari browser, yang rawan kehilangan hitungan kalau
-- banyak pengunjung landing page hampir bersamaan). Payload 'visits'
-- sekarang berupa objek { "YYYY-MM-DD": jumlah, ... } — satu angka per hari
-- — dipakai untuk tab "Rekap Kunjungan". Anon TETAP boleh panggil ini
-- (landing page dilihat tanpa login), tapi cuma untuk menaikkan angka,
-- tidak bisa baca/ubah data lain.
create or replace function public.increment_daily_visit()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
  -- now() Postgres/Supabase defaultnya UTC — kalau dipakai apa adanya,
  -- pergantian "hari" jatuh jam 07:00 WIB (bukan tengah malam), jadi
  -- kunjungan dini hari WIB salah tercatat masuk ke tanggal KEMARIN.
  -- Dikonversi eksplisit ke Asia/Jakarta supaya pergantian harinya sesuai
  -- waktu sekolah yang sebenarnya.
  today text := to_char(now() at time zone 'Asia/Jakarta', 'YYYY-MM-DD');
begin
  update public.portal_collections
  set payload = jsonb_set(
        case when jsonb_typeof(payload) = 'object' then payload else '{}'::jsonb end,
        array[today],
        to_jsonb(coalesce((payload->>today)::int, 0) + 1),
        true
      ),
      updated_at = now()
  where collection_key = 'visits'
  returning payload into result;

  if result is null then
    insert into public.portal_collections (collection_key, payload)
    values ('visits', jsonb_build_object(today, 1))
    returning payload into result;
  end if;

  return result;
end;
$$;

revoke all on function public.increment_daily_visit() from public, anon;
grant execute on function public.increment_daily_visit() to anon, authenticated;

-- Migrasi data satu kali: kolom 'visits' sebelumnya disimpan sebagai
-- {count: N} (total tunggal). Diubah jadi objek {tanggal: jumlah} supaya bisa
-- direkap per hari. Total lama dipindah jadi angka hari migrasi dijalankan,
-- supaya tidak hilang. Aman dijalankan berulang — cuma jalan kalau payload
-- masih berformat lama.
do $$
declare
  old_count int;
  today text := to_char(now() at time zone 'Asia/Jakarta', 'YYYY-MM-DD');
begin
  select (payload->>'count')::int into old_count
  from public.portal_collections
  where collection_key = 'visits' and payload ? 'count';

  if old_count is not null then
    update public.portal_collections
    set payload = jsonb_build_object(today, old_count),
        updated_at = now()
    where collection_key = 'visits';
  end if;
end $$;

-- Perbaikan satu kali: baris 'cash' dan 'fines' sempat hilang TOTAL dari
-- tabel (bukan cuma array kosong), sehingga sempat kena jalur "isi ulang
-- otomatis kalau data hilang" tiap kali dimuat — makanya data contoh terus
-- muncul lagi walau sudah dihapus manual. Statement ini HANYA membuat baris
-- kosong kalau barisnya memang belum ada ("do nothing" kalau sudah ada) —
-- aman dijalankan berulang kapan pun, TIDAK akan menghapus data asli yang
-- sudah diisi nanti.
insert into public.portal_collections (collection_key, payload)
values ('cash', '[]'::jsonb), ('fines', '[]'::jsonb)
on conflict (collection_key) do nothing;

-- Perbaikan data satu kali: website & instagram resmi di Pengaturan Portal
-- masih data lama/salah. '||' cuma menimpa 2 field ini, field lain (phone,
-- whatsapp, facebook, address, dst) tetap seperti apa adanya. Aman dijalankan
-- berulang.
update public.portal_collections
set payload = payload || jsonb_build_object(
      'website', 'https://online.tamhar.sch.id/',
      'instagram', 'https://www.instagram.com/smp_tamanharapan1/?hl=en'
    ),
    updated_at = now()
where collection_key = 'settings';

-- ============================================================
-- PORTAL ORANG TUA — role baru untuk orang tua murid, akses HANYA ke
-- data anaknya sendiri (lihat PRD-PORTAL-ORANG-TUA.md di root project).
-- ============================================================

-- Role baru. Statement ini sengaja berdiri sendiri (tidak dipakai di
-- transaksi yang sama) karena Postgres melarang ADD VALUE enum dipakai
-- dalam transaksi yang sama saat ditambahkan.
alter type public.user_role add value if not exists 'Orang Tua';

-- Penghubung akun orang tua -> 1 anak (id di koleksi 'students').
-- 1 akun = 1 anak by design — kakak-adik satu sekolah dapat akun terpisah,
-- bukan satu akun pilih-anak (keputusan produk, lihat PRD §9).
alter table public.profiles add column if not exists linked_student_id text;

-- Dipakai RPC di bawah untuk tahu anak siapa yang boleh dilihat akun yang
-- login, tanpa rekursi kebijakan RLS pada tabel profiles sendiri (pola
-- sama seperti current_role_name() di atas).
create or replace function public.current_linked_student_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select linked_student_id from public.profiles where id = auth.uid()
$$;

-- Data 1 anak milik akun Orang Tua yang login — disaring DI SERVER, bukan
-- di browser, supaya satu akun orang tua tidak pernah bisa menarik data
-- murid lain lewat DevTools/network tab sekalipun.
create or replace function public.get_my_child()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select elem
  from public.portal_collections pc,
       jsonb_array_elements(pc.payload) as elem
  where pc.collection_key = 'students'
    and elem->>'id' = public.current_linked_student_id()
  limit 1
$$;

revoke all on function public.get_my_child() from public, anon;
grant execute on function public.get_my_child() to authenticated;

-- Riwayat absensi 1 anak milik akun Orang Tua yang login — sama, disaring
-- di server, bukan dikirim mentah lalu difilter di klien.
create or replace function public.get_my_child_attendance()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(elem), '[]'::jsonb)
  from public.portal_collections pc,
       jsonb_array_elements(pc.payload) as elem
  where pc.collection_key = 'studentAttendance'
    and elem->>'studentId' = public.current_linked_student_id()
$$;

revoke all on function public.get_my_child_attendance() from public, anon;
grant execute on function public.get_my_child_attendance() to authenticated;

-- PENTING — keluarkan 'Orang Tua' dari akses baca LANGSUNG ke koleksi
-- 'students'/'studentAttendance' yang sebelumnya dibuka untuk SEMUA staf
-- yang login. Tanpa baris ini, satu akun orang tua bisa baca data SELURUH
-- murid sekolah lewat koleksi mentahnya, bukan cuma anaknya sendiri —
-- makanya orang tua HARUS lewat get_my_child()/get_my_child_attendance()
-- di atas, bukan baca koleksi langsung.
drop policy if exists "portal_collections_staff_select" on public.portal_collections;
create policy "portal_collections_staff_select"
  on public.portal_collections for select
  to authenticated
  using (
    collection_key in (
      'articles', 'gallery', 'teachers', 'uniforms', 'settings', 'visits',
      'classRoster', 'teachingSchedule'
    )
    or (
      collection_key in ('students', 'studentAttendance')
      and public.current_role_name() <> 'Orang Tua'
    )
    or (
      collection_key in ('cash', 'fines', 'logs')
      and public.current_role_name() in ('Super Admin', 'Managerial OSIS', 'Managerial Sekolah')
    )
    or (
      collection_key in ('attendance', 'teacherAttendanceLog')
      and public.current_role_name() in ('Super Admin', 'Managerial Sekolah', 'Guru Piket', 'Guru')
    )
    or (
      collection_key in ('notifications', 'annotations')
      and public.current_role_name() in ('Super Admin', 'Managerial OSIS', 'Managerial Sekolah', 'Guru Piket', 'Guru')
    )
  );

-- PENTING — batasi tabel profiles juga: kebijakan lama membuka SELECT
-- seluruh baris profiles (semua nama/email/role) untuk SIAPA PUN yang
-- login, termasuk linked_student_id. Kalau dibiarkan, satu akun orang tua
-- bisa lihat daftar SEMUA orang tua lain + anak siapa terhubung ke siapa.
-- Staf tetap bisa lihat semua (dipakai tab Pengguna & Hak Akses); Orang
-- Tua cuma boleh lihat barisnya sendiri.
drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (
    public.current_role_name() <> 'Orang Tua'
    or id = auth.uid()
  );

-- ============================================================
-- PIN KEAMANAN EKSEKUSI — kode tambahan (terpisah dari password) yang
-- wajib dimasukkan sebelum aksi HAPUS MASSAL data krusial (mis. hapus
-- banyak murid/1 kelas penuh sekaligus). Tujuannya: walau akun manajerial
-- (Managerial Sekolah/Guru Piket, yang memang berhak hapus data murid)
-- kena bobol/disalahgunakan, pelaku tetap butuh PIN terpisah ini yang
-- cuma diketahui & diatur oleh Super Admin — bukan pengganti password,
-- lapisan TAMBAHAN.
-- ============================================================

-- Tabel privat — SENGAJA TIDAK ADA kebijakan SELECT/UPDATE untuk siapa pun
-- (bukan cuma anon/authenticated biasa) — cuma bisa disentuh lewat 2 fungsi
-- SECURITY DEFINER di bawah, supaya hash PIN-nya tidak pernah bisa ditarik
-- langsung lewat API oleh akun mana pun, termasuk Super Admin sekalipun.
create table if not exists public.app_security (
  id boolean primary key default true check (id),
  execution_pin_hash text,
  failed_attempts int not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);
insert into public.app_security (id) values (true) on conflict (id) do nothing;
alter table public.app_security enable row level security;

create extension if not exists pgcrypto;

-- Super Admin atur/ganti PIN (4-6 digit angka).
create or replace function public.set_execution_pin(p_pin text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if public.current_role_name() <> 'Super Admin' then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;
  if p_pin !~ '^[0-9]{4,6}$' then
    raise exception 'PIN harus 4-6 digit angka' using errcode = '22023';
  end if;

  update public.app_security
  set execution_pin_hash = crypt(p_pin, gen_salt('bf')),
      failed_attempts = 0,
      locked_until = null,
      updated_at = now()
  where id = true;
end;
$$;

revoke all on function public.set_execution_pin(text) from public, anon;
grant execute on function public.set_execution_pin(text) to authenticated;

-- Dipanggil sebelum eksekusi hapus massal — true kalau PIN cocok. Dikunci
-- otomatis 5 menit setelah 5 kali salah berturut-turut (percobaan tebak
-- PIN 4 digit dibatasi, bukan cuma mengandalkan panjang PIN-nya).
create or replace function public.verify_execution_pin(p_pin text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  rec record;
  ok boolean;
begin
  select * into rec from public.app_security where id = true;

  if rec.locked_until is not null and rec.locked_until > now() then
    raise exception 'Terlalu banyak percobaan salah — coba lagi setelah %', rec.locked_until using errcode = '42501';
  end if;

  if rec.execution_pin_hash is null then
    raise exception 'PIN keamanan belum diatur Super Admin.' using errcode = '22023';
  end if;

  ok := crypt(p_pin, rec.execution_pin_hash) = rec.execution_pin_hash;

  if ok then
    update public.app_security set failed_attempts = 0, locked_until = null, updated_at = now() where id = true;
  else
    update public.app_security
    set failed_attempts = failed_attempts + 1,
        locked_until = case when failed_attempts + 1 >= 5 then now() + interval '5 minutes' else locked_until end,
        updated_at = now()
    where id = true;
  end if;

  return ok;
end;
$$;

revoke all on function public.verify_execution_pin(text) from public, anon;
grant execute on function public.verify_execution_pin(text) to authenticated;

-- Super Admin perlu tahu APAKAH PIN sudah pernah diatur (tanpa pernah lihat
-- nilainya) — buat tampilan di menu Pengaturan ("PIN aktif" vs "Belum diatur").
create or replace function public.execution_pin_is_set()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select execution_pin_hash is not null from public.app_security where id = true
$$;

revoke all on function public.execution_pin_is_set() from public, anon;
grant execute on function public.execution_pin_is_set() to authenticated;
