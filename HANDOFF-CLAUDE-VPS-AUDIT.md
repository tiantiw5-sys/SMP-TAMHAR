# Handoff ke Claude — Audit Final Pra-VPS

**Tanggal:** 2026-07-07  
**Pemilik:** Tristian Novansyah, S.Kom  
**Project:** `C:\Users\tiant\Projects\SMP-TAMHAR-new`  
**Status:** Perbaikan keamanan **sudah diimplementasi** — minta Claude **verifikasi** sebelum go-live.

---

## Instruksi untuk Claude

Lakukan **security review + production readiness audit** pada project ini. Banyak fix sudah diterapkan — tugasmu **memverifikasi** apakah cukup untuk VPS production.

**Output yang diminta:**
1. Temuan tersisa (Critical / High / Medium / Low) — jika sudah bersih, konfirmasi eksplisit
2. Verifikasi RLS Supabase vs perilaku app (baca `supabase/schema.sql`)
3. Contoh `nginx.conf` lengkap (HTTPS, SPA, security headers, CSP)
4. Checklist go-live final
5. Apakah ada celah di gate absensi murid / scanner?

**Jangan** audit project `SMP-TAMHAR` (prototipe lama) — hanya `SMP-TAMHAR-new`.

---

## Perbaikan yang SUDAH diterapkan (2026-07-07)

### 1. Akses absensi murid & scanner (role gate)

| Fitur | Role yang diizinkan |
|-------|---------------------|
| Tab **Absensi Murid (Scan)** di dashboard | Super Admin, Manajerial Sekolah, Guru Piket |
| `#absen-murid` (kiosk scanner) | Login wajib + role di atas |
| `#kartu-barcode-murid` (cetak kartu) | Login wajib + role di atas |

**Bukan** Guru biasa, Managerial OSIS, Normal User.

**File:**
- `src/lib/roleAccess.ts` — `canAccessMuridAttendance()`
- `src/components/MuridAttendanceGate.tsx` — login gate + akses ditolak
- `src/App.tsx` — route `#absen-murid` / `#kartu-barcode-murid` gated
- `src/components/StudentDashboard.tsx` — tab `murid-attendance` pakai `canAccessMurid`

### 2. Supabase RLS v2

- Anon **tidak bisa** SELECT `students`, `studentAttendance`, `cash`, `fines`, `logs`
- Anon hanya baca: `articles`, `gallery`, `teachers`, `uniforms`, `settings`, `visits`
- `students` / `studentAttendance`: read+write hanya 3 role absensi murid
- RPC `append_to_collection`, `update_collection_item`, `delete_collection_item` — cek role per koleksi

**File:** `supabase/schema.sql` (jalankan ulang di SQL Editor sebelum deploy)

### 3. Legacy auth dihapus dari login

- Tidak ada lagi fallback `authenticateLegacyUser` di `App.tsx`
- Session localStorage legacy tidak dipulihkan
- Tambah akun via UI dinonaktifkan → arahkan ke Supabase Dashboard / `scripts/create-portal-users.mjs`

### 4. Lainnya

- Password minimal **8** karakter (ganti password pertama)
- `superadmin` seed: `must_change_password = true`
- `portalDb.ts`: seed data sensitif hanya jika `DEV` atau `VITE_ALLOW_SEED=true`
- PWA `devOptions` off di production build
- `CARA-DEPLOY-SMP-TAMHAR.txt` diupdate untuk VPS

### 5. ⚠️ MASALAH LOGIN superadmin (bukan bug app — sudah ditelusuri)

**Gejala user (Tristian):** Login `superadmin` gagal di `https://192.168.1.70:3001/` — pesan "salah password".

**Bukan penyebab:** HTTPS, port 3001, kamera, atau gate absensi. **Hanya akun Supabase belum ada / email domain ditolak.**

**Root cause (sudah diverifikasi dengan API test ke Supabase project user):**

| Temuan | Detail |
|--------|--------|
| `superadmin@smptamhar.com` | Supabase Auth return **`email_address_invalid`** — domain ditolak |
| Login `superadmin`/`superadmin` | API return **`Invalid login credentials`** — akun belum dibuat atau password salah |
| Legacy auth | Sudah dihapus — tidak ada fallback offline |

**Fix yang sudah diterapkan di kode:**

| File | Perubahan |
|------|-----------|
| `src/constants.ts` | `STAFF_LOGIN_EMAIL_SUFFIX` → **`@tamhar.local`** (bukan `@smptamhar.com`) |
| `supabase/fix_superadmin_login.sql` | **Script SQL siap pakai** — buat/reset akun superadmin |
| `supabase/setup_login.sql` | Email diupdate ke `@tamhar.local` |
| `supabase/migrate_profiles.sql` | Semua email staf → `@tamhar.local` |
| `scripts/create-portal-users.mjs` | Email → `@tamhar.local` |
| `src/App.tsx` | Pesan error login lebih jelas (hint jalankan setup_login.sql) |

