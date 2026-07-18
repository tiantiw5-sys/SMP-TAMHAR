# Design — Bank Soal AI untuk Simulasi TKA

**Project:** LMS "EduHarapan" (repo `SMP-TAMHAR-LMS`), skema DB tetap di `SMP-TAMHAR-new/supabase/` (satu instance Supabase self-hosted yang sama, lihat [2026-07-17-lms-eduharapan-design.md](./2026-07-17-lms-eduharapan-design.md) §3 untuk alasan topologi ini).
**Status:** Disetujui untuk masuk implementation plan (belum dikerjakan).
**Tujuan bisnis:** Memusatkan pembuatan konten Simulasi TKA (fitur latihan soal ala pusmendik.kemdikbud.go.id yang sudah ada) ke Super Admin lewat pipeline AI — admin upload soal yang ditemukan di internet (gambar/PDF/Word/PPTX/teks), AI membaca & menyusunnya jadi soal pilihan ganda terstruktur, siswa/guru cuma jadi konsumen (mengerjakan), bukan pembuat konten.

---

## 1. Latar Belakang

Fitur Simulasi TKA (dibangun 2026-07-18, lihat memory `project-lms-eduharapan-status`) saat ini kontennya dibuat manual oleh guru per kelas lewat checkbox "Tandai sebagai Simulasi TKA" di tab Ujian — tersebar, tidak konsisten kualitasnya, dan terikat ke satu kelas/rombel (padahal Simulasi TKA seharusnya lintas-rombel per mata pelajaran).

Kebutuhan baru: Super Admin sering menemukan kumpulan soal TKA/sejenisnya di internet (gambar scan, PDF, dokumen Word/PPTX) tapi tidak selalu disertai kunci jawaban. Dibutuhkan alur upload → AI membaca & menyusun jadi soal terstruktur → admin tinjau/edit → publish, dengan siswa bisa memilih mau mengerjakan set soal tertentu (by nama) atau mode "Remix" (acak campuran semua set dalam satu mata pelajaran).

## 2. Keputusan yang Sudah Diambil

| Keputusan | Pilihan |
|---|---|
| Siapa boleh bikin konten Simulasi TKA | **Cuma Super Admin**, lewat Bank Soal. Checkbox manual guru di tab Ujian **dihapus**. Ujian biasa (non-simulasi) milik guru per kelas tidak berubah sama sekali. |
| Format upload | Gambar/scan, PDF, Word, PPTX, atau tempel teks langsung — AI (Gemini) baca gambar/PDF secara native; Word/PPTX diekstrak jadi teks di browser dulu sebelum dikirim ke AI. |
| Makna "nama" pada soal hasil generate | 1 batch upload = 1 set soal bernama (mis. "Soal UN Matematika 2019 Paket A"). Bukan sistem kategori lintas-upload. |
| Cakupan Remix | Acak dalam **1 mata pelajaran yang sama** (bukan lintas mapel), jumlah soal tetap. |
| Tipe soal Bank Soal | **Pilihan ganda saja** — auto-terkoreksi, tidak butuh guru penilai manual (beda dari ujian kelas biasa yang boleh ada esai). |
| Kunci jawaban | Opsional saat upload. Kalau ada, dipakai AI sebagai acuan. Kalau tidak ada, AI menentukan sendiri jawaban yang paling tepat — admin WAJIB meninjau/bisa mengedit draft sebelum publish, supaya tebakan AI yang salah tidak lolos ke siswa. |
| Durasi & jumlah soal | **Durasi tetap 75 menit untuk semua exam `exam_type='simulasi'`**, tidak tergantung jumlah soal aktualnya. **30 soal adalah target/default**, bukan syarat wajib — satu set bisa berisi lebih sedikit kalau sumbernya memang tidak sebanyak itu (lihat §7), Remix juga otomatis mengambil sejumlah yang tersedia kalau kurang dari target. Angka 75 menit/30 soal berlaku sama untuk keempat mata pelajaran (Matematika & Bahasa Indonesia: sesuai aturan resmi TKA SMP 2026; Bahasa Inggris & IPA: belum ada standar resmi — TKA baru merencanakan menambah 2 mapel ini di 2027 — disamakan ke angka yang sama sebagai default paling masuk akal saat ini). |
| Proteksi anti-keluar saat mengerjakan | Diperketat **khusus untuk Simulasi TKA** (bukan ujian kelas biasa): begitu keluar fullscreen/pindah tab, layar langsung terkunci total sampai kembali fullscreen; 3x pelanggaran → auto-submit paksa. **Batasan teknis yang harus dikomunikasikan ke pengguna:** Alt+Tab dan buka-tab-baru adalah level sistem operasi/browser — TIDAK BISA benar-benar diblokir oleh situs web mana pun (bukan keterbatasan implementasi, ini batas keamanan browser yang disengaja). Proteksi kunci-layar+auto-submit adalah batas maksimal yang dicapai lewat web browser biasa; kunci total butuh aplikasi kiosk terpisah (mis. Safe Exam Browser) yang di luar cakupan desain ini. |
| Approval sebelum tayang | Draft hasil AI TIDAK langsung tersimpan ke `lms_questions` — admin tinjau & pilih/edit dulu (pola sama seperti fitur AI generator Fase 4 yang sudah ada), baru simpan sebagai exam berstatus `draft`, lalu publish manual. |

