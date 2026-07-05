/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  Article, GalleryItem, Teacher, Uniform, VisionMission, 
  DocumentStructure, CashTransaction, FineTransaction, 
  NotificationItem, ActivityLog, SystemSettings, User 
} from './types';

export const INITIAL_SETTINGS: SystemSettings = {
  schoolName: 'SMP TAMAN HARAPAN BEKASI',
  slogan: 'Bermata Hati',
  address: 'Jl. Taman Harapan No. 12, Bekasi Barat, Kota Bekasi, Jawa Barat 17133',
  website: 'https://tamhar.sch.id',
  phone: '(021) 88965432',
  whatsapp: '081234567890',
  instagram: '@smptamhar.bekasi',
  facebook: 'SMP Taman Harapan Bekasi',
  ppdbStatus: 'Buka'
};

export const INITIAL_USERS: User[] = [
  {
    id: 'u-1',
    name: 'Heri Kiswanto, M.Pd',
    email: 'superadmin',
    role: 'Super Admin',
    status: 'Active',
    lastActive: 'Sekarang',
    password: 'superadmin123'
  },
  {
    id: 'u-2',
    name: 'Aditya Pratama (Ketua OSIS)',
    email: 'ketua.osis',
    role: 'Managerial OSIS',
    status: 'Active',
    lastActive: '5 menit lalu',
    password: 'ketuaosis123'
  },
  {
    id: 'u-3',
    name: 'Siti Rahmawati (Bendahara OSIS)',
    email: 'bendahara.osis',
    role: 'Managerial OSIS',
    status: 'Active',
    lastActive: '10 menit lalu',
    password: 'bendaharaosis123'
  },
  {
    id: 'u-4',
    name: 'Budi Santoso',
    email: 'budi.siswa',
    role: 'Normal User',
    status: 'Active',
    lastActive: '1 jam lalu',
    mustChangePassword: true,
    password: 'budi123'
  },
  {
    id: 'u-5',
    name: 'Drs. Bambang Wijaya (Guru Piket)',
    email: 'bambang.piket',
    role: 'Guru Piket',
    status: 'Active',
    lastActive: 'Baru saja',
    password: 'bambang123'
  },
  {
    id: 'u-5-guru',
    name: 'Dra. Elok Faiqoh (Guru)',
    email: 'elok.guru',
    role: 'Guru',
    status: 'Active',
    lastActive: '5 menit lalu',
    password: 'elok123'
  },
  {
    id: 'u-6',
    name: 'Hj. Endang Rahayu, M.Pd (Managerial Sekolah)',
    email: 'endang.sekolah',
    role: 'Managerial Sekolah',
    status: 'Active',
    lastActive: '30 menit lalu',
    password: 'endang123'
  }
];

export const INITIAL_VISION_MISSION: VisionMission = {
  profile: 'SMP TAMAN HARAPAN BEKASI adalah institusi pendidikan menengah pertama yang berkomitmen menghasilkan lulusan unggul secara akademis dan memiliki kepekaan sosial spiritual yang tinggi.',
  history: 'Didirikan sejak tahun 1995 di jantung kota Bekasi, SMP Taman Harapan terus berkembang menjadi sekolah rujukan dalam pembentukan karakter siswa yang berprestasi dan berlandaskan kearifan lokal berfokus pada kecerdasan emosional dan spiritual siswa.',
  vision: "Mewujudkan insan pembelajar yang beriman, berilmu, beramal sholeh, dan berakhlakul karimah, serta memiliki jiwa pemimpin yang berlandaskan Al-Qur'an dan As-Sunnah",
  mission: [
    'Membentuk Karakter Islami: Menanamkan nilai-nilai keimanan dan ketaqwaan kepada Allah SWT dalam seluruh aktivitas sehari-hari.',
    'Pengembangan Potensi Akademik: Membimbing dan memfasilitasi siswa agar menjadi generasi yang cerdas, kreatif, dan berprestasi.',
    'Mencetak Jiwa Kepemimpinan: Membina kemandirian, rasa percaya diri, dan jiwa kepemimpinan siswa dalam masa pencarian identitas diri.',
    'Pengamalan Ilmu: Mendorong siswa agar tidak hanya berilmu, tetapi juga mampu mengamalkannya dalam kehidupan bermasyarakat sesuai tuntunan agama.'
  ]
};

