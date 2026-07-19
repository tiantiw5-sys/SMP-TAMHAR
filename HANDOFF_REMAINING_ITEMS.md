# Handoff: Sisa Pekerjaan Setelah Server Login Lockout (untuk Grok)

> **UPDATE 2026-07-20:**  
> - **A — git push** ✅ selesai  
> - **B — deploy LMS** ✅ live di `https://smptamhar.com/lms/`  
> - **C — rotasi kredensial** — opsional; owner sempat skip. Secret vault lokal: `private-student-data/LOCAL_SECRETS.md`. Handoff publik di-REDACTED; history GitHub mungkin masih memuat secret lama → rotasi SSH/JWT tetap disarankan bila owner mau.  
> Status penuh: **`HANDOFF_CURRENT.md`**.

**Untuk:** Grok (lanjutan kerja dari Claude) — arsip  
**Dari:** Claude (sesi 2026-07-19)  
**Konteks:** Kelanjutan `HANDOFF_SERVER_LOGIN_LOCKOUT.md` — TUGAS 1–4 lockout sudah selesai. A+B di bawah juga sudah dikerjakan Grok.

Yang **dulu** tersisa ada 3 hal (sekarang A+B done):

---

## TUGAS A (mudah, prioritas pertama): `git push` repo `SMP-TAMHAR-new`

Claude tidak bisa menjalankan `git push` sama sekali — diblokir oleh classifier auto-mode Claude Code sendiri (bukan soal izin GitHub, bukan soal remote). Cek dulu statusnya:

```bash
cd SMP-TAMHAR-new
git status --short --branch
git log origin/main..HEAD --oneline
```

Kalau masih menunjukkan "ahead of origin/main" dengan commit-commit berikut (paling atas = terbaru):
```
6ae491c feat(auth): server-side login lockout and block Siswa on portal
1443f0d Update jadwal KBM ke T2 2026/2027 (...)
29d9f46 feat(auth): escalating login lockout after repeated failed attempts
53662f9 sql: Bank Soal AI schema + generate/remix RPCs for Simulasi TKA (not yet applied)
cdf39dc docs: implementation plan for Bank Soal AI (...)
86cc8a4 docs: design spec for Bank Soal AI (...)
```
...semuanya itu SUDAH di-review sebelumnya (bukan kerjaan asal commit), aman langsung:
```bash
git push origin main
```

`SMP-TAMHAR-LMS` **tidak punya remote sama sekali** (repo lokal murni, ini memang disengaja) — tidak ada yang perlu di-push di sana.

---

## TUGAS B (butuh keputusan owner, JANGAN asal jalan): Deploy LMS "Star-Learning" ke publik

LMS (`SMP-TAMHAR-LMS`, produk sekarang bernama "Star-Learning", dulu "EduHarapan") **belum pernah dideploy ke mana pun** — sepanjang pengembangannya cuma pernah dijalankan via `npm run dev` lokal (localhost:5173). Tidak ada config Netlify/Vercel, tidak ada target hosting yang sudah ditentukan.

**Ini keputusan yang perlu dikonfirmasi ke owner (Tristian) dulu, jangan langsung dieksekusi tanpa tanya**, karena app ini menyangkut akun siswa asli dan berisiko kalau publish tanpa sepengetahuan owner mau di-host di mana. Opsi yang masuk akal untuk ditawarkan:

1. **Subpath di Jagoan Hosting yang sama** (`https://smptamhar.com/lms/` atau `/star-learning/`) — paling konsisten dengan `modul-ajar/` dan `mpls/` yang sudah ada di server yang sama, pakai SFTP deploy key yang sudah ada (`SMP-TAMHAR-new/private-student-data/jagoan-hosting-deploy-ed25519`, host `brave.jagoanhosting.id:45022`, lihat detail resep deploy lengkap termasuk cara upload per-batch-direktori kalau ada classifier serupa di sisi Grok). Perlu set base path Vite (`base: '/lms/'` di `vite.config.ts`) sebelum build supaya asset path benar.
2. **Subdomain terpisah** (`lms.smptamhar.com` atau `star-learning.smptamhar.com`) — butuh setup DNS + vhost baru, lebih ribet tapi lebih bersih secara struktur URL.
3. **Host terpisah** (Netlify/Vercel gratis) — paling cepat setup-nya, tapi jadi domain berbeda sama sekali dari `smptamhar.com`, mungkin bikin bingung siswa.

**Tanya owner opsi mana yang dia mau sebelum deploy apa pun.** Kalau owner sudah jawab pas handoff ini dikirim (via chat terpisah), langsung eksekusi sesuai jawabannya.

---

## TUGAS C (opsional, PERLU HATI-HATI — baca dulu sebelum eksekusi): Rotasi kredensial yang sempat keluar ke Grok

