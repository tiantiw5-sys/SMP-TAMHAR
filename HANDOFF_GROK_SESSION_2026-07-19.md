# Handoff: Kerja Grok (sesi 2026-07-19 → 2026-07-20)

**Untuk:** Claude (lanjutan sesi berikutnya)  
**Dari:** Grok (xAI)  
**Owner:** Tristian  
**Repo:**
- `SMP-TAMHAR-new` — portal ERP landing + auth (`smptamhar.com`)
- `SMP-TAMHAR-LMS` — Star-Learning LMS (`smptamhar.com/lms/`) — **repo lokal, tidak punya remote Git**

Dokumen ini menggantikan status “belum dikerjakan” di `HANDOFF_SERVER_LOGIN_LOCKOUT.md` dan `HANDOFF_REMAINING_ITEMS.md` untuk item yang **sudah selesai Grok**. Baca ini dulu sebelum mengulang kerja.

---

## 0. Ringkasan satu paragraf

Grok menyelesaikan migrasi SQL lockout server ke DB produksi, verifikasi live role Siswa (ditolak di portal, OK di LMS), rate-limit Kong di VPS, push/commit portal, **deploy pertama LMS** ke `https://smptamhar.com/lms/`, tombol Hero **StarLearning**, fix PWA SW yang “mencuri” `/lms/`, rename admin login **`superadmin` → `admintian`**, polish UI login (placeholder, back button, eye password, mobile), rename tombol Hero jadwal, dan polish responsive LMS. Portal production sudah di-redeploy berkali-kali lewat SFTP Jagoan Hosting.

---

## 1. Infra & kredensial (status)

| Item | Status |
|------|--------|
| Supabase self-hosted | `https://db.smptamhar.com` (VPS Sumopod `43.157.198.190`, user `ubuntu`) |
| Compose project | `/home/ubuntu/supabase-project` (`docker-compose.yml` + `pg17` + `nginx`) |
| Jagoan Hosting SFTP | `brave.jagoanhosting.id:45022`, user `smptamha`, key `SMP-TAMHAR-new/private-student-data/jagoan-hosting-deploy-ed25519` |
| Remote portal | `origin` → `https://github.com/tiantiw5-sys/SMP-TAMHAR.git` |
| LMS remote | **Tidak ada** (lokal murni) |
| Rotasi password SSH / JWT / service_role | **Dilewati owner** (Tugas C di handoff sisa) — jangan jalankan C2 tanpa minta ulang |

> **Catatan keamanan:** `service_role` key dan password VPS pernah ada di `HANDOFF_SERVER_LOGIN_LOCKOUT.md`. Owner pilih tidak rotasi. Jangan commit key ke git; jangan taruh di frontend.

---

## 2. Server-side login lockout + role Siswa (TUGAS 1–4 lama — SELESAI)

### 2.1 Migrasi SQL produksi — **sudah dijalankan**

File: `SMP-TAMHAR-new/supabase/migrate_server_login_lockout.sql`

- Tabel `public.login_lockouts` + RPC:
  - `check_login_lockout(text)`
  - `record_login_failure(text)`
  - `clear_login_lockout(text)`
- Grant execute ke `anon` + `authenticated`
- Verifikasi step-by-step (grok-verify-temp): `0,0,0,30,~30,clear,0` — **OK**
- REST: `POST /rest/v1/rpc/check_login_lockout` hidup

**Jangan jalankan ulang migrasi kecuali ada perubahan SQL** (file idempotent, aman tapi tidak perlu).

### 2.2 Role Siswa — **diverifikasi live**

Kode (dari Claude, dipertahankan):
- Portal `App.tsx` `handleAuthSubmit`: jika `profile.role === 'Siswa'` → error + `signOut`
- LMS `ALLOWED_ROLES` = `['Guru','Siswa','Super Admin']`

Verifikasi Grok:
- Buat user test `sectest-siswa-temp@tamhar.local`, set role `Siswa`
- Portal localhost: ditolak pesan Star-Learning
- LMS localhost: bisa masuk
- User test **dihapus** setelah uji

### 2.3 Rate limiting Kong (TUGAS 3) — **aktif di VPS**

**Bukan** `GOTRUE_RATE_LIMIT_SIGN_IN_SIGN_UPS` (tidak ada di GoTrue v2.189.0).

Yang dipasang:
1. `KONG_PLUGINS` di `docker-compose.yml` **ditambah** `rate-limiting` (wajib — tanpa ini Kong crash).
2. Plugin di service `auth-v1` pada `volumes/api/kong.yml`:
   ```yaml
   - name: rate-limiting
     config:
       minute: 20
       policy: local
       limit_by: header
       header_name: CF-Connecting-IP
       fault_tolerant: true
       hide_client_headers: false
   ```
3. `GOTRUE_RATE_LIMIT_HEADER: X-Forwarded-For` di service auth compose.

**Verifikasi:** loop 21 request ke `/auth/v1/token` dari VPS → HTTP **429** pada percobaan ke-21; header IP lain tetap 400.

