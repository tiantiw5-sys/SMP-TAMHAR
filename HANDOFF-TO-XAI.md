# Handoff dari Claude — Update Terbaru Portal SMP TAMHAR

**Tanggal:** 2026-07-07
**Project:** `C:\Users\tiant\Projects\SMP-TAMHAR-new`
**Untuk:** sesi AI berikutnya (xAI/Grok) yang melanjutkan kerja di project ini.

Ringkasan semua yang berubah sejak audit keamanan terakhir (`HANDOFF-CLAUDE-VPS-AUDIT.md`), supaya tidak perlu menebak ulang kondisi terkini.

---

## 1. Hosting & Domain — MIGRASI KE JAGOAN HOSTING

- Domain resmi sekarang: **`smptamhar.com`** (dan `www.smptamhar.com`), dibeli sepaket hosting di **Jagoan Hosting** (cPanel).
- SSL sudah aktif via **AutoSSL (Let's Encrypt)** — terverifikasi live, bukan lagi self-signed.
- Netlify (`earnest-wisp-1f388b.netlify.app`) masih ada sebagai deployment lama/paralel — belum diputuskan apakah akan dipensiunkan.
- File **`public/.htaccess`** (baru) — pengganti `netlify.toml` untuk hosting cPanel: SPA fallback ke `index.html`, force HTTPS, security headers, cache aset. Otomatis ikut ter-copy ke `dist/` saat build (Vite men-copy isi `public/`), jadi otomatis masuk ke `SMP-TAMHAR-portal-deploy.zip`.
- **Cara deploy ke Jagoan Hosting:** `npm run build` → `npm run pack:deploy` → upload `SMP-TAMHAR-portal-deploy.zip` ke cPanel File Manager → extract di `public_html`, timpa yang lama.
- Env build masih sama: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` dari `.env.local` — build tetap dilakukan **lokal di laptop user**, bukan di server Jagoan Hosting (shared hosting ini tidak menjalankan proses build Node.js).

## 2. Login — domain email di-multi-fallback

`src/constants.ts` — `STAFF_LOGIN_EMAIL_SUFFIXES` sekarang array `['@smptamhar.com', '@tamhar.com', '@tamhar.local']`, dicoba berurutan lewat `src/lib/staffAuth.ts` (`signInStaff`). Ini supaya akun yang dibuat manual di Supabase Dashboard dengan domain mana pun di antara ketiganya tetap bisa login cukup pakai ID pendek (mis. `farhan`), tanpa perlu tahu domain persis di belakangnya.

**Riwayat penting:** sempat ada regresi login (`STAFF_LOGIN_EMAIL_SUFFIX` diganti paksa ke `@tamhar.local` oleh sesi sebelumnya, berdasarkan diagnosa "email_address_invalid" yang saya buktikan salah — hasil rate-limit email Supabase, bukan penolakan domain). File `supabase/fix_superadmin_login.sql` dan `supabase/setup_login.sql` (menulis manual ke `auth.users`/`auth.identities`) sudah diberi tanda **"JANGAN DIJALANKAN"** di bagian atas — jangan dihapus tandanya tanpa alasan kuat, itu cara yang tidak didukung resmi oleh Supabase dan pernah nyaris menghapus akun yang sudah bekerja.

## 3. Fitur baru sejak audit terakhir

- **Tambah Akun langsung dari dashboard** (`StudentDashboard.tsx`, tab Pengguna & Hak Akses) — pakai `createSignupOnlyClient()` di `src/lib/supabase.ts` (klien Supabase terpisah, `persistSession: false`) supaya signup tidak menggeser sesi Super Admin yang aktif. Tetap cuma anon key, TIDAK ADA service_role key di frontend.
- **Role dropdown**: `profiles.role` diubah dari `text` ke Postgres `enum` (`public.user_role`) — di Supabase Table Editor sekarang muncul dropdown, bukan kotak teks bebas.
- **Absensi murid tidak numpuk lagi**: fungsi RPC baru `upsert_item_by_id(p_key, p_item)` di `schema.sql` — nambah/timpa satu item by id dalam satu transaksi atomik di server (bukan ditebak client-side append vs update). Dipakai oleh kiosk scan (`StudentAttendanceKiosk.tsx`) dan panel manual guru (`StudentMuridAttendancePanel.tsx`) lewat `upsertItemById()` di `portalDb.ts`.
- **Absensi murid bisa diisi/direvisi untuk tanggal yang sudah lewat** — `StudentMuridAttendancePanel.tsx` sekarang punya date picker (`selectedDate`), bukan hardcode hari ini. Tombol hapus riwayat ("Hapus Riwayat Tanggal Ini") ikut tanggal yang dipilih.
- **Kunjungan per hari + Rekap Kunjungan + Online real-time**:
  - `visits` collection sekarang berupa map `{ "YYYY-MM-DD": jumlah }`, dinaikkan via RPC atomik `increment_daily_visit()` (anon boleh panggil, cuma untuk naikkan angka). **Pakai timezone Asia/Jakarta** (`now() at time zone 'Asia/Jakarta'`) — sempat bug pakai UTC, sudah diperbaiki.
  - Tab dashboard baru **"Rekap Kunjungan"** (Super Admin + Managerial Sekolah) — tabel tanggal vs jumlah.
  - **"Online Saat Ini" sekarang NYATA** — `src/lib/presence.ts` (`useLandingPagePresence`), pakai Supabase Realtime Presence (WebSocket, bukan tabel). Sebelumnya ini cuma angka acak yang dianimasikan (`liveActiveUsers` di StudentDashboard.tsx — SUDAH DIHAPUS, jangan dikembalikan).
- **Auto-logout idle 10 menit**: `src/lib/idleTimeout.ts` (`useIdleTimeout`), aktif untuk semua akun yang login. **Dikecualikan** saat layar kiosk scan barcode (`#absen-murid`) atau cetak kartu (`#kartu-barcode-murid`) terbuka — lihat `muridRouteActive` di `App.tsx` — supaya kiosk yang sengaja dibiarkan menyala tidak ke-logout sendiri.
- **Favicon & ikon PWA** — diganti dari ikon segitiga generik jadi logo asli SMP Taman Harapan. `scripts/generate-pwa-icons.mjs` ditulis ulang total: sekarang sumbernya `scripts/logo-source.png` (auto-download sekali dari Google Drive kalau belum ada), BUKAN lagi `favicon.svg` (file itu **sudah dihapus**, jangan dikira hilang tidak sengaja). `index.html` & `vite.config.ts` (`includeAssets`) sudah disesuaikan ke `favicon.png`.
- **Struktur OSIS**: `src/orgStructure.ts` — data anggota per divisi diperbarui jadi nama lengkap asli (sebelumnya nama panggilan singkat + ada anggota baru yang belum masuk). Tampilan `DivisionCard` di `OrgStructureCharts.tsx` didesain ulang total (3 kolom, list bernomor per anggota, badge jumlah orang) — jangan dikembalikan ke grid 7 kolom lama, itu sengaja dibongkar karena kelihatan berdesakan dengan nama lengkap.

## 4. Bug yang diperbaiki dari audit sebelumnya (sudah kelar, jangan diulang)

- Data siswa asli di source code (`initialStudents.ts`) — sudah diganti data contoh, real data cuma di Supabase.
- RLS v2 — **sudah live & terverifikasi** (anon tidak bisa baca students/cash/fines/logs).
- Bug korupsi data `uniforms` (format objek vs array) — sudah diperbaiki + migrasi data.
- `usePortalSync` generik yang diam-diam menimpa balik hasil RPC atomik — sudah dihapus untuk koleksi yang sudah atomik (articles/gallery/teachers/uniforms/cash/fines/studentAttendance).

## 5. File penting yang perlu diketahui

```
JALANKAN-INI-DI-SUPABASE.txt   ← di Desktop user (BUKAN di repo), salinan schema.sql
                                  yang di-paste manual user ke SQL Editor. SELALU
                                  disinkronkan ulang setiap ada perubahan schema.sql —
                                  kalau ubah schema.sql, jangan lupa update file ini juga
                                  dan minta user jalankan ulang.
supabase/schema.sql             ← kumulatif & idempotent, jangan direset — tambahkan
                                  migrasi baru di BAWAH, jangan modifikasi statement lama.
public/.htaccess                ← config Jagoan Hosting/cPanel
scripts/generate-pwa-icons.mjs  ← generate ikon dari scripts/logo-source.png
scripts/logo-source.png         ← source logo asli (jangan hapus, dipakai tiap build)
src/lib/presence.ts             ← online-now real-time
src/lib/idleTimeout.ts          ← auto-logout 10 menit
src/lib/staffAuth.ts            ← login multi-domain fallback
```

## 6. Catatan kecil yang belum dibereskan

- `src/lib/legacyAuth.ts` masih ada di repo, sudah dikonfirmasi tidak dipakai di mana pun (dead code), tapi belum dihapus (user belum minta eksplisit).
- `index.html` masih punya `<link rel="canonical">` mengarah ke URL Cloud Run lama (`...run.app`), belum diupdate ke `smptamhar.com` — kandidat perbaikan SEO kalau relevan.

---

*Kalau melanjutkan dari sini: user (Tristian) non-teknis, gampang pusing dengan jargon — jelaskan dengan bahasa sederhana, langsung ke poin, dan selalu verifikasi klaim ke database/live site sebelum melapor "sudah beres" (banyak insiden sebelumnya karena klaim tidak diverifikasi).*
