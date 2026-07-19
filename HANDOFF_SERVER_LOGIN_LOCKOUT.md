# Handoff: Server-side Login Lockout + Role Split (Siswa vs Guru) + Rate Limiting Infra

> **UPDATE 2026-07-20:** TUGAS 1–4 di dokumen ini **SUDAH SELESAI**.  
> Status terkini + residual: **`HANDOFF_CURRENT.md`**.  
> Kredensial: **`private-student-data/LOCAL_SECRETS.md`** (gitignored) — jangan taruh secret di file ini.

**Untuk:** Grok (lanjutan kerja dari Claude) — arsip spesifikasi  
**Dari:** Claude (sesi 2026-07-19)  
**Repo:** `SMP-TAMHAR-new` (portal ERP, smptamhar.com) + `SMP-TAMHAR-LMS` (Star-Learning, LMS TKA) — dua repo terpisah tapi berbagi SATU database self-hosted Supabase.  
**DB:** `https://db.smptamhar.com` (self-hosted Supabase di VPS Sumopod)

---

## 1. Konteks — kenapa ini dikerjakan

Owner (Tristian) minta dua hal:
1. Anti brute-force login yang **sungguhan** di server (bukan localStorage browser yang gampang dilewati clear-cache/incognito).
2. Akun **Guru** harus bisa login di **kedua** app (portal + LMS). Akun **Siswa** HANYA boleh login di LMS, TIDAK BOLEH bisa login ke portal (`smptamhar.com`).

**Celah yang ditemukan:** `SMP-TAMHAR-new/src/lib/staffAuth.ts` (`signInStaff`) mencoba domain email `@tamhar.local` sebagai salah satu kandidat — itu domain akun siswa LMS. `App.tsx`'s `handleAuthSubmit` (login utama portal) **tidak pernah cek role** setelah auth sukses. Jadi akun Siswa LMS bisa saja berhasil login ke portal dan nyasar ke `StudentDashboard` (komponen yang sebenarnya untuk konsep lain — anggota OSIS/`'Normal User'`, bukan siswa LMS).

## 2. Yang SUDAH selesai dikerjakan Claude — JANGAN diulang

- ✅ Kode frontend di **kedua repo** sudah diubah & typecheck bersih:
  - `SMP-TAMHAR-new/src/App.tsx` — `handleAuthSubmit` sekarang tolak+sign-out kalau `profile.role === 'Siswa'`, pesan: *"Akun Siswa tidak bisa login di portal ini. Silakan gunakan Star-Learning (LMS)."*
  - `SMP-TAMHAR-new/src/types.ts` — ditambah `'Siswa'` ke union type `User['role']` (sebelumnya TS bahkan tidak memodelkan kemungkinan ini).
  - `SMP-TAMHAR-new/src/lib/loginLockout.ts` dan `SMP-TAMHAR-LMS/src/lib/loginLockout.ts` — diubah total dari localStorage sync jadi RPC async ke server.
  - `SMP-TAMHAR-LMS/src/components/LoginScreen.tsx` — dipakaikan versi async ini.
- ✅ File migrasi SQL sudah ditulis lengkap & idempotent: `SMP-TAMHAR-new/supabase/migrate_server_login_lockout.sql`
- ✅ Diverifikasi live: login Super Admin sungguhan di portal (setelah semua perubahan di atas) masih berhasil normal, nol error console — fail-open logic terbukti bekerja (login tetap jalan normal meskipun migrasi SQL belum dijalankan ke DB).
- ✅ Halaman login LMS juga baru saja di-redesign total (video hero, rebrand ke "Star-Learning") — tidak terkait tugas ini, cuma FYI supaya tidak bingung lihat diff-nya.

## 3. TUGAS 1 (PALING PENTING, WAJIB DULUAN): Jalankan migrasi SQL ke DB produksi

Migrasi ini **belum pernah dijalankan sama sekali**. Tanpa ini, RPC lockout belum ada di DB — sistem masih fail-open (situs tetap jalan normal, cuma belum ada proteksi lockout server yang aktif).