**Backup di VPS:** `kong.yml.bak.*`, `docker-compose.yml.bak.*`

**Pelajaran:** Jangan pakai `limit_by: ip` di belakang nginx Docker — semua traffic kelihatan IP container. `limit_by: consumer` berbahaya (anon key = 1 bucket global).

### 2.4 Commit lockout (kode)

Portal (pushed sebagai bagian push 6 commit):
- `6ae491c` feat(auth): server-side login lockout and block Siswa on portal

LMS (lokal only):
- `654ef24` feat(auth): server-side login lockout on Star-Learning

---

## 3. Tugas sisa handoff (`HANDOFF_REMAINING_ITEMS`) — status

| Tugas | Keputusan owner / hasil Grok |
|-------|------------------------------|
| **A — git push portal** | **Selesai.** `git push origin main` → `50f2b8c..6ae491c` (6 commit). |
| **B — deploy LMS** | Owner pilih **subpath Jagoan** `/lms/`. **Selesai & live.** |
| **C1/C2 rotasi kredensial** | Owner: **lewati dulu.** |

---

## 4. Deploy LMS Star-Learning — SELESAI & LIVE

**URL publik:** https://smptamhar.com/lms/

### 4.1 Perubahan kode deploy

- `vite.config.ts`: `base: command === 'build' ? '/lms/' : '/'`
- Asset path pakai `import.meta.env.BASE_URL` (logo, video, bg)
- `public/.htaccess` SPA `RewriteBase /lms/`
- Commit LMS: `ab1df7a` feat(deploy): publish Star-Learning under /lms/

### 4.2 Cara deploy (ulang kalau Claude ubah LMS)

```powershell
cd SMP-TAMHAR-LMS
npm run build
# Upload dist/* ke public_html/lms/ via SFTP key jagoan-hosting-deploy-ed25519
# WAJIB: .htaccess ikut (scp * di Windows sering skip file dot)
# WAJIB: chmod 755 dirs, 644 files (jangan chmod 644 ke folder assets/)
```

Key/env: `SMP-TAMHAR-new/private-student-data/deploy-jagoanhosting.env.local`  
Remote root: `/home/smptamha/public_html/lms/`

### 4.3 Bug PWA portal yang bikin “klik LMS = landing page, F5 baru bener” — FIXED

Penyebab: service worker portal scope `/` + `navigateFallback` ke `index.html` **belum** men-denylist `/lms/`.

Fix di `SMP-TAMHAR-new/vite.config.ts`:
```js
navigateFallbackDenylist: [
  /^\/modul-ajar(\/|$)/,
  /^\/mpls(\/|$)/,
  /^\/lms(\/|$)/,
],
```
Commit: `d2265c6` — **sudah di-deploy** (`sw.js` production punya denylist `/lms`).

Kalau user masih keliatan lama: hard refresh / unregister SW.

---

## 5. Portal Hero & login UX

| Perubahan | Detail | Commit portal |
|-----------|--------|---------------|
| Tombol **StarLearning** | Hero secondary row, link `STAR_LEARNING_URL` → `https://smptamhar.com/lms/` (override `VITE_STAR_LEARNING_URL`) | `3aff574` |
| Rename tombol jadwal | "Mata Pelajaran" → **"Jadwal Mata Pelajaran"** | `3af30e3` |
| Placeholder login portal | Kosongkan `e.g. bendahara.osis atau superadmin` | `3f62c51` |
| Copy error superadmin | Hapus hint email `superadmin@…` | `e1d9a08` |

Konstanta: `STAR_LEARNING_URL` di `src/orgStructure.ts`, tipe env di `src/vite-env.d.ts`.

**Deploy portal:** berulang via SFTP ke `public_html/` (root index + assets + sw.js). Jangan timpa folder `modul-ajar/`, `mpls/`, `lms/`.

---

## 6. Rename admin ID: `superadmin` → `admintian` — SELESAI (DB)

Ini **perubahan database produksi**, bukan cuma teks UI.

| Field | Sebelum | Sesudah |
|-------|---------|---------|
| Auth email | `superadmin@tamhar.com` | **`admintian@tamhar.com`** |
| Profile email / name | superadmin | **admintian** |
| Role | Super Admin | Super Admin (tetap) |
| UUID user | `ac1d7ee3-6814-4a10-b38e-e574177860b0` | sama |
| Password | — | **tidak diubah** (password lama superadmin) |

Login di portal **dan** LMS: ketik ID **`admintian`** (suffix digeser otomatis: `@smptamhar.com` → `@tamhar.com` → `@tamhar.local`).

**Tidak disentuh:** `superadminortu@smptamhar.com` (role Orang Tua).

Lockout RPC untuk `superadmin`/`admintian` sudah di-clear saat rename.

---

## 7. LMS UI polish (live di `/lms/`)

| Item | Commit LMS (lokal) |
|------|--------------------|
| Hapus placeholder `mis. superadmin` | `b1becb1` |
| Tombol “Kembali ke Landing Page” → `https://smptamhar.com/` | `a8e89c4` lalu diperkecil `e672731` |
| Eye show/hide password | `e672731` |
| Harden mobile (dvh, input 16px anti-zoom iOS, drawer 85vw, overflow) | `dba1350` |

