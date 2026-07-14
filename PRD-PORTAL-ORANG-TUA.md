# PRD — Portal Pantau Anak untuk Orang Tua

**Project:** SMP Taman Harapan Bekasi (`smptamhar.com`)
**Status:** ✅ Sudah dikerjakan (kode + skrip + SQL). Tinggal 3 langkah operator manual di §10 sebelum live.

---

## 10. Cara Mengaktifkan (Langkah Operator — WAJIB urut)

1. **SQL utama** — paste isi `JALANKAN-INI-DI-SUPABASE.txt` (di Desktop, sudah tersinkron dengan `supabase/schema.sql` termasuk bagian Portal Orang Tua) ke Supabase SQL Editor → Run. Aman diulang.
2. **Sinkron data murid** — buka `private-student-data/sync-students-2627.sql` di folder project (SENGAJA TIDAK ditaruh di Desktop — isinya data pribadi 87 murid, tidak perlu ikut naik ke OneDrive), copy isinya, paste ke SQL Editor → Run. Ini mengisi koleksi `students` (dipakai sistem absensi) dengan roster 2026/2027 yang benar — sebelumnya cuma `classRoster` (tampilan publik) yang sempat diupdate.
3. **Buat 87 akun Orang Tua** — di PowerShell, dari folder project:
   ```
   $env:SUPABASE_SERVICE_ROLE_KEY="service-role-key-dari-Supabase-Dashboard"
   node scripts/create-parent-accounts.mjs
   ```
   Ambil Service Role Key dari Supabase Dashboard → Project Settings → API → `service_role` (JANGAN ditempel ke chat, cukup dipakai di PowerShell lokal). Hasilnya: daftar ID login + password awal per anak tersimpan di `private-student-data/akun-orang-tua-2627.csv` (JANGAN diupload/dibagikan ke tempat publik). Tinggal dibagikan satu-satu ke orang tua masing-masing (WA/kertas).
4. **Upload frontend** — zip terbaru (`SMP-TAMHAR-portal-deploy.zip` di Desktop/Downloads) sudah termasuk dashboard Orang Tua, tinggal upload ke cPanel seperti biasa.

---

## 1. Latar Belakang & Tujuan

Orang tua murid saat ini tidak punya cara resmi untuk memantau kondisi anaknya di sekolah dari rumah (hadir/tidak hari ini, jadwal pelajaran, seragam yang harus dipakai). Info ini sekarang cuma ada di sistem internal staf.

**Tujuan:** buat portal khusus orang tua (mobile-friendly, bisa diakses dari HP) supaya mereka bisa cek kondisi anaknya kapan saja, mengurangi pertanyaan berulang ke pihak sekolah.

## 2. Keputusan yang Sudah Diambil

| Keputusan | Pilihan |
|---|---|
| Metode akses orang tua | **Akun penuh, dibuat manual oleh admin** — sama seperti akun staf sekarang. Paling aman, tapi Super Admin harus buat & hubungkan akun satu per satu ke anak yang bersangkutan. |
| Data yang ditampilkan (fase ini) | **Kehadiran harian** (Hadir/Sakit/Izin/Alpa) + **Jadwal pelajaran & info seragam harian**. |
| **Tidak** termasuk fase ini | Status denda/pelanggaran anak, status pembayaran SPP/kas per anak, nilai/rapor. |

## 3. User Flow

**Admin (Super Admin):**
1. Buka tab "Pengguna & Hak Akses" (sudah ada).
2. Tambah akun baru, pilih role **"Orang Tua"** (role baru).
3. Muncul field tambahan: pilih **1** murid yang jadi anaknya (cari by nama/NIS/kelas) — kalau kakak-adik satu sekolah, dibuatkan 2 akun terpisah.
4. Sistem generate ID login + password awal (mekanisme *wajib ganti password saat login pertama* dipakai ulang, sudah ada).
5. Admin kasih tahu ID + password awal ke orang tua (manual, lewat WA/kertas — di luar sistem).

**Orang Tua:**
1. Login pakai ID + password (halaman login sama seperti staf, cuma tampilan dashboard beda total — dibuat ringan, terang, sederhana, bukan versi ERP staf yang gelap).
2. Langsung tampil data anaknya (1 akun = 1 anak, tidak ada pemilih anak).
3. Lihat: ringkasan kehadiran anak bulan ini (kalender warna: hijau/hadir, kuning/izin-sakit, merah/alpa) + jadwal pelajaran hari ini + seragam yang harus dipakai besok/hari ini.
4. Wajib ganti password di login pertama (infra sudah ada, tinggal dipakai ulang).

## 4. Perubahan Backend yang Dibutuhkan

Ini bagian paling penting untuk dipahami sebelum mulai — arsitektur data sekarang **belum siap** untuk role seperti ini tanpa penyesuaian, karena berpotensi bocor data anak orang lain kalau asal tambah role baru.

**Kenapa berisiko kalau asal ditambah:** koleksi `students` dan `studentAttendance` di database sekarang disimpan sebagai **satu blok data (JSON) untuk SATU SEKOLAH PENUH**, bukan per-baris-per-murid. Kebijakan akses sekarang sengaja membuka baca `students`/`studentAttendance` untuk **SEMUA akun staf yang login** (supaya panel "Kehadiran Murid per Kelas" kelihatan semua orang) — ini aman untuk staf (memang tugasnya lihat semua murid), tapi **kalau role "Orang Tua" ditambahkan ke daftar itu apa adanya, satu akun orang tua bisa lihat data SELURUH murid sekolah**, bukan cuma anaknya. Itu masalah privasi serius yang harus dicegah dari desain, bukan ditambal belakangan.

**Solusi yang direkomendasikan:**