## 3. Arsitektur & Model Data

**Perubahan skema `lms_exams`:**
- `class_id` diubah dari `NOT NULL` menjadi **nullable**, khusus dikosongkan untuk `exam_type = 'simulasi'`.
- Kolom baru `subject text` — diisi HANYA untuk baris `exam_type = 'simulasi'` (nama mata pelajaran, cocok dengan salah satu dari 4 menu di halaman Simulasi TKA: Bahasa Indonesia/Matematika/Bahasa Inggris/IPA).
- Kolom baru `source_note text` (nullable, opsional) — catatan asal upload (nama file dsb), buat jejak audit. Tidak perlu tabel terpisah untuk ini karena hubungannya 1-ke-1 dengan exam yang dihasilkan.
- Kolom baru `is_remix boolean not null default false` — menandai baris exam "bayangan" hasil sesi Remix (lihat §4), supaya bisa disembunyikan dari daftar set-bernama yang dipilih siswa.
- Constraint: `(exam_type = 'ujian' AND class_id IS NOT NULL) OR (exam_type = 'simulasi' AND class_id IS NULL AND subject IS NOT NULL)`.

**Perubahan model akses (RLS/RPC):**

Sebelumnya, siapa boleh lihat sebuah exam ditentukan lewat keanggotaan kelas (`is_enrolled_in_exam_class` → cek `lms_enrollments`). Karena baris `simulasi` sekarang tidak punya `class_id`, aturannya bercabang dua:
- **Ujian biasa** (`class_id IS NOT NULL`): logika keanggotaan kelas TIDAK berubah sama sekali — siswa harus terdaftar di kelas itu, guru harus pemilik kelas itu.
- **Simulasi** (`class_id IS NULL`): SIAPA PUN akun `Siswa` yang aktif boleh SELECT baris berstatus `published` (tidak perlu cek enrollment sama sekali) — karena Simulasi TKA memang dimaksudkan lintas-rombel. Pembuatan/edit/publish baris simulasi cuma boleh `Super Admin`.

Fungsi yang perlu disesuaikan (hati-hati, ini fungsi yang menjaga `correct_option` tidak pernah bocor ke siswa — lihat catatan "SYARAT KERAS" di `migrate_lms_ujian.sql`): `is_enrolled_in_exam_class`, `is_exam_class_teacher`, kebijakan RLS `lms_exams_select`/`lms_questions_select`, `get_my_exam`, `start_exam_attempt`. Masing-masing ditambah cabang kondisi: kalau `class_id IS NULL` (baris simulasi), pakai aturan mapel+status, bukan aturan kelas.

## 4. Alur Backend & RPC

**RPC baru `generate_bank_soal_questions(p_subject text, p_files jsonb, p_answer_key text default null, p_question_count integer default 30)`** — pola identik dengan `generate_ai_questions` yang sudah ada (Postgres, `http` extension, kunci Gemini dari `app_secrets`), bedanya:
- `p_files`: array `{mime_type, data_base64}` — gambar/PDF dikirim apa adanya sebagai `inline_data` ke Gemini (mendukung native document/vision understanding); Word/PPTX sudah diubah jadi teks di sisi browser sebelum sampai ke RPC ini (Gemini belum tentu bisa baca format Office secara langsung dengan andal).
- `p_answer_key`: teks kunci jawaban opsional, disisipkan ke prompt sebagai acuan kalau ada.
- Balikan: draft soal PG terstruktur (teks, 4 opsi, indeks jawaban benar) — **tidak menulis ke `lms_questions` sama sekali**, cuma dikembalikan sebagai JSON ke frontend untuk ditinjau.
- Otorisasi: cuma role `Super Admin`.