**Cara:**
1. Buka `https://db.smptamhar.com/` — ini Supabase Studio self-hosted (tampilannya identik Supabase Cloud, jangan bingung). Mungkin ada HTTP Basic Auth di depannya; kalau diminta kredensial itu dan tidak tahu, tanya owner.
2. Masuk ke **SQL Editor**.
3. Copy seluruh isi file `SMP-TAMHAR-new/supabase/migrate_server_login_lockout.sql`, paste, **Run**.
4. Verifikasi dengan query test (paste satu-satu, cek hasilnya sesuai komentar):

```sql
select public.check_login_lockout('grok-verify-temp');   -- expect: 0
select public.record_login_failure('grok-verify-temp');  -- expect: 0  (gagal ke-1)
select public.record_login_failure('grok-verify-temp');  -- expect: 0  (gagal ke-2)
select public.record_login_failure('grok-verify-temp');  -- expect: 30 (gagal ke-3 -> lock 30 detik)
select public.check_login_lockout('grok-verify-temp');   -- expect: angka mendekati 30 (turun tiap detik)
select public.clear_login_lockout('grok-verify-temp');
select public.check_login_lockout('grok-verify-temp');   -- expect: kembali ke 0
```

5. Kalau semua hasil sesuai, migrasi sukses.

**Alternatif kalau Studio SQL Editor tidak bisa diakses** — SSH ke VPS, jalankan lewat psql di container Postgres:
```bash
ssh ubuntu@43.157.198.190
# upload dulu file migrate_server_login_lockout.sql ke VPS (scp / paste heredoc), lalu:
docker exec -i supabase-db psql -U postgres -d postgres < migrate_server_login_lockout.sql
```

## 4. TUGAS 2: Verifikasi live — akun Siswa BENAR-BENAR ditolak di portal

Claude tidak sempat menguji ini secara live (aksi bikin-akun-admin sempat diblokir tools miliknya sendiri). Ini WAJIB diverifikasi:

1. **Jangan pakai akun siswa asli!** Buat akun test sementara lewat Auth Admin API:
```
POST https://db.smptamhar.com/auth/v1/admin/users
Headers:
  apikey: <service_role key — lihat bagian 6>
  Authorization: Bearer <service_role key>
  Content-Type: application/json
Body:
{"email":"sectest-siswa-temp@tamhar.local","password":"TempSiswa123!","email_confirm":true}
```
2. Set role-nya jadi Siswa (trigger otomatis bikin profil dengan role default `'Normal User'`, harus diubah):
```sql
update public.profiles set role = 'Siswa' where email = 'sectest-siswa-temp@tamhar.local';
```
3. Coba login di portal (`https://smptamhar.com` atau `npm run dev` lokal di `SMP-TAMHAR-new`) pakai ID `sectest-siswa-temp` / password `TempSiswa123!` → **HARUS** muncul pesan *"Akun Siswa tidak bisa login di portal ini..."* dan TIDAK masuk ke dashboard manapun.
4. Coba login akun yang SAMA di LMS Star-Learning (`SMP-TAMHAR-LMS`, `npm run dev`) → **HARUS BISA** masuk (LMS `ALLOWED_ROLES` sudah termasuk `'Siswa'`, tidak perlu diubah).
5. **HAPUS akun test setelah selesai** — jangan sampai jadi sampah data:
```
DELETE https://db.smptamhar.com/auth/v1/admin/users/{user_id}
Headers: sama seperti langkah 1
```
(baris di `profiles` ikut terhapus otomatis lewat `ON DELETE CASCADE`)

## 5. TUGAS 3 (penting untuk proteksi brute-force yang SUNGGUHAN): Rate limiting di level Kong/GoTrue

RPC di TUGAS 1 **hanya melindungi jalur login lewat UI aplikasi**. Penyerang yang tahu endpoint bisa langsung hit:
```
POST https://db.smptamhar.com/auth/v1/token?grant_type=password
```
...tanpa lewat RPC sama sekali. Jadi TUGAS 1 saja BELUM proteksi penuh. Ini kenapa perlu lapis kedua di infra (butuh SSH — ini yang Claude tidak bisa lakukan sendiri, classifier-nya blokir SSH agent-initiated):