export const INITIAL_TEACHERS: Teacher[] = [
  {
    id: 't-1',
    name: 'Heri Kiswanto, M.Pd',
    subject: 'Matematika & Kepemimpinan',
    position: 'Kepala Sekolah',
    image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=150'
  },
  {
    id: 't-2',
    name: 'Dra. Endang Lestari',
    subject: 'Ilmu Pengetahuan Alam (IPA)',
    position: 'Wakil Kepala Sekolah & Bidang Humas',
    image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150'
  },
  {
    id: 't-3',
    name: 'Budi Hermawan, S.Kom',
    subject: 'Informatika & Prakarya',
    position: 'Pembina OSIS & Koordinator IT',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150'
  },
  {
    id: 't-4',
    name: 'Siti Nurhaliza, M.Pd',
    subject: 'Bahasa Inggris',
    position: 'Kepala Laboratorium Bahasa',
    image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=150'
  }
];

export const INITIAL_UNIFORMS: Uniform[] = [
  {
    id: 'un-1',
    name: 'Seragam Nasional (Biru Putih)',
    days: 'Senin - Selasa',
    description: 'Kemeja putih lengan pendek/panjang dengan dasi sekolah, dipadukan celana/rok biru tua. Dilengkapi ikat pinggang hitam dan sepatu hitam polos berkaos kaki putih.',
    image: 'https://images.unsplash.com/photo-1596495578065-6e0763fa1141?auto=format&fit=crop&q=80&w=300'
  },
  {
    id: 'un-2',
    name: 'Seragam Batik Khas Taman Harapan',
    days: 'Rabu',
    description: 'Kemeja batik dengan corak khas SMP Taman Harapan Bekasi bermotif daun kelor dan bunga melati, dipadukan celana/rok putih.',
    image: 'https://images.unsplash.com/photo-1601921004897-b7d582836990?auto=format&fit=crop&q=80&w=300'
  },
  {
    id: 'un-3',
    name: 'Seragam Pramuka Lengkap',
    days: 'Kamis',
    description: 'Kemeja cokelat muda berpangkat kepanduan lengkap dengan setangan leher merah putih, dipadukan celana/rok cokelat tua. Dilengkapi topi baret/boni.',
    image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&q=80&w=300'
  },
  {
    id: 'un-4',
    name: 'Seragam Identitas Muslim / Jumat',
    days: 'Jumat',
    description: 'Koko putih panjang berlogo Taman Harapan bagi putra, dipadukan celana panjang biru tua. Baju kurung putih panjang dengan jilbab putih bagi putri.',
    image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=300'
  },
  {
    id: 'un-5',
    name: 'Seragam Olahraga Sekolah',
    days: 'Hari Praktik Olahraga',
    description: 'Kaos polo bahan katun berpori yang nyaman menyerap keringat berwarna kuning-biru, dilengkapi celana training panjang berlogo SMP Taman Harapan.',
    image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=300'
  }
];