Karena `HANDOFF_SERVER_LOGIN_LOCKOUT.md` sebelumnya berisi `service_role` key dan password SSH VPS secara eksplisit (memang sengaja, itu perlu untuk Grok bisa kerja), Claude menyarankan owner mempertimbangkan rotasi. **Ini BUKAN kebocoran ke pihak tak dikenal** (cuma dikirim ke Grok, layanan yang sudah dipilih sadar oleh owner) — jadi urgensinya rendah, bisa dilewati kalau owner merasa tidak perlu. Kalau owner MINTA ini dijalankan, ini levelnya JAUH lebih berisiko dibanding TUGAS A/B — bisa mematikan KEDUA aplikasi (portal yang sudah live + LMS) kalau salah urutan. Baca semua sebelum mulai:

### C1. Rotasi password SSH VPS (lebih aman, dampak kecil)
```bash
ssh ubuntu@43.157.198.190   # pakai password lama dulu
passwd                       # ganti password, ikuti prompt
```
Setelah ganti, **kabari owner password barunya langsung** (jangan cuma laporan ke Claude — Claude tidak bisa update memory-nya sendiri dari luar sesi ini). Dampak: cuma akses SSH yang berubah, tidak menyentuh aplikasi yang jalan sama sekali. Aman dilakukan kapan saja.

### C2. Rotasi `service_role` key — **JAUH lebih rumit, pikirkan dulu apa benar perlu**

`anon` key dan `service_role` key Supabase itu JWT yang di-sign pakai satu `JWT_SECRET` yang sama di server. **Tidak ada cara "cabut satu key doang"** — GoTrue/PostgREST cuma validasi tanda tangan + klaim role di token, bukan cek daftar key yang di-allow-list. Artinya satu-satunya cara benar-benar menonaktifkan `service_role` key yang lama adalah **ganti `JWT_SECRET` di server**, yang otomatis membuat SEMUA token lama (termasuk `anon` key yang dipakai di frontend production sekarang) langsung tidak valid.

**Kalau owner tetap mau melakukan ini, urutannya HARUS seperti ini (jangan diacak, akan menyebabkan downtime kalau salah urutan):**
1. Generate `JWT_SECRET` baru (string random panjang, mis. `openssl rand -base64 48`).
2. Generate `anon` key baru dan `service_role` key baru — keduanya JWT yang di-sign pakai `JWT_SECRET` baru itu, dengan payload `{"role":"anon","iss":"supabase"}` dan `{"role":"service_role","iss":"supabase"}` (pakai lib jwt apa saja, exp jauh ke depan seperti key lama).
3. Update env var `JWT_SECRET` di docker-compose VPS (services: `auth`/GoTrue, `rest`/PostgREST, `realtime` kalau dipakai, `storage` kalau dipakai) — semua service yang validasi JWT harus pakai secret yang SAMA.
4. Restart semua service itu bersamaan (`docker compose up -d` ulang service-service tsb) — akan ada downtime singkat.
5. **SEGERA** update `.env.local` di KEDUA repo (`SMP-TAMHAR-new` dan `SMP-TAMHAR-LMS`) dengan `anon` key baru, lalu build+deploy ulang portal (LMS kalau sudah live juga). Selama jeda antara langkah 4 dan build+deploy baru ini, **situs production akan error** (anon key lama di bundle JS yang sudan live jadi tidak valid).
6. Update juga tabel `public.app_secrets` di DB (`supabase_service_role_key`, `gemini_api_key` masih pakai key lama — cuma yang `supabase_service_role_key` perlu diganti ke key baru) supaya RPC seperti `admin_reset_password` masih jalan.
7. Test end-to-end: login portal, login LMS, satu fitur yang manggil `app_secrets` (reset password admin atau AI soal generator) — semua harus berhasil sebelum dianggap selesai.

**Rekomendasi Claude: jangan jalankan C2 kecuali owner secara eksplisit minta setelah paham konsekuensinya di atas** (downtime, banyak langkah, risiko salah satu app lupa di-update). Kalau ragu, tanya owner dulu apa dia benar-benar mau ini atau cukup C1 saja.

---

## Ringkasan prioritas

| Tugas | Risiko | Butuh tanya owner dulu? |
|-------|--------|--------------------------|
| A — git push | Sangat rendah | Tidak, langsung jalan |
| B — deploy LMS | Rendah, tapi perlu pilih target | **Ya**, tanya mau di-host di mana |
| C1 — rotasi password SSH | Sangat rendah | Tidak wajib, opsional |
| C2 — rotasi service_role key | **Tinggi** (bisa downtime 2 app) | **Ya, wajib**, jangan asal jalan |

Kerjakan A dulu (cepat, aman), lalu tanya owner untuk B dan C2, C1 boleh kapan saja.
