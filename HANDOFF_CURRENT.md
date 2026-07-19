# Handoff CURRENT — SMP Taman Harapan (portal + LMS)

**Untuk:** Claude / Grok (sesi berikutnya)  
**Dari:** Grok — diperbarui **2026-07-20**  
**Owner:** Tristian  

> **Baca file ini dulu.** Menggantikan status usang di handoff lama (lihat §10).  
> **JANGAN ulang** pekerjaan yang bertanda ✅.

---

## 0. Status ringkas

| Area | Status |
|------|--------|
| Portal live | ✅ `https://smptamhar.com` |
| LMS Star-Learning live | ✅ `https://smptamhar.com/lms/` |
| Git portal `main` | ✅ sinkron `origin/main` (HEAD `b5855f7` saat tulis; cek `git log -1`) |
| LMS repo remote | ❌ tidak ada (lokal only: `SMP-TAMHAR-LMS`) |
| Lockout server + role Siswa | ✅ DB + kode + live |
| Kong rate-limit `/auth` | ✅ VPS |
| Drag-reorder Galeri / Seragam / Artikel | ✅ SQL + UI + live |
| Admin login ID | ✅ **`admintian`** (bukan `superadmin`) |
| Secret di handoff publik | ✅ di-**REDACTED**; vault lokal terpisah |

---

## 1. Kredensial — di mana, dan aturan

### Vault lokal (WAJIB dibaca agent — **gitignored**, bukan publik)

```
SMP-TAMHAR-new/private-student-data/LOCAL_SECRETS.md
```

Isi: `service_role`, SSH VPS, pointer deploy Jagoan, admin `admintian`.

Juga:
- `private-student-data/deploy-jagoanhosting.env.local` — SFTP
- `private-student-data/jagoan-hosting-deploy-ed25519` — key deploy
- Portal/LMS `.env.local` — `VITE_SUPABASE_URL` + **anon** key

### Aturan owner (2026-07-20)

1. Agent **baca vault lokal** — **jangan tanya owner berulang** soal key/SSH.
2. **JANGAN** tulis secret ke `HANDOFF_*.md` root, `src/`, docs yang di-commit, atau chat publik.
3. Handoff publik cukup: *“kredensial di `private-student-data/LOCAL_SECRETS.md`”*.
4. Setelah kerja: **update memory lokal**  
   - `SMP-TAMHAR-new/.grok/MEMORY.md`  
   - `~/.grok/memory/SESSION_LOG.md` (Grok)

### Keamanan (audit 2026-07-20)

| Layer | Temuan |
|-------|--------|
| Bundle live portal/LMS | Hanya **anon JWT** — OK by design |
| `service_role` di frontend | **Tidak ada** |
| GitHub `HANDOFF_SERVER_LOGIN_LOCKOUT.md` | Sempat expose secret → **REDACTED** (`e411c05`) |
| Git **history** | Secret lama **masih bisa** ada di commit history publik |
| Saran | Rotasi password SSH (mudah). Rotasi JWT/service_role (C2) opsional, rumit — minta owner dulu |

---

## 2. Infra

| Item | Detail |
|------|--------|
| Supabase | `https://db.smptamhar.com` self-hosted |
| VPS | `43.157.198.190`, user `ubuntu` — password di **LOCAL_SECRETS.md** |
| Compose | `/home/ubuntu/supabase-project` (+ `docker-compose.pg17.yml`, `docker-compose.nginx.yml`) |
| Deploy static | SFTP `brave.jagoanhosting.id:45022` → `public_html/` (portal root, LMS `public_html/lms/`) |
| GitHub portal | `https://github.com/tiantiw5-sys/SMP-TAMHAR.git` |

---

## 3. Fitur auth / keamanan — SELESAI ✅

### 3.1 Server login lockout

- Migrasi applied: `supabase/migrate_server_login_lockout.sql`
- RPC: `check_login_lockout`, `record_login_failure`, `clear_login_lockout` (anon + authenticated)
- Frontend portal + LMS: `src/lib/loginLockout.ts` async RPC
- **Jangan apply ulang** kecuali SQL berubah

### 3.2 Role Siswa

- Portal `App.tsx`: `role === 'Siswa'` → tolak + signOut + pesan Star-Learning
- LMS: `ALLOWED_ROLES` termasuk `Siswa`
- Diverifikasi live dengan akun test (sudah dihapus)

### 3.3 Kong rate-limit (VPS)

- Plugin `rate-limiting` di service `auth-v1`
- `minute: 20`, `limit_by: header`, `header_name: CF-Connecting-IP`
- `KONG_PLUGINS` harus include `rate-limiting`
- `GOTRUE_RATE_LIMIT_HEADER: X-Forwarded-For`
- Verifikasi: HTTP **429** setelah burst ke `/auth/v1/token`

### 3.4 Admin ID