export const INITIAL_ARTICLES: Article[] = [
  {
    id: 'a-1',
    title: 'Penerimaan Peserta Didik Baru (PPDB) Tahun Pelajaran 2026/2027 Resmi Dibuka',
    category: 'Berita',
    excerpt: 'SMP Taman Harapan Bekasi kembali membuka jalur pendaftaran siswa baru untuk tahun ajaran 2026/2027 dengan kuota terbatas.',
    content: `<h3>Penerimaan Siswa Baru SMP Taman Harapan Bekasi</h3>
<p>SMP Taman Harapan Bekasi dengan bangga membuka <strong>Penerimaan Peserta Didik Baru (PPDB) Tahun Pelajaran 2026/2027</strong>. Menjadi salah satu sekolah rujukan berakreditasi A di Bekasi Barat, kami menawarkan pendidikan unggul yang mengedepankan pembentukan karakter <em>Bermata Hati</em>.</p>

<h4>Jalur Pendaftaran yang Tersedia</h4>
<p>Pendaftaran dibuka melalui tiga jalur utama:</p>
<ol>
  <li><strong>Jalur Prestasi</strong>: Bebas tes masuk bagi peraih juara minimal tingkat kota/kabupaten.</li>
  <li><strong>Jalur Reguler / Akademik</strong>: Berdasarkan seleksi rata-rata nilai rapor SD kelas 4-6 dan tes kompetensi dasar.</li>
  <li><strong>Jalur Afirmasi</strong>: Bantuan khusus bagi calon siswa berprestasi dari keluarga kurang mampu.</li>
</ol>

<h4>Mengapa Memilih Kami?</h4>
<table class="min-w-full border-collapse border border-slate-200 my-4 text-xs">
  <thead>
    <tr class="bg-slate-100">
      <th class="border border-slate-300 p-2">Fasilitas Unggulan</th>
      <th class="border border-slate-300 p-2">Program Unggulan</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td class="border border-slate-300 p-2">Laboratorium IT, Bahasa, dan IPA Lengkap</td>
      <td class="border border-slate-300 p-2">Program Pembiasaan Karakter Bermata Hati</td>
    </tr>
    <tr>
      <td class="border border-slate-300 p-2">Ruang Kelas Ber-AC & Multimedia Proyektor</td>
      <td class="border border-slate-300 p-2">Sistem ERP Belajar Mandiri Terintegrasi</td>
    </tr>
  </tbody>
</table>

<p>Segera daftarkan putra-putri Anda sebelum kuota terpenuhi. Silakan hubungi sekretariat PPDB di nomor WhatsApp <strong>081234567890</strong> atau datang langsung ke ruang panitia pendaftaran di kampus utama kami.</p>`,
    image: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&q=80&w=800',
    author: 'Panitia PPDB',
    date: '02 Juli 2026',
    viewsCount: 245
  },
  {
    id: 'a-2',
    title: 'Sabet Juara 1 Lomba Adiwiyata Tingkat Kota, Komitmen Sekolah Hijau Lestari',
    category: 'Prestasi',
    excerpt: 'Prestasi membanggakan kembali diraih SMP Taman Harapan Bekasi atas dedikasi menjaga kelestarian lingkungan sekolah.',
    content: `<h3>SMP Taman Harapan Raih Penghargaan Sekolah Adiwiyata Terbaik</h3>
<p>SMP Taman Harapan Bekasi dinobatkan sebagai <strong>Juara 1 Sekolah Adiwiyata Tingkat Kota Bekasi</strong> tahun 2026. Penghargaan ini diserahkan langsung oleh Kepala Dinas Lingkungan Hidup Kota Bekasi atas komitmen nyata seluruh warga sekolah dalam pemilahan sampah, pengelolaan energi bersih, dan pembuatan taman hidroponik.</p>
<h4>Apresiasi Kepala Sekolah</h4>
<p><em>"Pencapaian ini membuktikan bahwa visi 'Bermata Hati' tidak hanya berupa teori moral di kelas, melainkan tindakan nyata peduli bumi. Cinta lingkungan adalah bagian dari akhlak mulia siswa kami,"</em> tutur Kepala Sekolah.</p>
<p>Melalui OSIS, sekolah juga mengoperasikan bank sampah kreatif, di mana denda bagi pelanggar kebersihan diubah menjadi nilai saldo tabungan daur ulang. Inovasi ini mendapat nilai tertinggi pada penilaian akhir.</p>`,
    image: 'https://images.unsplash.com/photo-1426604966848-d7adac402bff?auto=format&fit=crop&q=80&w=800',
    author: 'Humas Sekolah',
    date: '28 Juni 2026',
    viewsCount: 189
  },
  {
    id: 'a-3',
    title: 'Pelatihan LDKS Pengurus OSIS Periode 2026/2027 Berjalan Lancar di Camp Sentul',
    category: 'OSIS',
    excerpt: 'Seluruh jajaran pengurus OSIS mengikuti Latihan Dasar Kepemimpinan untuk memantapkan disiplin dan program kerja baru.',
    content: `<h3>LDKS OSIS 2026: Membentuk Pemimpin Mandiri Bermata Hati</h3>
<p>Selama tiga hari berturut-turut, pengurus OSIS terpilih periode 2026/2027 melaksanakan LDKS di Sentul, Bogor. Kegiatan ini didesain khusus untuk menggembleng kemandirian, tanggung jawab, manajemen waktu, serta kepatuhan keuangan transparan dalam organisasi.</p>
<h4>Agenda Utama LDKS</h4>
<ul>
  <li>Penyusunan anggaran belanja transparan menggunakan sistem ERP Kas OSIS.</li>
  <li>Latihan fisik kedisiplinan baris-berbaris dipandu instruktur TNI.</li>
  <li>Materi khusus <strong>"Etika Kepemimpinan Bermata Hati"</strong> oleh Kepala Sekolah.</li>
</ul>
<p>Ketua OSIS terpilih, Aditya Pratama, bertekad memelopori transparansi kas bulanan yang dapat diakses langsung oleh seluruh siswa.</p>`,
    image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&q=80&w=800',
    author: 'Budi Hermawan (Pembina OSIS)',
    date: '15 Juni 2026',
    viewsCount: 312
  },
  {
    id: 'a-4',
    title: 'Gelar Karya Projek P5 Kurikulum Merdeka Usung Tema Kewirausahaan Kreatif',
    category: 'Kegiatan',
    excerpt: 'Siswa-siswi kelas VII dan VIII memamerkan aneka produk olahan pangan lokal dan hasta karya daur ulang bernilai jual.',
    content: `<h3>Festival Projek P5 Kurikulum Merdeka</h3>
<p>SMP Taman Harapan Bekasi menggelar Festival Karya Projek Penguatan Profil Pelajar Pancasila (P5) semester genap. Mengangkat tema <strong>Kewirausahaan Kreatif Berkelanjutan</strong>, siswa-siswi belajar memproduksi, memasarkan, hingga mencatat omset penjualan secara berkelompok.</p>
<p>Kegiatan ini dihadiri langsung oleh perwakilan Dinas Pendidikan Kota Bekasi dan pengawas sekolah yang memberikan apresiasi tinggi terhadap orisinalitas produk siswa.</p>`,
    image: 'https://images.unsplash.com/photo-1511556532299-8f662fc26c06?auto=format&fit=crop&q=80&w=800',
    author: 'Koordinator P5',
    date: '10 Juni 2026',
    viewsCount: 156
  }
];