1. **Role baru** `'Orang Tua'` ditambahkan ke enum `public.user_role`.
2. **1 kolom baru** `linked_student_id` di tabel `profiles` (bukan tabel penghubung terpisah — sesuai keputusan 1 akun = 1 anak):
   ```sql
   alter table public.profiles add column if not exists linked_student_id text;
   ```
   Cuma Super Admin yang boleh isi/ubah kolom ini (lewat UI tambah akun).
3. **Fungsi khusus (RPC)**, bukan akses langsung ke koleksi mentah — supaya orang tua HANYA bisa dapat data anaknya sendiri, disaring di server:
   - `get_my_child()` → satu objek data anak (dari koleksi `students`) sesuai `linked_student_id` akun yang login.
   - `get_my_child_attendance()` → cuma baris absensi milik anak itu saja.
4. **Kebijakan akses (RLS) diperketat**: role `'Orang Tua'` **dikecualikan** dari akses baca langsung ke koleksi `students` dan `studentAttendance` yang sekarang "terbuka untuk semua staf login" — orang tua cuma boleh lewat 2 fungsi di atas.
5. **Jadwal pelajaran & seragam**: datanya memang tidak personal/sensitif (berlaku untuk satu kelas/sekolah, bukan per-anak), jadi cukup tambahkan `'Orang Tua'` ke daftar role yang boleh baca koleksi `teachingSchedule` dan `uniforms` — tidak perlu RPC khusus.

## 5. Perubahan Frontend yang Dibutuhkan

- **Dashboard baru khusus Orang Tua** — bukan reuse dashboard staf (terlalu ramai/rumit untuk orang tua awam, dan gelap). Halaman baru, **latar terang/cerah**, mobile-first, menarik & interaktif: kartu ringkasan kehadiran, kalender kecil, jadwal hari ini, seragam hari ini.
- **Tidak ada pemilih anak** — 1 akun = 1 anak, langsung tampil begitu login.
- **Tambahan di form "Tambah Akun"** (admin) — saat role dipilih "Orang Tua", muncul pencarian & pilih 1 murid, untuk kebutuhan input manual murid baru di masa depan (bulk awal dikerjakan Claude, lihat §9).

## 6. Keamanan & Privasi

- Poin #4 di atas (RPC + RLS diperketat) adalah syarat wajib, bukan opsional — tanpa itu, fitur ini membuka celah privasi data anak ke orang tua lain.
- Password awal wajib diganti di login pertama (pakai mekanisme yang sudah ada).
- Auto-logout 10 menit idle yang sudah ada untuk semua akun, otomatis berlaku juga untuk akun orang tua.

## 7. Di Luar Cakupan Sekarang (Ide Fase Berikutnya)

- Status denda/pelanggaran per anak.
- Status pembayaran SPP/kas per anak — **butuh tabel baru sepenuhnya**, kas sekarang cuma pencatatan umum sekolah, belum per-siswa.
- Nilai/rapor — **belum ada data model sama sekali** di sistem, ini proyek terpisah yang jauh lebih besar.
- Notifikasi otomatis (WhatsApp/push) kalau anak tercatat Alpa.
- Orang tua daftar/link akun sendiri (self-service) tanpa admin — saat ini sengaja tidak dipilih karena butuh verifikasi identitas tambahan yang lebih rumit.

## 8. Perkiraan Effort

| Bagian | Perkiraan |
|---|---|
| Backend (role, tabel penghubung, RPC, RLS) | Kecil–menengah |
| Frontend (dashboard ortu + tambahan form admin) | Menengah |
| Testing (pastikan orang tua A benar-benar tidak bisa lihat anak orang tua B) | Wajib, tidak boleh dilewati |

## 9. Keputusan Final (dikonfirmasi user, 12 Juli 2026)

1. **1 akun = 1 anak, selalu** — walau ada kakak-adik di sekolah yang sama, tetap dibuatkan akun terpisah per anak (tidak ada UI "pilih anak"). Ini menyederhanakan desain: tidak perlu tabel penghubung many-to-many, cukup **1 kolom `linked_student_id` langsung di tabel `profiles`**.
2. **Claude yang membuat akunnya secara massal**, jumlah & datanya diambil dari data murid asli yang sudah ada (bukan Super Admin input satu-satu). Karena Claude tidak punya kredensial admin ke database production, prosesnya: Claude siapkan skrip + daftar akun, Super Admin tinggal jalankan **satu perintah** (butuh Service Role Key dari Supabase, jangan ditempel di chat — dijalankan sendiri via PowerShell).
3. **Kehadiran + Jadwal & Seragam, dua-duanya langsung di versi pertama.** Tidak dipecah bertahap.
4. **Desain dashboard orang tua: mobile-first, terang/cerah (bukan gelap seperti dashboard staf), menarik & interaktif, tulisan mudah dibaca.** Tema visual sengaja dibuat berbeda total dari dashboard staf (yang gelap navy) supaya orang tua awam tidak merasa sedang buka aplikasi "kantor".

### Temuan blocker saat eksekusi

Data murid yang dipakai sistem absensi (koleksi `students`, yang menyimpan NIS — beda dari `classRoster` yang cuma nama+gender untuk tampilan publik) **belum disinkronkan** ke roster tahun ajaran 2026/2027 (baru `classRoster` yang sudah diupdate). ID untuk ~37 murid baru (belum ada NIS resmi) memakai skema sementara `TEMP-<kelas>-###` yang sudah pernah dihitung di `private-student-data/import-report-2627.txt`. Claude akan sekalian menyelesaikan sinkronisasi ini sebagai prasyarat, memakai skema ID yang sama, supaya akun orang tua nempel ke ID anak yang benar & stabil.