| | |
|--|--|
| Login | **`admintian`** |
| Email | `admintian@tamhar.com` |
| Role | Super Admin |
| Password | tidak di handoff — vault / owner |

`superadminortu@…` (Orang Tua) **tidak** disentuh.

---

## 4. LMS Star-Learning — SELESAI ✅

| Item | Detail |
|------|--------|
| URL | `https://smptamhar.com/lms/` |
| Vite base | `/lms/` saat `build`, `/` saat `dev` |
| Deploy | `npm run build` → SFTP ke `public_html/lms/` (chmod 755 dirs / 644 files; upload `.htaccess`) |
| PWA portal | `navigateFallbackDenylist` include `/lms` (fix SW curi navigasi) |
| Login UX | back landing page, eye password, mobile hardened |
| Repo | `Projects/SMP-TAMHAR-LMS` — **no git remote** |

---

## 5. Portal Hero / konten publik — SELESAI ✅

- Tombol **StarLearning** → `/lms/`
- Tombol **Jadwal Mata Pelajaran** (bukan “Mata Pelajaran”)
- Placeholder login superadmin dikosongkan

---

## 6. Drag-reorder koleksi — SELESAI & LIVE ✅

Migrasi: `supabase/migrate_reorder_collection.sql` — **applied**  
Client: `reorderCollection()` di `src/lib/portalDb.ts`  
UI: `StudentDashboard.tsx` (`Reorder.Group`, debounce 600ms)

| Tab | Key | Status |
|-----|-----|--------|
| Dokumentasi Galeri | `gallery` | ✅ |
| Jadwal Seragam | `uniforms` | ✅ |
| Artikel & Kegiatan | `articles` | ✅ (merge aman saat filter) |

**Verifikasi:** login `admintian` → drag → F5 → urutan tetap.

Commit terkait (sudah di `main`): `fc9f0b0`, `15c5e3c`, `f19bc20`, dll.

---

## 7. Cara deploy ulang (kalau ubah kode)

### Portal

```powershell
cd SMP-TAMHAR-new
npm run build
# SFTP dist/* → public_html/  (jangan timpa modul-ajar/, mpls/, lms/)
# Key: private-student-data/jagoan-hosting-deploy-ed25519 :45022 smptamha@brave.jagoanhosting.id
```

### LMS

```powershell
cd SMP-TAMHAR-LMS
npm run build
# SFTP dist/* → public_html/lms/
# Pastikan .htaccess ikut; chmod 755 pada folder assets
```

---

## 8. Residual / opsional (belum wajib)

- Untracked `supabase/migrate_lms_*.sql`, diagnose SQL — **bukan** bagian reorder; cek dulu apakah sudah applied di DB sebelum jalanin
- Residual uncommitted di LMS (Bank Soal, dll.) — di luar sesi lockout/reorder
- Rotasi SSH / JWT (C1/C2) — opsional; secret pernah di history GitHub
- Buat remote git untuk LMS (backup)

---

## 9. Checklist cepat

```
[ ] smptamhar.com — Hero StarLearning + Jadwal Mata Pelajaran
[ ] StarLearning → /lms/ tanpa perlu F5 (SW denylist)
[ ] Login portal/LMS: admintian
[ ] Siswa ditolak di portal, OK di LMS
[ ] Drag galeri / seragam / artikel → F5 persist
[ ] RPC check_login_lockout + reorder_collection hidup
[ ] Secret HANYA di private-student-data/LOCAL_SECRETS.md
```

---

## 10. Peta handoff lain

| File | Status |
|------|--------|
| **`HANDOFF_CURRENT.md`** | **Sumber kebenaran sekarang** |
| `HANDOFF_GROK_SESSION_2026-07-19.md` | Detail sesi lockout/LMS (masih valid, dilengkapi file ini) |
| `HANDOFF_REORDER_FEATURE_GROK.md` | Detail reorder (selesai) |
| `HANDOFF_REORDER_GALLERY.md` | Handoff migrasi galeri saja — **sudah applied** |
| `HANDOFF_SERVER_LOGIN_LOCKOUT.md` | Spec awal; TUGAS 1–4 selesai; kredensial **REDACTED** |
| `HANDOFF_REMAINING_ITEMS.md` | A push + B deploy LMS **selesai**; C rotasi **opsional/skip** |
| `private-student-data/LOCAL_SECRETS.md` | **Secrets — gitignored** |

---

## 11. Jangan diulang

1. Migrasi lockout / reorder_collection (sudah di DB)  
2. Setup Kong rate-limit dari nol  
3. Deploy pertama LMS  
4. Rename admin ke admintian  
5. Implement drag uniforms/articles dari nol  
6. Commit secret ke git  

---

**Pesan penutup:** Kerja auth, LMS live, reorder, dan vault lokal sudah beres. Lanjut residual Bank Soal / migrasi LMS lain / rotasi secret hanya jika owner minta. Admin = **`admintian`**. Secrets = **`LOCAL_SECRETS.md`**.