export const INITIAL_GALLERY: GalleryItem[] = [
  {
    id: 'g-1',
    album: 'Gelar Karya P5 Kewirausahaan',
    type: 'Photo',
    url: 'https://images.unsplash.com/photo-1511556532299-8f662fc26c06?auto=format&fit=crop&q=80&w=400',
    caption: 'Stan pameran produk kewirausahaan siswa kelas VIII',
    date: '10 Juni 2026'
  },
  {
    id: 'g-2',
    album: 'LDKS OSIS Sentul',
    type: 'Photo',
    url: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&q=80&w=400',
    caption: 'Foto bersama pengurus OSIS terpilih dengan pembina',
    date: '15 Juni 2026'
  },
  {
    id: 'g-3',
    album: 'Sekolah Adiwiyata',
    type: 'Photo',
    url: 'https://images.unsplash.com/photo-1426604966848-d7adac402bff?auto=format&fit=crop&q=80&w=400',
    caption: 'Kebun hidroponik sekolah yang dikelola kader Adiwiyata',
    date: '28 Juni 2026'
  },
  {
    id: 'g-4',
    album: 'Dokumentasi Profil Kampus',
    type: 'Video',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-children-learning-at-school-42354-large.mp4',
    caption: 'Video profil resmi lingkungan belajar SMP Taman Harapan',
    date: '01 Juli 2026'
  }
];

export const INITIAL_CASH_TRANSACTIONS: CashTransaction[] = [
  {
    id: 'tx-c1',
    type: 'Masuk',
    amount: 1500000,
    description: 'Sisa kas kepengurusan OSIS periode sebelumnya',
    category: 'Lain-lain',
    date: '2026-06-01',
    author: 'Aditya Pratama'
  },
  {
    id: 'tx-c2',
    type: 'Masuk',
    amount: 850000,
    description: 'Penerimaan iuran wajib anggota OSIS bulan Juni',
    category: 'Iuran Bulanan',
    date: '2026-06-05',
    author: 'Siti Rahmawati'
  },
  {
    id: 'tx-c3',
    type: 'Keluar',
    amount: 450000,
    description: 'Pembelian konsumsi rapat koordinasi program kerja bulanan',
    category: 'Konsumsi',
    date: '2026-06-12',
    author: 'Siti Rahmawati'
  },
  {
    id: 'tx-c4',
    type: 'Masuk',
    amount: 3500000,
    description: 'Dana sponsor dari Koperasi Karyawan untuk LDKS',
    category: 'Sponsorship',
    date: '2026-06-14',
    author: 'Aditya Pratama'
  },
  {
    id: 'tx-c5',
    type: 'Keluar',
    amount: 2800000,
    description: 'Pembayaran transportasi sewa bus LDKS Bogor',
    category: 'Lain-lain',
    date: '2026-06-15',
    author: 'Siti Rahmawati'
  }
];

