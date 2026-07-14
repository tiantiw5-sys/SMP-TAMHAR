-- RLS v2 — jalankan SEBELUM go-live VPS
-- Cara: buka Supabase → SQL Editor → paste & run SELURUH isi file schema.sql
-- (semua statement idempotent). File ini hanya pengingat migrasi.

-- Perubahan utama v2:
-- 1. Anon TIDAK bisa baca students / studentAttendance / cash / fines / logs
-- 2. students & studentAttendance hanya: Super Admin, Manajerial Sekolah, Guru Piket
-- 3. RPC append/update/delete memeriksa role untuk koleksi sensitif

select 'Jalankan supabase/schema.sql lengkap di SQL Editor' as instruksi;