Verifikasi Playwright iPhone 13 di production: **MOBILE_LOGIN_OK** (no horizontal overflow, form fit).

---

## 8. Git status saat handoff ini ditulis

### Portal `SMP-TAMHAR-new`
```
main...origin/main [ahead 5]   # commits setelah push lockout BELUM di-push:
  3af30e3 fix(hero): rename Mata Pelajaran...
  e1d9a08 chore(auth): drop superadmin email hints...
  3f62c51 fix(login): remove superadmin placeholder...
  d2265c6 fix(pwa): exclude /lms/ from SPA navigateFallback
  3aff574 feat(hero): add StarLearning button...
```
Uncommitted residual (bukan dari kerja Grok inti):
- `M src/components/StudentDashboard.tsx` (toast z-index lama)
- Banyak `?? supabase/migrate_lms_*.sql`, diagnose, `HANDOFF_REMAINING_ITEMS.md`, dsb.

**Saran Claude:** `git push origin main` untuk 5 commit di atas (aman, sudah di-deploy production). Jangan commit diagnose SQL / secrets.

### LMS `SMP-TAMHAR-LMS`
```
main (no remote)
  dba1350 fix(ui): harden LMS mobile...
  e672731 fix(login): smaller back button and password visibility...
  a8e89c4 feat(login): large back-to-landing-page...
  b1becb1 fix(login): remove superadmin placeholder...
  ab1df7a feat(deploy): publish under /lms/...
  654ef24 feat(auth): server-side login lockout...
```
Uncommitted residual: Bank Soal (ExamDetail, ExamTaking, SimulasiTka, QuestionImages, scripts, playwright dep, dll.) — **kerja Claude/sebelumnya, bukan Grok**.

---

## 9. JANGAN diulang (sudah beres)

1. Migrasi `migrate_server_login_lockout.sql` ke DB  
2. Setup Kong rate-limit auth (sudah di VPS)  
3. Deploy pertama LMS ke `/lms/`  
4. Denylist `/lms` di PWA portal  
5. Rename DB admin ke `admintian`  
6. Tombol Hero StarLearning + label Jadwal Mata Pelajaran  
7. Placeholder superadmin di portal & LMS  
8. Push 6 commit lockout ke GitHub (sudah); 5 commit belakangan **belum push**  

---

## 10. Yang masih masuk akal dikerjakan Claude (opsional)

1. **`git push origin main`** portal (5 commit ahead).  
2. Residual uncommitted Bank Soal / migrate SQL LMS — commit terpisah & terapkan migrasi yang belum applied (beberapa file SQL masih `??` / “not yet applied”).  
3. Link internal lain ke LMS kalau masih ada hardcode path.  
4. Kalau owner minta: rotasi SSH password (C1) / JWT (C2 — **risiko tinggi**, baca `HANDOFF_REMAINING_ITEMS.md`).  
5. LMS: opsi remote git / backup repo (saat ini lokal only).  
6. Setelah login LMS: tombol “kembali landing” di shell (sekarang cuma di LoginScreen).  

---

## 11. Checklist verifikasi cepat (kalau Claude ragu)

```text
[ ] https://smptamhar.com/ → Hero ada StarLearning + "Jadwal Mata Pelajaran"
[ ] Klik StarLearning → langsung https://smptamhar.com/lms/ (tanpa F5)
[ ] Login portal ID: admintian + password lama Super Admin → Super Admin
[ ] Login LMS ID: admintian → Super Admin masuk
[ ] Login LMS role Siswa tetap boleh; di portal ditolak
[ ] RPC: POST /rest/v1/rpc/check_login_lockout body {"p_login_id":"x"} → number
[ ] Mobile LMS login: tidak overflow horizontal
```

---

## 12. File referensi

| File | Peran |
|------|--------|
| `HANDOFF_SERVER_LOGIN_LOCKOUT.md` | Spesifikasi awal lockout (sebagian sudah usang status “belum”) |
| `HANDOFF_REMAINING_ITEMS.md` | Push / deploy LMS / rotasi (A+B selesai, C skip) |
| **`HANDOFF_GROK_SESSION_2026-07-19.md`** | **Dokumen ini — sumber kebenaran status Grok** |
| `supabase/migrate_server_login_lockout.sql` | Migrasi lockout (sudah applied) |
| `vite.config.ts` (portal) | PWA denylist `/lms` |
| `src/orgStructure.ts` | `STAR_LEARNING_URL` |
| LMS `vite.config.ts` | base `/lms/` production |
| LMS `src/components/LoginScreen.tsx` | login UX + back landing |
| `private-student-data/deploy-jagoanhosting.env.local` | SFTP deploy |

---

**Pesan penutup untuk Claude:** Jangan mengulang migrasi/rate-limit/deploy dari nol. Fokus residual Bank Soal, push 5 commit portal, atau request owner baru. Admin login ID sekarang **`admintian`**, bukan `superadmin`.
