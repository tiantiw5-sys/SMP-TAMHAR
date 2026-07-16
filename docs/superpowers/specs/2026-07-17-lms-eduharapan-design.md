# Design — LMS "EduHarapan" (Classroom + CBT Ujian)

**Project:** SMP Taman Harapan Bekasi (`smptamhar.com`), repo `SMP-TAMHAR-new`
**Status:** Disetujui untuk masuk implementation plan (belum dikerjakan)
**Tujuan bisnis:** Mempersiapkan siswa untuk Ujian dan Simulasi TKA 2026 lewat platform belajar-mengajar online: kelas virtual (Google Classroom-style) + ujian berbasis komputer (CBT) dengan bank soal berbantuan AI.

Sumber referensi visual: prototype Claude Artifact "LMS Pendidikan (Standalone)" yang sudah dibuat user (didekode dari bundle-nya untuk sesi ini) — desain visual final tetap mengikuti prototype tersebut kecuali disebutkan lain di sini.

---

## 1. Latar Belakang

Sekolah butuh platform LMS internal untuk:
- Guru mengelola kelas (pengumuman, tugas, materi, nilai) secara online.
- Siswa mengerjakan tugas dan ujian dari perangkat masing-masing.
- Persiapan Ujian/Simulasi TKA 2026 lewat ujian berbasis komputer (CBT) dengan bank soal yang bisa disusun cepat lewat bantuan AI dari dokumen yang sudah ada.

Scope disetujui: **semua bagian** dari prototype (Classroom inti + CBT + AI soal-gen), dibangun bertahap dalam satu desain (lihat §7).

## 2. Keputusan yang Sudah Diambil

| Keputusan | Pilihan |
|---|---|
| Model data | Tabel relasional penuh (bukan pola "1 JSON blob per sekolah" yang dipakai `students`/`studentAttendance`) — data ujian/tugas per-baris-per-siswa-per-soal tidak cocok dengan pola blob. |
| Akun siswa | Dibuat baru, massal (mirip skrip `create-parent-accounts.mjs`), role `'Siswa'` baru, ID pakai NIS, password awal wajib ganti di login pertama. |
| Akses data | RLS ketat + RPC khusus (pola yang sama dengan Portal Orang Tua) — siswa hanya bisa baca kelas yang dia ikuti dan submission/nilai/jawaban miliknya sendiri, tidak pernah akses tabel mentah langsung. |
| Anti-cheat ujian | Deteksi sisi-klien standar (keluar fullscreen, pindah tab) — dicatat sebagai "pelanggaran", ditampilkan real-time ke guru/admin yang memonitor. Bukan proteksi total (tidak mencegah HP kedua/screen-recording); ekspektasi ini harus eksplisit di UI. |
| AI soal-gen | Lewat Supabase Edge Function baru (`generate-questions`) sebagai proxy ke Gemini API (`GEMINI_API_KEY` sudah ada di env, belum pernah dipakai) — **tidak boleh dipanggil langsung dari browser** karena situs ini static-hosted (key akan bocor publik). |
| Urutan build | Bertahap, lihat §7 — bukan berarti scope dipotong, hanya urutan pengerjaan. |

## 3. Arsitektur & Data Model

Tabel baru (skema `public`, mengikuti konvensi Postgres/Supabase project ini — SQL ad-hoc di `supabase/`, bukan folder `migrations/`):

- `lms_classes` — id, name, section, subject, teacher_id (→ profiles), color.
- `lms_enrollments` — class_id, student_id (linked_student_id), status. Menentukan siswa mana yang lihat kelas mana.
- `lms_materials` — class_id, title, type (Slide/PDF/Video), storage_path, uploaded_by, created_at.
- `lms_assignments` — class_id, title, description, due_at, points, created_by.
- `lms_submissions` — assignment_id, student_id, storage_path, submitted_at, grade, graded_at, graded_by.
- `lms_exams` — class_id, title, duration_minutes, status (draft/published), created_by.
- `lms_questions` — exam_id, order_index, type (mcq/essay), text, options (jsonb untuk MC), correct_option (nullable, disembunyikan dari siswa), points.
- `lms_exam_attempts` — exam_id, student_id, started_at, submitted_at, status (in_progress/submitted/graded), score.
- `lms_exam_answers` — attempt_id, question_id, answer (jsonb: pilihan atau teks esai), essay_grade (nullable, manual by guru).
- `lms_violations` — attempt_id, type (fullscreen_exit/tab_switch), occurred_at.

File storage (materi, tugas siswa) pakai Supabase Storage, pola yang sama dengan `migrate_annotations_storage.sql` yang sudah berjalan di project ini.

**RLS & RPC (pola sama dengan Portal Orang Tua):**
- Guru: baca/tulis penuh untuk kelas yang `teacher_id`-nya dia (dicek via `current_role_name()` + kepemilikan kelas).
- Siswa: TIDAK ada akses baca langsung ke `lms_submissions`, `lms_exam_attempts`, `lms_exam_answers`, `lms_questions.correct_option` milik siswa lain. Akses lewat RPC:
  - `get_my_classes()`, `get_my_assignments(class_id)`, `get_my_submissions()`
  - `get_my_exam(exam_id)` — mengembalikan soal TANPA kunci jawaban.
  - `start_exam_attempt(exam_id)`, `submit_exam_answer(attempt_id, question_id, answer)`, `submit_exam_attempt(attempt_id)` — auto-koreksi PG di server saat submit.
  - `report_violation(attempt_id, type)`.