**Simpan jadi set:** admin tinjau/edit draft di layar → `createExam` (disesuaikan: `classId` opsional, terima `subject`) bikin baris `lms_exams` berstatus `draft` → `createQuestion` (sudah ada, tidak berubah) dipanggil per soal terpilih → admin publish manual (tombol publish yang sudah ada, dipakai tanpa konteks kelas).

**RPC baru `start_remix_attempt(p_subject text, p_question_count integer default 30)`:**
1. Validasi caller role `Siswa`.
2. Ambil `p_question_count` baris acak (`ORDER BY random() LIMIT ...`) dari `lms_questions` milik semua `lms_exams` dengan `exam_type='simulasi' AND subject=p_subject AND status='published'`.
3. Insert 1 baris `lms_exams` baru (`is_remix=true`, `subject=p_subject`, `class_id=NULL`, `status='published'`, judul otomatis) + salin (bukan referensi) soal-soal terpilih ke situ — supaya attempt tetap konsisten meski set sumbernya berubah setelahnya.
4. Panggil `start_exam_attempt` yang **sudah ada, tidak diubah** dengan `exam_id` baru ini.
5. Balikan `exam_id`/`attempt_id` ke frontend.

Tidak ada perubahan sama sekali di `submit_exam_answer`/`submit_exam_attempt`/`ExamTaking.tsx` — Remix cuma "menyamar" jadi exam biasa di mata komponen-komponen ini.

## 5. Frontend / UI

**Admin → tab baru "Bank Soal"** (di sebelah tab Sinkronisasi):
- Form upload: pilih mapel (4 pilihan tetap), judul set, upload file(s) soal + kunci jawaban opsional, jumlah soal target.
- Layar tinjau draft: mirip `AiQuestionGenerator` yang sudah ada, ditambah **kemampuan edit langsung** (teks soal/opsi/jawaban benar per baris draft), bukan cuma centang termasuk/tidak — supaya tebakan AI yang meleset bisa dibetulkan sebelum tersimpan.
- Daftar set per mapel: status draft/published, jumlah soal, publish/hapus — pakai ulang `ExamDetail.tsx`, disesuaikan supaya jalan tanpa `class_id`.

**`UjianTab.tsx`:** checkbox "Tandai sebagai Simulasi TKA" dan badge terkait **dihapus**.

**`SimulasiTkaPage.tsx`:** menu 4 tombol mapel tidak berubah tampilannya. Di dalam satu mapel, daftar diganti dari "soal per kelas Anda" jadi **semua set published di mapel itu** (query baru, tidak lagi lewat `fetchMyClasses`/enrollment), ditambah 1 kartu **"Remix"** terpisah di paling atas. Set bernama maupun Remix, dua-duanya masuk ke `ExamTaking` yang sama persis seperti sekarang.

**`ExamTaking.tsx`:** logika deteksi keluar-fullscreen/pindah-tab yang sudah ada diperkuat — untuk exam dengan `exam_type='simulasi'` saja (dicek dari data exam yang sudah dimuat), begitu terdeteksi, tampilkan overlay penuh yang memblokir interaksi (tidak bisa lihat/jawab soal) sampai fullscreen aktif lagi; hitung pelanggaran; pada pelanggaran ke-3, panggil `handleSubmit` otomatis. Untuk `exam_type='ujian'` (kelas biasa), perilaku SEKARANG (catat pelanggaran, tidak auto-lock/auto-submit, guru tinjau manual) **tidak berubah**.

## 6. Alur Data End-to-End

**Bikin set (Super Admin):** upload file+kunci opsional → `generate_bank_soal_questions` → draft di layar → tinjau/edit/pilih → simpan (`createExam`+`createQuestion`, status `draft`) → publish manual → langsung kelihatan ke semua siswa aktif.