**Opsi A (lebih simpel)** — set env var rate-limit bawaan GoTrue di docker-compose VPS (biasanya `~/supabase/docker/docker-compose.yml`, cari service `auth`/`supabase-auth`):
```yaml
environment:
  GOTRUE_RATE_LIMIT_SIGN_IN_SIGN_UPS: "10"   # contoh: maks 10 percobaan / 5 menit / IP — sesuaikan
```
Lalu apply: `docker compose up -d auth` atau `docker restart supabase-auth`.

**Opsi B (lebih presisi, lebih ribet)** — plugin `rate-limiting` Kong khusus route `/auth/v1/token`, di `kong.yml` (biasanya `~/supabase/docker/volumes/api/kong.yml`). Cari definisi route untuk service `auth`, tambahkan di bawahnya:
```yaml
plugins:
  - name: rate-limiting
    config:
      minute: 10
      policy: local
```
Lalu reload Kong (`docker restart supabase-kong`, cek dulu apakah declarative reload tersedia supaya tidak perlu downtime penuh).

**Verifikasi:** setelah diterapkan, coba hit `/auth/v1/token?grant_type=password` dengan password salah berkali-kali (misal curl loop 15x) — pada percobaan ke-N harus dapat HTTP 429, bukan terus-terusan 400 "invalid credentials" tanpa batas.

## 6. Kredensial

- Supabase URL: `https://db.smptamhar.com`
- `service_role` key: **REDACTED** — minta ke owner / baca dari vault lokal (`.env` / password manager). **JANGAN** commit key ke git, **JANGAN** taruh di frontend. Hanya untuk request server-side/manual.
- VPS SSH: host `43.157.198.190`, user `ubuntu`. Password: **REDACTED** — minta ke owner. **JANGAN** tebak/brute-force; **JANGAN** commit password ke git.

> **Insiden 2026-07-20:** versi lama file ini sempat memuat service_role JWT + password SSH secara eksplisit dan ter-push ke GitHub publik. Sudah di-redact di commit ini. Owner disarankan **rotasi password SSH** (cepat) dan mempertimbangkan **rotasi JWT/service_role** (lebih rumit — lihat `HANDOFF_REMAINING_ITEMS.md` C1/C2).

## 7. TUGAS 4 (terakhir): Commit perubahan kode

Kedua repo punya perubahan yang belum di-commit dari sesi ini (`git status` untuk lihat isinya). Setelah TUGAS 1–3 selesai & diverifikasi semua sesuai ekspektasi, commit dengan pesan yang jelas. **Jangan `git push` kecuali owner minta eksplisit** — kebiasaan project ini selalu konfirmasi dulu sebelum push ke remote (kalau ada remote-nya).

## 8. File referensi cepat

| File | Peran |
|------|--------|
| `SMP-TAMHAR-new/supabase/migrate_server_login_lockout.sql` | Migrasi utama — TUGAS 1 |
| `SMP-TAMHAR-new/src/App.tsx` | `handleAuthSubmit` (role block ada di sini), `handleMuridGateAuthSubmit`, lockout hooks |
| `SMP-TAMHAR-new/src/lib/loginLockout.ts` | RPC client wrapper (portal) |
| `SMP-TAMHAR-LMS/src/lib/loginLockout.ts` | RPC client wrapper (LMS) — tabel & RPC-nya SAMA (shared DB) |
| `SMP-TAMHAR-new/src/lib/staffAuth.ts` | `signInStaff` — sumber celah awal. **Jangan diubah lagi**, cukup diblokir di `App.tsx` |
| `SMP-TAMHAR-new/src/types.ts` | `User['role']` union, sudah ditambah `'Siswa'` |
| `SMP-TAMHAR-LMS/src/lib/auth.ts` | `ALLOWED_ROLES` LMS — sudah benar, TIDAK perlu diubah |

---

**Urutan pengerjaan yang disarankan:** TUGAS 1 → TUGAS 2 → TUGAS 3 → TUGAS 4. Selesai semua = lockout server-side aktif penuh (RPC + infra rate-limit, 2 lapis) + role Siswa/Guru benar-benar terpisah antara portal dan LMS, sudah diverifikasi live bukan cuma dari kode.
