-- Fix: trigger on_auth_user_created hilang di instance self-hosted (Sumopod).
-- Ditemukan 2026-07-17 saat bikin 87 akun siswa lewat Admin API — akun
-- auth.users berhasil dibuat, tapi baris public.profiles TIDAK otomatis
-- muncul (harusnya dibuat trigger ini, lihat schema.sql), karena trigger-nya
-- ternyata tidak ada di database ini sama sekali (fungsinya ada, cuma
-- trigger yang menempelkannya ke auth.users yang hilang).
--
-- Dampak kalau tidak diperbaiki: SEMUA pembuatan akun baru ke depannya
-- (skrip Admin API mana pun, ATAU fitur "Tambah Akun" di dashboard yang
-- pakai self-service signup) akan menghasilkan akun login yang "kosong" —
-- bisa login, tapi tanpa role/nama yang benar sampai diperbaiki manual.
--
-- Jalankan SEKALI di Supabase SQL Editor / psql. Aman diulang.

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- Verifikasi setelah jalan (harus mengembalikan 1 baris):
select tgname, tgenabled from pg_trigger where tgname = 'on_auth_user_created';