**Cara login yang benar (setelah SQL dijalankan):**

```
URL:      https://192.168.1.70:3001/  (atau domain production)
ID:       superadmin          ← cukup ID, tanpa @tamhar.local
Password: superadmin          ← wajib ganti setelah login pertama
Email internal: superadmin@tamhar.local  (otomatis di belakang layar)
```

**Langkah wajib operator (belum dilakukan user saat lapor bug):**

1. Supabase Dashboard → **SQL Editor**
2. Jalankan **`supabase/fix_superadmin_login.sql`** (atau `setup_login.sql`)
3. Refresh browser → login `superadmin` / `superadmin`
4. Ganti password saat diminta (`must_change_password = true`)

**Untuk Claude:** Jangan diagnosa ulang sebagai bug frontend. Verifikasi saja apakah SQL sudah dijalankan + apakah `@tamhar.local` konsisten di seluruh codebase. Jika user masih gagal login setelah SQL, cek `auth.users` + `profiles` di Supabase.

---

## Stack & deploy

| Item | Nilai |
|------|-------|
| Frontend | React 19 + Vite 6 + PWA |
| Backend | Supabase only (Auth + `portal_collections` + `profiles`) |
| Build | `npm run build` → `dist/` |
| Env build-time | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, optional `VITE_ALLOW_SEED` |
| Tes kamera LAN | `npm run dev:mobile` → `https://<IP>:3001` |

---

## File penting

```
src/lib/roleAccess.ts          ← role absensi murid
src/components/MuridAttendanceGate.tsx
src/components/CameraBarcodeScanner.tsx
src/components/StudentAttendanceKiosk.tsx
src/App.tsx                    ← auth + route gate
src/lib/portalDb.ts            ← sync + seed guard
supabase/schema.sql            ← RLS v2 (WAJIB dijalankan)
supabase/fix_superadmin_login.sql  ← FIX login superadmin (WAJIB jika belum bisa login)
src/constants.ts               ← STAFF_LOGIN_EMAIL_SUFFIX = @tamhar.local
scripts/create-portal-users.mjs
CARA-DEPLOY-SMP-TAMHAR.txt
.env.example
```

---

## Langkah wajib sebelum VPS (operator)

- [ ] Jalankan `supabase/fix_superadmin_login.sql` di Supabase SQL Editor (**wajib** — tanpa ini login gagal)
- [ ] Jalankan `supabase/schema.sql` di Supabase SQL Editor (RLS v2)
- [ ] Login tes: `superadmin` / `superadmin` → ganti password
- [ ] `update profiles set must_change_password = true` jika perlu
- [ ] Build dengan env production (`VITE_ALLOW_SEED=false` setelah DB terisi)
- [ ] HTTPS + nginx security headers
- [ ] Hapus baris `users` lama di `portal_collections` jika masih ada (legacy hash)

---

## Pertanyaan untuk Claude

1. Apakah RLS v2 di `schema.sql` sudah menutup semua jalur baca siswa via anon key?
2. Apakah gate `#absen-murid` bisa dibypass (localStorage spoof, direct API, dll)?
3. Apakah `schedulePortalSave` dari kiosk aman sekarang (user sudah login)?
4. Data siswa di `src/data/students-kelas8-2526.json` — risiko jika repo private vs public?
5. Buatkan `nginx.conf` production-ready untuk domain sekolah
6. `npm audit` — ada CVE yang block release?
7. Login superadmin — apakah `fix_superadmin_login.sql` + `@tamhar.local` sudah cukup? Ada risiko domain `.local` di production?

---

## Prompt copy-paste ke Claude

```
Baca HANDOFF-CLAUDE-VPS-AUDIT.md di C:\Users\tiant\Projects\SMP-TAMHAR-new.
Verifikasi perbaikan keamanan + MASALAH LOGIN superadmin (section 5 — bukan bug app, akun Supabase belum ada).
User gagal login di https://192.168.1.70:3001/ karena @smptamhar.com ditolak Supabase; fix = fix_superadmin_login.sql + @tamhar.local.
Beri temuan tersisa + nginx.conf + checklist go-live final.
Path: C:\Users\tiant\Projects\SMP-TAMHAR-new
```

---

*Diperbarui 2026-07-07 — termasuk root cause login superadmin (hanya akun Supabase, bukan bug portal).*