**Kerjakan set bernama (Siswa):** buka Simulasi TKA → pilih mapel → sistem ambil semua `lms_exams` `exam_type='simulasi' AND subject=<mapel> AND status='published'` (bukan lagi lewat enrollment) → pilih 1 set → `ExamTaking` seperti biasa, skor PG langsung keluar di akhir (75 menit/30 soal).

**Kerjakan Remix (Siswa):** pilih mapel → klik Remix → `start_remix_attempt` bikin exam bayangan + salin soal acak → `start_exam_attempt` → `ExamTaking` sama seperti set bernama, siswa tidak sadar ini sesi sementara.

## 7. Penanganan Error

- Gemini gagal/timeout saat generate → tidak ada tulisan parsial, error jelas ke admin, tinggal ulangi.
- File terlalu besar/format tidak didukung → divalidasi di browser sebelum dikirim.
- AI cuma berhasil ekstrak soal lebih sedikit dari target → ditampilkan apa adanya, admin bisa publish dengan jumlah segitu atau upload tambahan.
- Remix diklik tapi mapel belum ada set published → pesan "belum tersedia" (pola empty-state yang sudah ada), bukan error teknis.
- Fullscreen API tidak didukung penuh (sebagian browser HP) → tetap bisa mengerjakan, cuma tanpa penguncian ketat — mengikuti pola toleran yang sudah ada di `ExamTaking.tsx` sekarang (`.catch(() => {})`), tidak memblokir siswa masuk ujian karena masalah teknis perangkat.

## 8. Rencana Pengujian

Mengikuti pola pengujian yang sudah dipakai sepanjang proyek LMS ini (lihat memory `project-lms-eduharapan-status`): data uji coba lewat service_role REST + akun simulasi (bukan akun asli), dihapus lagi setelah selesai.

- RPC generate: uji dengan contoh gambar/PDF soal asli, dengan & tanpa kunci jawaban; pastikan tidak ada tulisan ke DB sebelum "Simpan" ditekan.
- **Keamanan (prioritas tertinggi karena ini yang paling berisiko berubah):** set published kelihatan ke akun Siswa MANAPUN lintas rombel; set draft tidak kelihatan sama sekali; `correct_option` tetap tidak pernah bocor; akun Guru/Siswa DITOLAK saat mencoba memanggil RPC generate/simpan (cuma Super Admin boleh).
- Remix: soal acak berbeda tiap sesi baru, diambil dari gabungan semua set published di mapel itu, skor jalan sama seperti set biasa.
- Kunci fullscreen: uji manual — keluar fullscreen/pindah tab → layar terkunci → kembali fullscreen → lanjut → ulangi 3x → pastikan auto-submit.
- **Regresi ujian kelas biasa** (prioritas tinggi kedua, karena fungsi RLS inti ikut disentuh): setelah migrasi, uji ulang alur ujian kelas biasa dari awal (mulai→jawab→submit→guru monitor) sebelum dianggap selesai.
- Semua data uji dihapus di akhir.

## 9. Referensi

- [2026-07-17-lms-eduharapan-design.md](./2026-07-17-lms-eduharapan-design.md) — desain awal LMS, konvensi topologi/skema yang diikuti desain ini.
- `SMP-TAMHAR-LMS/src/components/ExamTaking.tsx`, `SimulasiTkaPage.tsx`, `UjianTab.tsx`, `AiQuestionGenerator.tsx` — komponen existing yang dipakai ulang/diubah.
- `SMP-TAMHAR-new/supabase/migrate_lms_ujian.sql`, `migrate_lms_simulasi_tka.sql`, `migrate_lms_ai_soal.sql` — skema & RPC existing yang jadi dasar desain ini.
- Durasi TKA SMP 2026 (75 menit/30 soal Matematika & Bahasa Indonesia; Bahasa Inggris & IPA direncanakan masuk 2027): [Kemendikdasmen Tetapkan Waktu TKA SMP 2026 Selama 75 Menit](https://www.babelinsight.id/waktu-tka-smp-kemendikdasmen), [TKA SD-SMP 2027 Bakal Tambah Mapel Ujian IPA dan Bahasa Inggris](https://www.kompas.com/edu/read/2026/05/21/142657571/tka-sd-smp-2027-bakal-tambah-mapel-ujian-ipa-dan-bahasa-inggris-benarkah).