export const INITIAL_FINE_TRANSACTIONS: FineTransaction[] = [
  {
    id: 'tx-f1',
    type: 'Masuk',
    amount: 15000,
    description: 'Terlambat masuk sekolah upacara Senin',
    violator: 'Rian Hidayat',
    category: 'Keterlambatan',
    date: '2026-06-08',
    author: 'Aditya Pratama'
  },
  {
    id: 'tx-f2',
    type: 'Masuk',
    amount: 25000,
    description: 'Membuang sampah plastik tidak pada tempatnya',
    violator: 'Daffa Rizky',
    category: 'Kebersihan',
    date: '2026-06-09',
    author: 'Aditya Pratama'
  },
  {
    id: 'tx-f3',
    type: 'Masuk',
    amount: 10000,
    description: 'Tidak memakai topi saat upacara bendera wajib',
    violator: 'Lina Marlina',
    category: 'Atribut Tidak Lengkap',
    date: '2026-06-15',
    author: 'Aditya Pratama'
  },
  {
    id: 'tx-f4',
    type: 'Keluar',
    amount: 40000,
    description: 'Pembelian kantong sampah hitam besar (polybag) Adiwiyata',
    category: 'Pengeluaran Kegiatan',
    date: '2026-06-20',
    author: 'Siti Rahmawati'
  }
];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n-1',
    type: 'Akun Baru',
    title: 'Akun Pengurus Baru Dibuat',
    message: 'Akun untuk Normal User Budi Santoso telah sukses didaftarkan oleh Kepala Sekolah.',
    date: '03 Juli 2026, 09:00',
    read: false
  },
  {
    id: 'n-2',
    type: 'Artikel Baru',
    title: 'Artikel Berita Siap Tayang',
    message: 'Artikel "PPDB TP 2026/2027 Resmi Dibuka" berhasil disimpan dan dipublikasikan.',
    date: '02 Juli 2026, 11:30',
    read: true
  },
  {
    id: 'n-3',
    type: 'Kas Baru',
    title: 'Penerimaan Kas OSIS Masuk',
    message: 'Bendahara Siti Rahmawati menginput kas masuk sebesar Rp 3.500.000.',
    date: '14 Juni 2026, 14:00',
    read: true
  }
];

export const INITIAL_LOGS: ActivityLog[] = [
  {
    id: 'log-1',
    user: 'Heri Kiswanto, M.Pd',
    role: 'Super Admin',
    action: 'Login',
    details: 'Berhasil login ke Portal ERP SMP Taman Harapan.',
    timestamp: '2026-07-04 08:00'
  },
  {
    id: 'log-2',
    user: 'Siti Rahmawati',
    role: 'Managerial Admin',
    action: 'Tambah',
    details: 'Menambahkan kas masuk iuran bulanan Rp 850.000.',
    timestamp: '2026-07-04 08:10'
  }
];

export const TESTIMONIALS = [
  {
    name: 'Bpk. Ahmad Suhendar',
    role: 'Orang Tua Siswa (Andi Kelas VIII)',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=120',
    quote: 'Sejak bersekolah di SMP Taman Harapan, anak saya tidak hanya berprestasi di bidang matematika tetapi juga menunjukkan perilaku sopan, dewasa, dan memiliki empati keagamaan yang kuat sesuai slogan Bermata Hati.'
  },
  {
    name: 'Anisa Wardani',
    role: 'Alumni Angkatan 2024 (Kini di SMAN 1 Bekasi)',
    image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=120',
    quote: 'Pengalaman memimpin OSIS menggunakan portal ERP sekolah melatih saya cara mengelola keuangan transparan dan merancang kegiatan secara akuntabel. Ini sangat dihargai di lingkungan SMA unggulan.'
  }
];

export const INITIAL_COURSES = []; // keeping empty to bypass course compiler if needed, but we can structure Articles as courses if there is any hard compilation dependencies! Let's verify that.