- Admin (`Super Admin`): baca semua, sama seperti pola staf yang sudah ada.

## 4. Modul Classroom

Sesuai tab di prototype, per kelas:
- **Stream** — pengumuman guru, urut waktu.
- **Tugas** — daftar tugas, detail tugas (guru: lihat & nilai pengumpulan siswa; siswa: unggah jawaban). Status: belum dikumpulkan / sudah dikumpulkan / sudah dinilai.
- **Materi** — daftar file (Slide/PDF/Video) yang diunggah guru.
- **Nilai** — guru: matrix gradebook (siswa × tugas + rata-rata). Siswa: rekap nilai pribadi per tugas.
- **Siswa** — roster kelas, guru-only.

Dashboard utama (Home): kartu statistik, jadwal hari ini, progress belajar (circular), deadline tugas mendatang, pengumuman — semua per-user (siswa lihat miliknya, guru/admin lihat ringkasan kelas yang relevan).

## 5. Modul Ujian (CBT)

**Alur guru/admin — bikin ujian:**
1. Tempel teks dokumen soal → panggil Edge Function `generate-questions` (proxy ke Gemini) → dapat draft soal PG+esai terstruktur.
2. Preview & edit draft (guru bisa koreksi sebelum simpan — AI generation tidak auto-publish tanpa review manusia).
3. Simpan sebagai ujian baru (status `draft`), publish saat siap.

**Alur siswa — mengerjakan ujian:**
1. Mode layar-penuh terkunci, timer countdown, grid navigasi soal (belum/sudah dijawab).
2. Soal PG (pilih 1 opsi) atau esai (textarea).
3. Deteksi pelanggaran: keluar fullscreen atau ganti tab → modal peringatan + `report_violation()` dipanggil → guru lihat count real-time.
4. Submit → PG dikoreksi otomatis di server (`submit_exam_attempt` RPC), esai berstatus "menunggu penilaian guru".

**Alur guru/admin — monitoring live:** tabel real-time per siswa: progress, waktu tersisa, jumlah pelanggaran, status, nilai (setelah submit).

**Alur guru — menilai esai:** dari daftar attempt yang sudah submit, guru input nilai esai manual per jawaban, skor total ter-update.

## 6. Keamanan & Privasi

- RLS + RPC (§3) adalah syarat wajib sebelum fitur ujian live — tanpa itu siswa bisa lihat kunci jawaban atau nilai siswa lain.
- Kunci jawaban PG (`correct_option`) tidak pernah dikirim ke client siswa, baik saat mengerjakan maupun setelah submit (hanya skor akhir yang dikirim balik).
- `GEMINI_API_KEY` hanya dipakai di Edge Function (server-side), tidak pernah di bundle frontend.
- Auto-logout idle yang sudah ada untuk semua akun otomatis berlaku juga untuk akun siswa.
- **Testing wajib sebelum live** (tidak boleh dilewati, sama seperti syarat Portal Ortu): siswa A tidak bisa lihat jawaban/attempt/nilai siswa B; siswa tidak bisa fetch kunci jawaban lewat network tab; guru hanya bisa kelola kelas miliknya sendiri.

## 7. Rencana Bertahap

Satu desain ini dibangun dalam 4 fase berurutan (masing-masing dapat implementation plan sendiri lewat writing-plans):

1. **Fondasi** — tabel data model, role `'Siswa'`, skrip pembuatan 87 akun massal, RLS dasar.
2. **Classroom inti** — Stream, Tugas (+upload+penilaian), Materi, Nilai, roster. Belum ada ujian.
3. **CBT/Ujian** — bank soal manual, ambil-ujian siswa (timer+navigasi+anti-cheat), monitoring live guru, penilaian esai manual.
4. **AI soal-gen** — Edge Function `generate-questions`, alur tempel-teks → draft → review → publish di UI guru.

## 8. Di Luar Cakupan Sekarang

- Import soal dari bank soal eksternal/format lain (Word/Excel) — hanya via AI-dari-teks di fase 4.
- Analitik lanjutan (grafik performa per subtes TKA, prediksi skor) — bisa jadi fase berikutnya setelah data attempt terkumpul cukup banyak.
- Proteksi anti-cheat lebih kuat (lockdown browser, proctoring kamera) — di luar scope, dan perlu didiskusikan terpisah kalau sekolah butuh level itu.

## 9. Perkiraan Effort

| Bagian | Perkiraan |
|---|---|
| Fondasi (data model, akun, RLS) | Menengah |
| Classroom inti | Menengah–besar |
| CBT/Ujian + anti-cheat + monitoring | Besar |
| AI soal-gen (Edge Function) | Kecil–menengah |
| Testing (isolasi data antar siswa, kunci jawaban tidak bocor) | Wajib, tidak boleh dilewati |
