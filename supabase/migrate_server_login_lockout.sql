-- Server-side login lockout (anti brute-force) — dipakai bersama oleh portal
-- utama (smptamhar.com) DAN LMS Star-Learning, karena keduanya pakai DB yang
-- sama. Menggantikan lockout lama yang cuma disimpan di localStorage browser
-- (bisa dilewati dengan clear storage / ganti browser / incognito — itu bukan
-- proteksi sungguhan). Sekarang state lockout disimpan di tabel ini, dicek
-- SEBELUM percobaan auth dikirim ke Supabase Auth, jadi berlaku lintas
-- perangkat/browser untuk akun yang sama.
--
-- Catatan jujur soal batas proteksi ini (baca sebelum menganggap "100% aman"):
-- fungsi ini bisa dipanggil oleh anon key (harus, karena dipanggil SEBELUM
-- login/belum py session) — jadi ini menutup celah "hapus localStorage buat
-- lewatin lockout" dari sisi APLIKASI, tapi TIDAK mencegah penyerang yang
-- langsung memanggil endpoint /auth/v1/token milik GoTrue tanpa lewat RPC ini
-- sama sekali. Proteksi lapis itu (rate-limit di Kong/GoTrue) perlu diatur di
-- level infra VPS, di luar jangkauan migrasi SQL ini.
--
-- Jalankan di Supabase SQL Editor (self-hosted, db.smptamhar.com). Idempotent.

create table if not exists public.login_lockouts (
  login_id text primary key,
  fail_count integer not null default 0,
  lockout_level integer not null default 0,
  locked_until timestamptz not null default 'epoch',
  updated_at timestamptz not null default now()
);

alter table public.login_lockouts enable row level security;
revoke all on public.login_lockouts from public, anon, authenticated;
-- Sengaja tanpa policy apa pun — satu-satunya jalur akses adalah lewat
-- fungsi SECURITY DEFINER di bawah, tabel mentahnya tidak bisa dibaca/ditulis
-- langsung lewat REST oleh siapa pun.

-- Dipanggil SEBELUM signInWithPassword. Mengembalikan sisa detik terkunci
-- (0 kalau tidak terkunci). Kalau > 0, frontend wajib berhenti tanpa
-- mengirim percobaan password ke Supabase Auth sama sekali.
create or replace function public.check_login_lockout(p_login_id text)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_locked_until timestamptz;
begin
  select locked_until into v_locked_until
  from public.login_lockouts
  where login_id = lower(trim(p_login_id));

  if v_locked_until is null then
    return 0;
  end if;

  return greatest(0, ceil(extract(epoch from (v_locked_until - now())))::integer);
end;
$$;

-- Dipanggil setelah signInWithPassword gagal. Escalating lockout: 3x gagal
-- berturut-turut -> terkunci, durasi makin panjang tiap kali terkunci lagi
-- (30s, 60s, 120s, 300s, 600s, lalu tetap 600s). Mengembalikan durasi kunci
-- baru dalam detik kalau percobaan ini yang memicu lockout, atau 0 kalau
-- belum (masih dalam batas percobaan).
create or replace function public.record_login_failure(p_login_id text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id text := lower(trim(p_login_id));
  v_fail_count integer;
  v_level integer;
  v_locked_for integer;
  v_durations integer[] := array[30, 60, 120, 300, 600];
begin
  if v_id = '' then
    return 0;
  end if;

  insert into public.login_lockouts (login_id, fail_count, lockout_level, locked_until, updated_at)
  values (v_id, 1, 0, 'epoch'::timestamptz, now())
  on conflict (login_id) do update
    set fail_count = public.login_lockouts.fail_count + 1,
        updated_at = now()
  returning fail_count, lockout_level into v_fail_count, v_level;

  if v_fail_count >= 3 then
    v_locked_for := v_durations[least(v_level + 1, array_length(v_durations, 1))];
    update public.login_lockouts
      set locked_until = now() + (v_locked_for || ' seconds')::interval,
          lockout_level = v_level + 1,
          fail_count = 0,
          updated_at = now()
      where login_id = v_id;
    return v_locked_for;
  end if;

  return 0;
end;
$$;

-- Dipanggil setelah login BERHASIL — reset counter akun tsb ke nol.
create or replace function public.clear_login_lockout(p_login_id text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.login_lockouts where login_id = lower(trim(p_login_id));
$$;

-- anon WAJIB bisa panggil ketiganya karena semua terjadi SEBELUM ada session
-- (persis seperti signInWithPassword sendiri juga dipanggil dengan anon key).
revoke all on function public.check_login_lockout(text) from public;
grant execute on function public.check_login_lockout(text) to anon, authenticated;

revoke all on function public.record_login_failure(text) from public;
grant execute on function public.record_login_failure(text) to anon, authenticated;

revoke all on function public.clear_login_lockout(text) from public;
grant execute on function public.clear_login_lockout(text) to anon, authenticated;
