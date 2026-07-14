/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Article, GalleryItem, Teacher, Uniform, VisionMission,
  DocumentStructure, CashTransaction, FineTransaction,
  NotificationItem, ActivityLog, SystemSettings, ClassRosterEntry,
  TeachingScheduleDay, TeacherAttendanceRecord,
} from './types';
import { CONTACT_PHONE, CONTACT_WHATSAPP } from './constants';

export const INITIAL_SETTINGS: SystemSettings = {
  schoolName: 'SMP TAMAN HARAPAN BEKASI',
  slogan: 'Bermata Hati',
  address: 'Jl. Taman Harapan No. 12, Bekasi Barat, Kota Bekasi, Jawa Barat 17133',
  website: 'https://online.tamhar.sch.id/',
  phone: CONTACT_PHONE,
  whatsapp: CONTACT_WHATSAPP,
  instagram: 'https://www.instagram.com/smp_tamanharapan1/?hl=en',
  facebook: 'SMP Taman Harapan Bekasi',
  ppdbStatus: 'Buka'
};

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

export const UNIFORMS_DATA_VERSION = 2;

export const INITIAL_UNIFORMS: Uniform[] = [
  {
    id: 'un-1',
    name: 'Seragam Senin',
    days: 'Seragam Senin',
    description: 'Kemeja abu-abu lengan pendek/panjang dengan dasi sekolah, dipadukan celana/rok abu-abu. Dilengkapi ikat pinggang dan sepatu hitam polos berkaos kaki putih.',
    image: '/uniforms/senin.png',
  },
  {
    id: 'un-2',
    name: 'Seragam Selasa',
    days: 'Seragam Selasa',
    description: 'Kemeja putih lengan pendek/panjang dengan dasi sekolah, dipadukan celana/rok biru tua. Dilengkapi ikat pinggang hitam dan sepatu hitam polos berkaos kaki putih.',
    image: '/uniforms/selasa.png',
  },
  {
    id: 'un-3',
    name: 'Seragam Rabu',
    days: 'Seragam Rabu',
    description: 'Kemeja khaki lengkap atribut kepanduan dengan dasi merah putih, dipadukan celana/rok cokelat. Dilengkapi lencana sekolah dan atribut pramuka.',
    image: '/uniforms/rabu.png',
  },
  {
    id: 'un-4',
    name: 'Seragam Kamis',
    days: 'Seragam Kamis',
    description: 'Kemeja batik hijau bermotif khas SMP Taman Harapan Bekasi, dipadukan celana abu-abu atau rok putih. Dilengkapi sepatu hitam polos.',
    image: '/uniforms/kamis.png',
  },
  {
    id: 'un-5',
    name: 'Seragam Jumat',
    days: "Seragam Jum'at",
    description: 'Kemeja biru muda lengkap dengan peci putih bagi putra, kemeja biru muda dan jilbab putih bagi putri. Dilengkapi celana/rok biru tua.',
    image: '/uniforms/jumat.png',
  },
  {
    id: 'un-6',
    name: 'Olahraga',
    days: 'Olahraga',
    description: 'Kaos olahraga biru sekolah yang nyaman menyerap keringat, dilengkapi celana training panjang berlogo SMP Taman Harapan.',
    image: '/uniforms/olahraga.png',
  },
];

export const INITIAL_ARTICLES: Article[] = [
  {
    id: 'art-1783340340003',
    title: 'Sertijab OSIS Tandai Estafet Kepemimpinan Organisasi',
    category: 'Kegiatan',
    excerpt: 'Sertijab OSIS SMP TAMAN HARAPAN BEKASI menjadi momentum pergantian kepengurusan sekaligus awal kepemimpinan baru yang penuh semangat.',
    content: 'Bekasi, 27 April 2026 – SMP TAMAN HARAPAN BEKASI melaksanakan kegiatan Serah Terima Jabatan (Sertijab) OSIS sebagai simbol berakhirnya masa bakti kepengurusan sebelumnya dan dimulainya kepengurusan yang baru.\nProsesi sertijab berlangsung dengan tertib dan khidmat, disaksikan oleh guru pembina, peserta didik, serta seluruh pengurus OSIS. Kegiatan ini menjadi bentuk penghargaan atas dedikasi pengurus sebelumnya sekaligus amanah bagi pengurus yang baru.\nMelalui pergantian kepengurusan ini, diharapkan program-program OSIS dapat terus berkembang dan memberikan manfaat bagi seluruh warga sekolah.\nSMP TAMAN HARAPAN BEKASI berharap kepengurusan yang baru mampu menjalankan tugas dengan penuh tanggung jawab, inovasi, dan semangat melayani.',
    image: 'https://lh3.googleusercontent.com/d/1O3HULWZdBxUwWb75sSsAGT-Zl96mQkCM',
    author: 'Tristian Novansyah, S.Kom',
    date: '6/7/2026',
    viewsCount: 0
  },
  {
    id: 'art-1783340172518',
    title: 'English Got Talent Tampilkan Bakat dan Kepercayaan Diri Peserta Didik',
    category: 'Kegiatan',
    excerpt: 'English Got Talent menjadi wadah bagi peserta didik SMP TAMAN HARAPAN BEKASI untuk menunjukkan kemampuan berbahasa Inggris secara kreatif dan percaya diri.',
    content: 'Bekasi, 25 April 2026 – SMP TAMAN HARAPAN BEKASI mengadakan kegiatan English Got Talent sebagai ajang bagi peserta didik untuk mengembangkan kemampuan berbahasa Inggris melalui berbagai penampilan kreatif.\nBerbagai pertunjukan seperti pidato, storytelling, drama, puisi, hingga penampilan lainnya disajikan dengan penuh percaya diri oleh para peserta. Kegiatan ini tidak hanya melatih kemampuan berbahasa Inggris, tetapi juga meningkatkan keberanian tampil di depan umum.\nSuasana acara berlangsung meriah dengan dukungan dari guru dan seluruh peserta didik yang memberikan apresiasi kepada setiap penampilan.\nMelalui kegiatan ini, sekolah berharap peserta didik semakin termotivasi untuk meningkatkan kemampuan berbahasa Inggris sekaligus mengembangkan bakat dan kreativitas yang dimiliki.',
    image: 'https://lh3.googleusercontent.com/d/1QrrRj5sVBrogjx34uqGpj8r1nzr9iDmQ',
    author: 'Tristian Novansyah, S.Kom',
    date: '6/7/2026',
    viewsCount: 0
  },
  {
    id: 'art-1783339662804',
    title: 'LDKO Membentuk Jiwa Kepemimpinan dan Karakter Peserta Didik',
    category: 'Kegiatan',
    excerpt: 'LDKO SMP TAMAN HARAPAN BEKASI menjadi sarana pembentukan karakter, kepemimpinan, dan kerja sama bagi peserta didik.',
    content: 'Bekasi, 18 April 2026 – SMP TAMAN HARAPAN BEKASI menyelenggarakan Latihan Dasar Kepemimpinan Organisasi (LDKO) sebagai upaya membentuk peserta didik yang memiliki jiwa kepemimpinan, tanggung jawab, serta kemampuan bekerja sama dalam organisasi.\nSelama kegiatan berlangsung, peserta mengikuti berbagai materi dan aktivitas yang dirancang untuk meningkatkan kemampuan komunikasi, kepemimpinan, kedisiplinan, serta penyelesaian masalah secara bersama-sama.\nLDKO juga menjadi kesempatan bagi peserta untuk memahami pentingnya kerja sama, integritas, dan sikap saling menghargai dalam menjalankan organisasi.\nMelalui kegiatan ini, diharapkan lahir generasi muda yang mampu menjadi pemimpin yang berkarakter, bertanggung jawab, serta siap memberikan kontribusi positif bagi sekolah dan masyarakat.',
    image: 'https://lh3.googleusercontent.com/d/1xMADAWMBbjOLntZl30gPdBlhpFdr4qRx',
    author: 'Tristian Novansyah, S.Kom',
    date: '6/7/2026',
    viewsCount: 0
  },
  {
    id: 'art-1783339293495',
    title: 'Surprise Milad Hadirkan Momen Kebersamaan dan Penuh Sukacita',
    category: 'Kegiatan',
    excerpt: 'Kegiatan Surprise Milad di SMP TAMAN HARAPAN BEKASI berlangsung meriah sebagai bentuk apresiasi dan kebersamaan dalam memperingati hari jadi sekolah.',
    content: 'Bekasi, 13 April 2026 – SMP TAMAN HARAPAN BEKASI mengadakan kegiatan Surprise Milad sebagai bagian dari rangkaian peringatan hari jadi sekolah. Kegiatan ini menjadi momen yang penuh kebahagiaan sekaligus mempererat rasa kekeluargaan di lingkungan sekolah.\nBerbagai kejutan dan rangkaian acara disiapkan untuk memeriahkan peringatan milad. Seluruh peserta didik, guru, serta tenaga kependidikan mengikuti kegiatan dengan penuh antusias dan semangat kebersamaan.\nMelalui kegiatan ini, sekolah berharap seluruh warga sekolah semakin memiliki rasa bangga, kepedulian, dan kebersamaan dalam menjaga nama baik serta terus mendukung kemajuan SMP TAMAN HARAPAN BEKASI.\nSemangat kekeluargaan yang tercipta diharapkan menjadi motivasi untuk terus berkarya, berprestasi, dan memberikan kontribusi positif bagi sekolah.',
    image: 'https://lh3.googleusercontent.com/d/1y8KhurFQh0LQW1Mpno1pm4zuCDFPpewW',
    author: 'Tristian Novansyah, S.Kom',
    date: '6/7/2026',
    viewsCount: 0
  },
  {
    id: 'art-1783336916772',
    title: 'Kegiatan Berbagi Takjil Wujud Kepedulian dan Kebersamaan',
    category: 'Kegiatan',
    excerpt: 'Kegiatan berbagi takjil di SMP TAMAN HARAPAN BEKASI menjadi bentuk kepedulian sosial sekaligus menumbuhkan semangat berbagi di bulan Ramadan.',
    content: 'Bekasi, 5 Maret 2026 – Dalam suasana bulan suci Ramadan, SMP TAMAN HARAPAN BEKASI melaksanakan kegiatan berbagi takjil sebagai bentuk kepedulian sosial kepada masyarakat sekitar.\nKegiatan ini melibatkan peserta didik, guru, serta pengurus OSIS yang bersama-sama membagikan paket takjil kepada masyarakat. Selain mempererat kebersamaan, kegiatan ini juga mengajarkan pentingnya berbagi, peduli terhadap sesama, serta menanamkan nilai-nilai empati.\nPeserta didik mengikuti kegiatan dengan penuh semangat dan antusias. Melalui pengalaman tersebut, mereka belajar bahwa sekecil apa pun bentuk kebaikan akan memberikan manfaat bagi orang lain.\nSMP TAMAN HARAPAN BEKASI berharap kegiatan berbagi takjil dapat menjadi kebiasaan positif yang terus menumbuhkan karakter peduli, ikhlas, dan saling membantu di lingkungan sekolah maupun masyarakat.',
    image: 'https://lh3.googleusercontent.com/d/1jAzCAugu5eS0wTLgdM2QgdwCM3oU-a_a',
    author: 'Tristian Novansyah, S.Kom',
    date: '6/7/2026',
    viewsCount: 0
  },
  {
    id: 'art-1783336779875',
    title: 'Starfest Tampilkan Kreativitas dan Potensi Peserta Didik',
    category: 'Kegiatan',
    excerpt: 'Starfest menjadi ajang bagi peserta didik SMP TAMAN HARAPAN BEKASI untuk menampilkan kreativitas, bakat, dan potensi terbaiknya.',
    content: 'Bekasi, 6–8 Februari 2026 – SMP TAMAN HARAPAN BEKASI menyelenggarakan Starfest sebagai wadah bagi peserta didik untuk mengekspresikan kreativitas, bakat, dan kemampuan di berbagai bidang.\nSelama kegiatan berlangsung, berbagai penampilan dan aktivitas kreatif ditampilkan dengan penuh percaya diri dan antusiasme. Starfest menjadi momentum bagi peserta didik untuk menunjukkan hasil karya sekaligus mengembangkan kemampuan yang dimiliki di luar kegiatan akademik.\nSuasana kegiatan berlangsung meriah dengan dukungan dari guru, peserta didik, serta seluruh warga sekolah yang turut memberikan apresiasi terhadap setiap penampilan.\nMelalui Starfest, sekolah berharap peserta didik semakin termotivasi untuk terus mengembangkan bakat, meningkatkan rasa percaya diri, serta berani menunjukkan potensi terbaiknya.',
    image: 'https://lh3.googleusercontent.com/d/1JbypDTJwhvnfa-8MVM05gqpsOJmmUMZ1',
    author: 'Tristian Novansyah, S.Kom',
    date: '6/7/2026',
    viewsCount: 0
  },
  {
    id: 'art-1783336590571',
    title: 'Pemilihan Ketua OSIS Berlangsung Demokratis dan Tertib',
    category: 'Kegiatan',
    excerpt: 'Pemilihan Ketua OSIS SMP TAMAN HARAPAN BEKASI berlangsung secara demokratis sebagai sarana pembelajaran kepemimpinan dan tanggung jawab.',
    content: 'Bekasi, 3 Februari 2026 – SMP TAMAN HARAPAN BEKASI melaksanakan Pemilihan Ketua OSIS sebagai bentuk pembelajaran demokrasi bagi seluruh peserta didik. Kegiatan ini menjadi momentum penting untuk memilih pemimpin yang akan menjalankan berbagai program organisasi di lingkungan sekolah.\nSeluruh peserta didik menggunakan hak pilihnya dengan tertib dan penuh tanggung jawab. Proses pemungutan suara berlangsung lancar dengan tetap menjunjung tinggi prinsip kejujuran, keadilan, dan sportivitas.\nMelalui kegiatan ini, peserta didik tidak hanya belajar mengenai proses pemilihan pemimpin, tetapi juga memahami pentingnya partisipasi aktif dalam kehidupan organisasi serta menghargai setiap hasil keputusan bersama.\nDiharapkan kepengurusan OSIS yang baru mampu menjalankan amanah dengan baik serta menghadirkan berbagai program yang bermanfaat bagi seluruh warga sekolah.',
    image: 'https://lh3.googleusercontent.com/d/1KN8XWp6nIUduN7FG7YfcsWcq1LjI-jIe',
    author: 'Tristian Novansyah, S.Kom',
    date: '6/7/2026',
    viewsCount: 0
  },
  {
    id: 'art-1783335829373',
    title: 'Debat Calon Ketua OSIS Menjadi Ajang Penyampaian Visi dan Misi',
    category: 'Kegiatan',
    excerpt: 'Debat Calon Ketua OSIS SMP TAMAN HARAPAN BEKASI menjadi wadah bagi para kandidat untuk menyampaikan visi, misi, dan program kerja secara terbuka.',
    content: 'Bekasi, 2 Februari 2026 – SMP TAMAN HARAPAN BEKASI menyelenggarakan kegiatan Debat Calon Ketua OSIS sebagai bagian dari rangkaian proses pemilihan pengurus OSIS periode berikutnya. Kegiatan ini bertujuan memberikan kesempatan kepada seluruh calon ketua OSIS untuk menyampaikan visi, misi, serta program kerja yang akan dijalankan apabila terpilih.\nDebat berlangsung dengan tertib dan penuh semangat. Para kandidat memaparkan gagasan mereka mengenai pengembangan organisasi, peningkatan kualitas kegiatan sekolah, serta upaya membangun lingkungan sekolah yang lebih aktif, kreatif, dan berprestasi. Peserta didik yang hadir juga diberikan kesempatan untuk menyampaikan pertanyaan kepada para kandidat sehingga tercipta komunikasi yang terbuka dan edukatif.\nMelalui kegiatan ini, peserta didik belajar mengenai pentingnya menyampaikan pendapat dengan baik, menghargai perbedaan pandangan, serta menerapkan nilai-nilai demokrasi dalam kehidupan sekolah.\nSMP TAMAN HARAPAN BEKASI berharap kegiatan debat ini dapat melahirkan pemimpin yang bertanggung jawab, berintegritas, serta mampu membawa organisasi OSIS menjadi lebih baik.',
    image: 'https://lh3.googleusercontent.com/d/1GLKMWBhMpeUF5lt2cxA0DjuH8c_PRXOu',
    author: 'Tristian Novansyah, S.Kom',
    date: '6/7/2026',
    viewsCount: 0
  },
  {
    id: 'art-1783335574046',
    title: 'Classmeet Semester Ganjil Berlangsung Seru dan Sportif',
    category: 'Kegiatan',
    excerpt: 'Classmeet Semester Ganjil SMP TAMAN HARAPAN BEKASI menjadi ajang pengembangan bakat, sportivitas, dan kebersamaan antar peserta didik.',
    content: 'Bekasi, 12–15 Desember 2025 – Setelah menyelesaikan kegiatan Penilaian Akhir Semester, SMP TAMAN HARAPAN BEKASI mengadakan Classmeet sebagai sarana mempererat kebersamaan sekaligus mengembangkan bakat dan minat peserta didik.\nBerbagai perlombaan dan pertandingan antar kelas diselenggarakan dengan menjunjung tinggi nilai sportivitas, kerja sama, serta saling menghargai. Kegiatan ini disambut antusias oleh seluruh peserta didik.\nSelain menjadi ajang hiburan setelah masa ujian, Classmeet juga menjadi wadah bagi siswa untuk menunjukkan kreativitas, kemampuan, serta mempererat hubungan antarkelas.\nMelalui kegiatan ini, sekolah berharap peserta didik dapat terus mengembangkan potensi sekaligus menjaga semangat kebersamaan di lingkungan sekolah.',
    image: 'https://lh3.googleusercontent.com/d/1Ari6DGmRn1qHhBCUoFyWWBiBFgGVLlV5',
    author: 'Tristian Novansyah, S.Kom',
    date: '6/7/2026',
    viewsCount: 0
  },
  {
    id: 'art-1783335377311',
    title: 'Fun Learning Hadirkan Pengalaman Belajar yang Menyenangkan',
    category: 'Kegiatan',
    excerpt: 'Fun Learning di SMP TAMAN HARAPAN BEKASI menghadirkan pengalaman belajar yang kreatif, interaktif, dan menyenangkan bagi peserta didik.',
    content: 'Bekasi, 27 November 2025 – SMP TAMAN HARAPAN BEKASI menyelenggarakan kegiatan Fun Learning sebagai upaya menciptakan pengalaman belajar yang lebih interaktif, kreatif, dan menyenangkan bagi peserta didik.\nMelalui berbagai aktivitas edukatif, peserta didik diajak belajar dengan cara yang berbeda sehingga mampu meningkatkan semangat belajar, kreativitas, kemampuan berpikir kritis, serta kerja sama antarteman.\nKegiatan berlangsung dengan penuh antusiasme dan memberikan suasana belajar yang lebih segar tanpa mengurangi nilai-nilai pendidikan yang ingin dicapai.\nDiharapkan kegiatan ini dapat meningkatkan motivasi peserta didik untuk terus belajar dan mengembangkan potensi yang dimiliki.',
    image: 'https://lh3.googleusercontent.com/d/1r_JD-UPH03l1Hho5jqNaF7RJgyukH2XB',
    author: 'Tristian Novansyah, S.Kom',
    date: '6/7/2026',
    viewsCount: 0
  },
  {
    id: 'art-1783335250980',
    title: 'Peringatan Hari Sumpah Pemuda Bangkitkan Semangat Persatuan',
    category: 'Kegiatan',
    excerpt: 'Peringatan Hari Sumpah Pemuda di SMP TAMAN HARAPAN BEKASI menanamkan semangat persatuan, nasionalisme, dan kepedulian terhadap bangsa.',
    content: 'Bekasi, 3 November 2025 – SMP TAMAN HARAPAN BEKASI memperingati Hari Sumpah Pemuda sebagai bentuk penghormatan terhadap perjuangan para pemuda Indonesia dalam mewujudkan persatuan bangsa.\nMelalui kegiatan yang diselenggarakan, peserta didik diajak memahami makna Sumpah Pemuda serta pentingnya menjaga persatuan di tengah keberagaman. Semangat kebangsaan dan cinta tanah air menjadi nilai utama yang ditanamkan kepada seluruh peserta didik.\nSekolah berharap peringatan ini mampu memotivasi generasi muda untuk terus berkarya, berprestasi, dan memberikan kontribusi positif bagi masyarakat.',
    image: 'https://lh3.googleusercontent.com/d/1-A13hAuiZZVwyfECc5DvHRSJfXUXWos7',
    author: 'Tristian Novansyah, S.Kom',
    date: '6/7/2026',
    viewsCount: 0
  },
  {
    id: 'art-1783334613109',
    title: 'Peringatan Maulid Nabi Muhammad SAW Berlangsung Khidmat dan Penuh Makna',
    category: 'Kegiatan',
    excerpt: 'Peringatan Maulid Nabi Muhammad SAW di SMP TAMAN HARAPAN BEKASI menjadi momentum memperkuat karakter religius dan meneladani akhlak Rasulullah SAW.',
    content: 'Bekasi, 8 September 2025 – SMP TAMAN HARAPAN BEKASI memperingati Maulid Nabi Muhammad SAW sebagai momentum untuk meningkatkan keimanan, ketakwaan, serta meneladani akhlak mulia Rasulullah SAW.\nMelalui rangkaian kegiatan keagamaan, peserta didik diajak memahami nilai-nilai keteladanan Rasulullah, seperti kejujuran, kedisiplinan, tanggung jawab, dan kepedulian terhadap sesama. Kegiatan berlangsung dengan suasana yang khidmat dan penuh kekeluargaan.\nPeringatan Maulid Nabi ini menjadi salah satu upaya sekolah dalam memperkuat pendidikan karakter dan nilai-nilai spiritual di lingkungan sekolah.\nSemoga melalui kegiatan ini seluruh warga sekolah dapat terus mengamalkan nilai-nilai kebaikan dalam kehidupan sehari-hari.',
    image: 'https://lh3.googleusercontent.com/d/141g4hXdFjGvcJfe2W9jYH3O1rr_u0kFH',
    author: 'Tristian Novansyah, S.Kom',
    date: '6/7/2026',
    viewsCount: 0
  },
  {
    id: 'art-1783333806590',
    title: 'Lomba 17 Agustus Berlangsung Meriah, Tanamkan Semangat Nasionalisme',
    category: 'Kegiatan',
    excerpt: 'Lomba 17 Agustus di SMP TAMAN HARAPAN BEKASI berlangsung meriah sebagai bentuk peringatan HUT RI sekaligus menumbuhkan semangat nasionalisme dan kebersamaan.',
    content: 'Bekasi, 13–14 Agustus 2025 – Dalam rangka memperingati Hari Ulang Tahun ke-80 Republik Indonesia, SMP TAMAN HARAPAN BEKASI menyelenggarakan berbagai perlombaan yang diikuti oleh peserta didik dengan penuh semangat dan antusias. Kegiatan ini menjadi salah satu agenda tahunan sekolah untuk menumbuhkan rasa cinta tanah air sekaligus mempererat kebersamaan antarwarga sekolah.\nBeragam perlombaan yang mengutamakan kerja sama, sportivitas, serta kreativitas diselenggarakan selama dua hari. Seluruh peserta mengikuti setiap kegiatan dengan semangat kompetisi yang sehat dan tetap menjunjung tinggi nilai-nilai kebersamaan.\nSelain menjadi ajang hiburan, kegiatan ini juga bertujuan menanamkan semangat nasionalisme, memperkuat persatuan, serta melatih rasa tanggung jawab dan percaya diri peserta didik. Suasana sekolah dipenuhi keceriaan yang mencerminkan semangat kemerdekaan Indonesia.\nMelalui kegiatan ini, SMP TAMAN HARAPAN BEKASI berharap peserta didik dapat semakin menghargai perjuangan para pahlawan serta menerapkan nilai-nilai persatuan dan gotong royong dalam kehidupan sehari-hari.',
    image: 'https://lh3.googleusercontent.com/d/1ZNXCYEjiH3OtZmCReqyRctZ7DkiiYC4g',
    author: 'Tristian Novansyah, S.Kom',
    date: '6/7/2026',
    viewsCount: 0
  },
  {
    id: 'art-1783332292350',
    title: 'MPLS SMP TAMAN HARAPAN BEKASI Tahun Ajaran 2025/2026 Berlangsung Meriah dan Inspiratif',
    category: 'Kegiatan',
    excerpt: 'Melalui MPLS Tahun Ajaran 2025/2026, SMP TAMAN HARAPAN BEKASI menyambut peserta didik baru dengan berbagai kegiatan edukatif yang membangun karakter, kebersamaan, dan semangat belajar.',
    content: 'Bekasi, 14–18 Juli 2025 – SMP TAMAN HARAPAN BEKASI sukses menyelenggarakan kegiatan Masa Pengenalan Lingkungan Sekolah (MPLS) bagi peserta didik baru Tahun Ajaran 2025/2026. Kegiatan yang berlangsung selama lima hari ini menjadi langkah awal bagi siswa untuk mengenal lingkungan sekolah, membangun semangat belajar, serta menumbuhkan karakter positif sebagai bagian dari keluarga besar SMP TAMAN HARAPAN BEKASI.\n\nSelama pelaksanaan MPLS, para peserta mengikuti berbagai rangkaian kegiatan yang edukatif, interaktif, dan menyenangkan. Mereka diperkenalkan dengan visi dan misi sekolah, tata tertib, budaya sekolah, fasilitas belajar, serta program-program unggulan yang akan mendukung proses pendidikan selama menempuh jenjang sekolah menengah pertama.\n\nSelain mendapatkan pengenalan mengenai lingkungan sekolah, peserta didik juga mengikuti berbagai kegiatan yang bertujuan menumbuhkan rasa percaya diri, kedisiplinan, tanggung jawab, kerja sama, serta sikap saling menghormati. Dengan suasana yang penuh semangat dan kebersamaan, para siswa baru diajak untuk beradaptasi dengan lingkungan belajar yang aman, nyaman, dan kondusif.\n\nSeluruh rangkaian kegiatan MPLS dilaksanakan dengan mengedepankan nilai-nilai pendidikan karakter, sehingga tidak hanya memberikan informasi mengenai kehidupan sekolah, tetapi juga membentuk peserta didik yang berakhlak mulia, disiplin, mandiri, dan siap menghadapi tantangan pembelajaran di masa mendatang.\n\nMelalui kegiatan ini, SMP TAMAN HARAPAN BEKASI berharap seluruh peserta didik baru dapat memulai perjalanan pendidikannya dengan penuh semangat, percaya diri, dan motivasi untuk terus belajar, berprestasi, serta aktif dalam berbagai kegiatan akademik maupun nonakademik.\n\nSelamat datang kepada seluruh peserta didik baru di keluarga besar SMP TAMAN HARAPAN BEKASI. Mari bersama-sama menciptakan lingkungan belajar yang positif, berprestasi, dan penuh semangat untuk meraih masa depan yang gemilang.',
    image: 'https://lh3.googleusercontent.com/d/1eDZowq3gj_Y8eF7aAZ12_B8ye4Szqq7i',
    author: 'Tristian Novansyah, S.Kom',
    date: '6/7/2026',
    viewsCount: 0
  },
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
    author: 'Aditya Pratama',
    status: 'Belum Lunas'
  },
  {
    id: 'tx-f2',
    type: 'Masuk',
    amount: 25000,
    description: 'Membuang sampah plastik tidak pada tempatnya',
    violator: 'Daffa Rizky',
    category: 'Kebersihan',
    date: '2026-06-09',
    author: 'Aditya Pratama',
    status: 'Belum Lunas'
  },
  {
    id: 'tx-f3',
    type: 'Masuk',
    amount: 10000,
    description: 'Tidak memakai topi saat upacara bendera wajib',
    violator: 'Lina Marlina',
    category: 'Atribut Tidak Lengkap',
    date: '2026-06-15',
    author: 'Aditya Pratama',
    status: 'Belum Lunas'
  },
  {
    id: 'tx-f4',
    type: 'Keluar',
    amount: 40000,
    description: 'Pembelian kantong sampah hitam besar (polybag) Adiwiyata',
    category: 'Pengeluaran Kegiatan',
    date: '2026-06-20',
    author: 'Siti Rahmawati',
    status: 'Lunas'
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
    user: 'Tristian Novansyah, S.Kom',
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

// Kosong secara sengaja — data murid asli (nama & gender per kelas) TIDAK
// pernah ditaruh di source code (lihat catatan privasi di
// private-student-data/), jadi default lokal/offline ini cuma placeholder
// sampai admin mengisinya lewat dashboard atau Supabase diisi manual.
export const INITIAL_CLASS_ROSTER: ClassRosterEntry[] = [];

// Jadwal Mengajar (KBM) T1 2026/2027 — diresolusi dari kode guru di
// dokumen "PEMBAGIAN TUGAS GURU 2627 - T1-Sementara" ke nama asli, supaya
// tampilan dashboard langsung menunjukkan nama guru, bukan kode mentah.
// Kode 21/22/23 ("IPA 1"/"B. Inggris 1"/"Native Speaker") adalah slot
// mengajar cadangan/bilingual yang belum diisi guru tetap, bukan nama orang.
export const INITIAL_TEACHING_SCHEDULE: TeachingScheduleDay[] = [
  {
    "day": "Senin",
    "piketTeacher": "Ahmad Sulthoni Alkhoir, S.Si",
    "slots": [
      {
        "period": "pagi",
        "time": "06.45 - 07.40",
        "activity": "Tadarus Al Quran - Upacara / Pembinaan Kelas"
      },
      {
        "period": "1",
        "time": "07.40 - 08.15",
        "classes": {
          "7A": "Ust. Ahmad Zen Syukrillah",
          "8A": "Fitri Khoiriyah, S.Pd.I",
          "8B": "Tristian Novansyah, S.Kom",
          "9A": "Febriantika Putri Pangesti, S.Pd",
          "9B": "Shinta Handayani, S.Pd",
          "7B": "Admiri, S.Ag",
          "8C": "Abdul Rosyid, S.Pd.I",
          "9C": "Dra. Hj. Sudarti"
        }
      },
      {
        "period": "2",
        "time": "08.15 - 08.50",
        "classes": {
          "7A": "Ust. Ahmad Zen Syukrillah",
          "8A": "Fitri Khoiriyah, S.Pd.I",
          "8B": "Hj. Siti Wahyuni",
          "9A": "Febriantika Putri Pangesti, S.Pd",
          "9B": "Shinta Handayani, S.Pd",
          "7B": "Admiri, S.Ag",
          "8C": "Abdul Rosyid, S.Pd.I",
          "9C": "Dra. Hj. Sudarti"
        }
      },
      {
        "period": "3",
        "time": "08.50 - 09.25",
        "classes": {
          "7A": "Admiri, S.Ag",
          "8A": "Febriantika Putri Pangesti, S.Pd",
          "8B": "Hj. Siti Wahyuni",
          "9A": "Tristian Novansyah, S.Kom",
          "9B": "Ida Farida, S.Pd",
          "7B": "Shinta Handayani, S.Pd",
          "8C": "Fitri Khoiriyah, S.Pd.I",
          "9C": "Mugi Raharjo, SE"
        }
      },
      {
        "period": "4",
        "time": "09.25 - 10.00",
        "classes": {
          "7A": "Admiri, S.Ag",
          "8A": "Febriantika Putri Pangesti, S.Pd",
          "8B": "Abdul Rosyid, S.Pd.I",
          "9A": "Tristian Novansyah, S.Kom",
          "9B": "Ida Farida, S.Pd",
          "7B": "Shinta Handayani, S.Pd",
          "8C": "Fitri Khoiriyah, S.Pd.I",
          "9C": "Mugi Raharjo, SE"
        }
      },
      {
        "period": "dhuha",
        "time": "10.00 - 10.25",
        "activity": "Sholat Dhuha"
      },
      {
        "period": "rest1",
        "time": "10.25 - 10.55",
        "activity": "Istirahat 1"
      },
      {
        "period": "5",
        "time": "10.55 - 11.30",
        "classes": {
          "7A": "Ida Farida, S.Pd",
          "8A": "Tristian Novansyah, S.Kom",
          "8B": "Admiri, S.Ag",
          "9A": "Farhan Perdana, S.Pd",
          "9B": "Dra. Hj. Sudarti",
          "7B": "Abdul Rosyid, S.Pd.I",
          "8C": "Shinta Handayani, S.Pd",
          "9C": "Fitri Khoiriyah, S.Pd.I"
        }
      },
      {
        "period": "6",
        "time": "11.30 - 12.05",
        "classes": {
          "7A": "Ida Farida, S.Pd",
          "8A": "Admiri, S.Ag",
          "8B": "Mugi Raharjo, SE",
          "9A": "Farhan Perdana, S.Pd",
          "9B": "Febriantika Putri Pangesti, S.Pd",
          "7B": "Abdul Rosyid, S.Pd.I",
          "8C": "Shinta Handayani, S.Pd",
          "9C": "Tristian Novansyah, S.Kom"
        }
      },
      {
        "period": "7",
        "time": "12.05 - 12.40",
        "classes": {
          "7A": "Dra. Hj. Sudarti",
          "8A": "Admiri, S.Ag",
          "8B": "Mugi Raharjo, SE",
          "9A": "Fitri Khoiriyah, S.Pd.I",
          "9B": "Febriantika Putri Pangesti, S.Pd",
          "7B": "Guru B. Inggris (Cadangan)",
          "8C": "Tristian Novansyah, S.Kom",
          "9C": "Ida Farida, S.Pd"
        }
      },
      {
        "period": "dzuhur",
        "time": "12.40 - 13.30",
        "activity": "Sholat Dzuhur Berjamaah Kloter 2 - Murajaah - TBA - Istirahat 2"
      },
      {
        "period": "8",
        "time": "13.30 - 14.10",
        "classes": {
          "7A": "Mugi Raharjo, SE",
          "8A": "Abdul Rosyid, S.Pd.I",
          "8B": "Farhan Perdana, S.Pd",
          "9A": "Shinta Handayani, S.Pd",
          "9B": "Admiri, S.Ag",
          "7B": "Guru B. Inggris (Cadangan)",
          "8C": "Tristian Novansyah, S.Kom",
          "9C": "Ida Farida, S.Pd"
        }
      },
      {
        "period": "9",
        "time": "14.10 - 14.50",
        "classes": {
          "7A": "Mugi Raharjo, SE",
          "8A": "Abdul Rosyid, S.Pd.I",
          "8B": "Farhan Perdana, S.Pd",
          "9A": "Shinta Handayani, S.Pd",
          "9B": "Admiri, S.Ag",
          "7B": "-",
          "8C": "-",
          "9C": "-"
        }
      },
      {
        "period": "sore",
        "time": "14.50 -",
        "activity": "TBA/Murajaah - Sholat Ashar Berjamaah"
      }
    ]
  },
  {
    "day": "Selasa",
    "piketTeacher": "Hj. Siti Wahyuni",
    "slots": [
      {
        "period": "pagi",
        "time": "06.45 - 07.00",
        "activity": "Tadarus Al Quran"
      },
      {
        "period": "1",
        "time": "07.00 - 07.40",
        "classes": {
          "7A": "Admiri, S.Ag",
          "8A": "Mugi Raharjo, SE",
          "8B": "Dra. Hj. Sudarti",
          "9A": "Ust. Ahmad Zen Syukrillah",
          "9B": "Fitri Khoiriyah, S.Pd.I",
          "7B": "Tristian Novansyah, S.Kom",
          "8C": "Febriantika Putri Pangesti, S.Pd",
          "9C": "Abdul Rosyid, S.Pd.I"
        }
      },
      {
        "period": "2",
        "time": "07.40 - 08.20",
        "classes": {
          "7A": "Admiri, S.Ag",
          "8A": "Mugi Raharjo, SE",
          "8B": "Fitri Khoiriyah, S.Pd.I",
          "9A": "Ust. Ahmad Zen Syukrillah",
          "9B": "Ida Farida, S.Pd",
          "7B": "Tristian Novansyah, S.Kom",
          "8C": "Febriantika Putri Pangesti, S.Pd",
          "9C": "Abdul Rosyid, S.Pd.I"
        }
      },
      {
        "period": "3",
        "time": "08.20 - 09.00",
        "classes": {
          "7A": "Admiri, S.Ag",
          "8A": "Dra. Hj. Sudarti",
          "8B": "Fitri Khoiriyah, S.Pd.I",
          "9A": "Febriantika Putri Pangesti, S.Pd",
          "9B": "Ida Farida, S.Pd",
          "7B": "Guru IPA (Cadangan)",
          "8C": "Tristian Novansyah, S.Kom",
          "9C": "Ahmad Sulthoni Alkhoir, S.Si"
        }
      },
      {
        "period": "4",
        "time": "09.00 - 09.40",
        "classes": {
          "7A": "Abdul Rosyid, S.Pd.I",
          "8A": "Fitri Khoiriyah, S.Pd.I",
          "8B": "Admiri, S.Ag",
          "9A": "Febriantika Putri Pangesti, S.Pd",
          "9B": "Tarwoko, S.Pd",
          "7B": "Guru IPA (Cadangan)",
          "8C": "Drs. H. Faisal",
          "9C": "Ahmad Sulthoni Alkhoir, S.Si"
        }
      },
      {
        "period": "dhuha",
        "time": "09.40 - 10.05",
        "activity": "Sholat Dhuha"
      },
      {
        "period": "rest1",
        "time": "10.05 - 10.35",
        "activity": "Istirahat 1"
      },
      {
        "period": "5",
        "time": "10.35 - 11.15",
        "classes": {
          "7A": "Ida Farida, S.Pd",
          "8A": "Dadi Rochnadi, S.Sn",
          "8B": "Admiri, S.Ag",
          "9A": "Tristian Novansyah, S.Kom",
          "9B": "Abdul Rosyid, S.Pd.I",
          "7B": "Mugi Raharjo, SE",
          "8C": "Drs. H. Faisal",
          "9C": "Dra. Hj. Sudarti"
        }
      },
      {
        "period": "6",
        "time": "11.15 - 11.55",
        "classes": {
          "7A": "Tristian Novansyah, S.Kom",
          "8A": "Dadi Rochnadi, S.Sn",
          "8B": "Guru IPA (Cadangan)",
          "9A": "Admiri, S.Ag",
          "9B": "Drs. H. Faisal",
          "7B": "Mugi Raharjo, SE",
          "8C": "Abdul Rosyid, S.Pd.I",
          "9C": "Dra. Hj. Sudarti"
        }
      },
      {
        "period": "7",
        "time": "11.55 - 12.35",
        "classes": {
          "7A": "Tristian Novansyah, S.Kom",
          "8A": "Febriantika Putri Pangesti, S.Pd",
          "8B": "Guru IPA (Cadangan)",
          "9A": "Tarwoko, S.Pd",
          "9B": "Drs. H. Faisal",
          "7B": "Admiri, S.Ag",
          "8C": "Abdul Rosyid, S.Pd.I",
          "9C": "Dadi Rochnadi, S.Sn"
        }
      },
      {
        "period": "dzuhur",
        "time": "12.35 - 13.30",
        "activity": "Sholat Dzuhur Berjamaah Kloter 2 - Murajaah - TBA - Istirahat 2"
      },
      {
        "period": "8",
        "time": "13.30 - 14.10",
        "classes": {
          "7A": "Guru IPA (Cadangan)",
          "8A": "Farhan Perdana, S.Pd",
          "8B": "Ahmad Sulthoni Alkhoir, S.Si",
          "9A": "Tarwoko, S.Pd",
          "9B": "Febriantika Putri Pangesti, S.Pd",
          "7B": "Admiri, S.Ag",
          "8C": "Abdul Rosyid, S.Pd.I",
          "9C": "Dadi Rochnadi, S.Sn"
        }
      },
      {
        "period": "9",
        "time": "14.10 - 14.50",
        "classes": {
          "7A": "Guru IPA (Cadangan)",
          "8A": "Farhan Perdana, S.Pd",
          "8B": "Ahmad Sulthoni Alkhoir, S.Si",
          "9A": "Tarwoko, S.Pd",
          "9B": "Tristian Novansyah, S.Kom",
          "7B": "-",
          "8C": "-",
          "9C": "-"
        }
      },
      {
        "period": "sore",
        "time": "14.50 -",
        "activity": "TBA/Murajaah - Sholat Ashar Berjamaah"
      }
    ]
  },
  {
    "day": "Rabu",
    "piketTeacher": "Tristian Novansyah, S.Kom",
    "slots": [
      {
        "period": "pagi",
        "time": "06.45 - 07.40",
        "activity": "Tadarus Al Quran - Literasi/Pramuka/Senam/TBA"
      },
      {
        "period": "1",
        "time": "07.40 - 08.15",
        "classes": {
          "7A": "Ahmad Sulthoni Alkhoir, S.Si",
          "8A": "Ust. Ahmad Zen Syukrillah",
          "8B": "Abdul Rosyid, S.Pd.I",
          "9A": "Farhan Perdana, S.Pd",
          "9B": "Febriantika Putri Pangesti, S.Pd",
          "7B": "Rudi Darmawan, S.Sos",
          "8C": "Fitri Khoiriyah, S.Pd.I",
          "9C": "Ida Farida, S.Pd"
        }
      },
      {
        "period": "2",
        "time": "08.15 - 08.50",
        "classes": {
          "7A": "Ahmad Sulthoni Alkhoir, S.Si",
          "8A": "Ust. Ahmad Zen Syukrillah",
          "8B": "Abdul Rosyid, S.Pd.I",
          "9A": "Farhan Perdana, S.Pd",
          "9B": "Febriantika Putri Pangesti, S.Pd",
          "7B": "Rudi Darmawan, S.Sos",
          "8C": "Admiri, S.Ag",
          "9C": "Ida Farida, S.Pd"
        }
      },
      {
        "period": "3",
        "time": "08.50 - 09.25",
        "classes": {
          "7A": "Fitri Khoiriyah, S.Pd.I",
          "8A": "Rudi Darmawan, S.Sos",
          "8B": "Farhan Perdana, S.Pd",
          "9A": "Admiri, S.Ag",
          "9B": "Abdul Rosyid, S.Pd.I",
          "7B": "Ida Farida, S.Pd",
          "8C": "Ahmad Sulthoni Alkhoir, S.Si",
          "9C": "Febriantika Putri Pangesti, S.Pd"
        }
      },
      {
        "period": "4",
        "time": "09.25 - 10.00",
        "classes": {
          "7A": "Fitri Khoiriyah, S.Pd.I",
          "8A": "Rudi Darmawan, S.Sos",
          "8B": "Farhan Perdana, S.Pd",
          "9A": "Admiri, S.Ag",
          "9B": "Abdul Rosyid, S.Pd.I",
          "7B": "Ida Farida, S.Pd",
          "8C": "Ahmad Sulthoni Alkhoir, S.Si",
          "9C": "Febriantika Putri Pangesti, S.Pd"
        }
      },
      {
        "period": "dhuha",
        "time": "10.00 - 10.25",
        "activity": "Sholat Dhuha"
      },
      {
        "period": "rest1",
        "time": "10.25 - 10.55",
        "activity": "Istirahat 1"
      },
      {
        "period": "5",
        "time": "10.55 - 11.30",
        "classes": {
          "7A": "Ida Farida, S.Pd",
          "8A": "Ahmad Sulthoni Alkhoir, S.Si",
          "8B": "Rudi Darmawan, S.Sos",
          "9A": "Abdul Rosyid, S.Pd.I",
          "9B": "Admiri, S.Ag",
          "7B": "Fitri Khoiriyah, S.Pd.I",
          "8C": "Febriantika Putri Pangesti, S.Pd",
          "9C": "Drs. H. Faisal"
        }
      },
      {
        "period": "6",
        "time": "11.30 - 12.05",
        "classes": {
          "7A": "Ida Farida, S.Pd",
          "8A": "Ahmad Sulthoni Alkhoir, S.Si",
          "8B": "Rudi Darmawan, S.Sos",
          "9A": "Dadi Rochnadi, S.Sn",
          "9B": "Admiri, S.Ag",
          "7B": "Fitri Khoiriyah, S.Pd.I",
          "8C": "Febriantika Putri Pangesti, S.Pd",
          "9C": "Drs. H. Faisal"
        }
      },
      {
        "period": "7",
        "time": "12.05 - 12.40",
        "classes": {
          "7A": "Shinta Handayani, S.Pd",
          "8A": "Febriantika Putri Pangesti, S.Pd",
          "8B": "Fitri Khoiriyah, S.Pd.I",
          "9A": "Dadi Rochnadi, S.Sn",
          "9B": "Ida Farida, S.Pd",
          "7B": "Guru B. Inggris (Cadangan)",
          "8C": "Farhan Perdana, S.Pd",
          "9C": "Abdul Rosyid, S.Pd.I"
        }
      },
      {
        "period": "dzuhur",
        "time": "12.40 - 13.30",
        "activity": "Sholat Dzuhur Berjamaah Kloter 2 - Murajaah - TBA - Istirahat 2"
      },
      {
        "period": "8",
        "time": "13.30 - 14.10",
        "classes": {
          "7A": "Shinta Handayani, S.Pd",
          "8A": "Admiri, S.Ag",
          "8B": "Dadi Rochnadi, S.Sn",
          "9A": "Ahmad Sulthoni Alkhoir, S.Si",
          "9B": "Tarwoko, S.Pd",
          "7B": "Guru B. Inggris (Cadangan)",
          "8C": "Farhan Perdana, S.Pd",
          "9C": "Abdul Rosyid, S.Pd.I"
        }
      },
      {
        "period": "9",
        "time": "14.10 - 14.50",
        "classes": {
          "7A": "Abdul Rosyid, S.Pd.I",
          "8A": "Admiri, S.Ag",
          "8B": "Dadi Rochnadi, S.Sn",
          "9A": "Ahmad Sulthoni Alkhoir, S.Si",
          "9B": "Tarwoko, S.Pd",
          "7B": "-",
          "8C": "-",
          "9C": "-"
        }
      },
      {
        "period": "sore",
        "time": "14.50 -",
        "activity": "TBA/Murajaah - Sholat Ashar Berjamaah"
      }
    ]
  },
  {
    "day": "Kamis",
    "piketTeacher": "Ahmad Sulthoni Alkhoir, S.Si",
    "slots": [
      {
        "period": "pagi",
        "time": "06.45 - 07.00",
        "activity": "Tadarus Al Quran"
      },
      {
        "period": "1",
        "time": "07.00 - 07.40",
        "classes": {
          "7A": "Rudi Darmawan, S.Sos",
          "8A": "Shinta Handayani, S.Pd",
          "8B": "Tristian Novansyah, S.Kom",
          "9A": "Farhan Perdana, S.Pd",
          "9B": "Ust. Ahmad Zen Syukrillah",
          "7B": "Ahmad Sulthoni Alkhoir, S.Si",
          "8C": "Admiri, S.Ag",
          "9C": "Mugi Raharjo, SE"
        }
      },
      {
        "period": "2",
        "time": "07.40 - 08.20",
        "classes": {
          "7A": "Rudi Darmawan, S.Sos",
          "8A": "Shinta Handayani, S.Pd",
          "8B": "Tristian Novansyah, S.Kom",
          "9A": "Farhan Perdana, S.Pd",
          "9B": "Ust. Ahmad Zen Syukrillah",
          "7B": "Ahmad Sulthoni Alkhoir, S.Si",
          "8C": "Admiri, S.Ag",
          "9C": "Mugi Raharjo, SE"
        }
      },
      {
        "period": "3",
        "time": "08.20 - 09.00",
        "classes": {
          "7A": "Guru B. Inggris (Cadangan)",
          "8A": "Dra. Hj. Sudarti",
          "8B": "Farhan Perdana, S.Pd",
          "9A": "Drs. H. Faisal",
          "9B": "Ahmad Sulthoni Alkhoir, S.Si",
          "7B": "Shinta Handayani, S.Pd",
          "8C": "Rudi Darmawan, S.Sos",
          "9C": "Admiri, S.Ag"
        }
      },
      {
        "period": "4",
        "time": "09.00 - 09.40",
        "classes": {
          "7A": "Guru B. Inggris (Cadangan)",
          "8A": "Dra. Hj. Sudarti",
          "8B": "Farhan Perdana, S.Pd",
          "9A": "Drs. H. Faisal",
          "9B": "Ahmad Sulthoni Alkhoir, S.Si",
          "7B": "Shinta Handayani, S.Pd",
          "8C": "Rudi Darmawan, S.Sos",
          "9C": "Admiri, S.Ag"
        }
      },
      {
        "period": "dhuha",
        "time": "09.40 - 10.05",
        "activity": "Sholat Dhuha"
      },
      {
        "period": "rest1",
        "time": "10.05 - 10.35",
        "activity": "Istirahat 1"
      },
      {
        "period": "5",
        "time": "10.35 - 11.15",
        "classes": {
          "7A": "Ida Farida, S.Pd",
          "8A": "Abdul Rosyid, S.Pd.I",
          "8B": "Guru IPA (Cadangan)",
          "9A": "Dra. Hj. Sudarti",
          "9B": "Tristian Novansyah, S.Kom",
          "7B": "Mugi Raharjo, SE",
          "8C": "Drs. H. Faisal",
          "9C": "Admiri, S.Ag"
        }
      },
      {
        "period": "6",
        "time": "11.15 - 11.55",
        "classes": {
          "7A": "Shinta Handayani, S.Pd",
          "8A": "Farhan Perdana, S.Pd",
          "8B": "Admiri, S.Ag",
          "9A": "Dra. Hj. Sudarti",
          "9B": "Tristian Novansyah, S.Kom",
          "7B": "Mugi Raharjo, SE",
          "8C": "Drs. H. Faisal",
          "9C": "Abdul Rosyid, S.Pd.I"
        }
      },
      {
        "period": "7",
        "time": "11.55 - 12.35",
        "classes": {
          "7A": "Shinta Handayani, S.Pd",
          "8A": "Farhan Perdana, S.Pd",
          "8B": "Admiri, S.Ag",
          "9A": "Dra. Hj. Sudarti",
          "9B": "Ida Farida, S.Pd",
          "7B": "Abdul Rosyid, S.Pd.I",
          "8C": "Guru B. Inggris (Cadangan)",
          "9C": "Tristian Novansyah, S.Kom"
        }
      },
      {
        "period": "dzuhur",
        "time": "12.35 - 13.25",
        "activity": "Sholat Dzuhur Berjamaah Kloter 2 - Murajaah - TBA - Istirahat 2"
      },
      {
        "period": "8",
        "time": "13.25 - 14.00",
        "classes": {
          "7A": "Guru IPA (Cadangan)",
          "8A": "Mugi Raharjo, SE",
          "8B": "Shinta Handayani, S.Pd",
          "9A": "Abdul Rosyid, S.Pd.I",
          "9B": "Dra. Hj. Sudarti",
          "7B": "Admiri, S.Ag",
          "8C": "Guru B. Inggris (Cadangan)",
          "9C": "Tristian Novansyah, S.Kom"
        }
      },
      {
        "period": "9",
        "time": "14.00 - 14.35",
        "classes": {
          "7A": "Guru IPA (Cadangan)",
          "8A": "Mugi Raharjo, SE",
          "8B": "Shinta Handayani, S.Pd",
          "9A": "Abdul Rosyid, S.Pd.I",
          "9B": "Dra. Hj. Sudarti",
          "7B": "-",
          "8C": "-",
          "9C": "-"
        }
      },
      {
        "period": "sore",
        "time": "14.35 -",
        "activity": "KBM Selesai"
      }
    ]
  },
  {
    "day": "Jumat",
    "piketTeacher": "Abdul Rosyid, S.Pd.I",
    "slots": [
      {
        "period": "pagi",
        "time": "06.30 - 07.30",
        "activity": "Sholat Dhuha - Tadarus Al Quran - Asmaul Husna/Rohis"
      },
      {
        "period": "1",
        "time": "07.30 - 08.05",
        "classes": {
          "7A": "Mugi Raharjo, SE",
          "8A": "Febriantika Putri Pangesti, S.Pd",
          "8B": "Ust. Ahmad Zen Syukrillah",
          "9A": "Hj. Nur Azizah, S.Ag",
          "9B": "Dra. Hj. Sudarti",
          "7B": "Ida Farida, S.Pd",
          "8C": "Admiri, S.Ag",
          "9C": "Shinta Handayani, S.Pd"
        }
      },
      {
        "period": "2",
        "time": "08.05 - 08.40",
        "classes": {
          "7A": "Mugi Raharjo, SE",
          "8A": "Febriantika Putri Pangesti, S.Pd",
          "8B": "Ust. Ahmad Zen Syukrillah",
          "9A": "Hj. Nur Azizah, S.Ag",
          "9B": "Dra. Hj. Sudarti",
          "7B": "Ida Farida, S.Pd",
          "8C": "Admiri, S.Ag",
          "9C": "Shinta Handayani, S.Pd"
        }
      },
      {
        "period": "3",
        "time": "08.40 - 09.15",
        "classes": {
          "7A": "Guru B. Inggris (Cadangan)",
          "8A": "Tristian Novansyah, S.Kom",
          "8B": "Mugi Raharjo, SE",
          "9A": "Admiri, S.Ag",
          "9B": "Hj. Nur Azizah, S.Ag",
          "7B": "Guru IPA (Cadangan)",
          "8C": "Farhan Perdana, S.Pd",
          "9C": "Febriantika Putri Pangesti, S.Pd"
        }
      },
      {
        "period": "4",
        "time": "09.15 - 09.50",
        "classes": {
          "7A": "Guru B. Inggris (Cadangan)",
          "8A": "Tristian Novansyah, S.Kom",
          "8B": "Mugi Raharjo, SE",
          "9A": "Admiri, S.Ag",
          "9B": "Hj. Nur Azizah, S.Ag",
          "7B": "Guru IPA (Cadangan)",
          "8C": "Farhan Perdana, S.Pd",
          "9C": "Febriantika Putri Pangesti, S.Pd"
        }
      },
      {
        "period": "rest1",
        "time": "09.50 - 10.20",
        "activity": "Istirahat 1"
      },
      {
        "period": "5",
        "time": "10.20 - 10.55",
        "classes": {
          "7A": "Guru IPA (Cadangan)",
          "8A": "Admiri, S.Ag",
          "8B": "Hj. Siti Wahyuni",
          "9A": "Dra. Hj. Sudarti",
          "9B": "Febriantika Putri Pangesti, S.Pd",
          "7B": "Abdul Rosyid, S.Pd.I",
          "8C": "Dadi Rochnadi, S.Sn",
          "9C": "Hj. Nur Azizah, S.Ag"
        }
      },
      {
        "period": "6",
        "time": "10.55 - 11.30",
        "classes": {
          "7A": "Guru IPA (Cadangan)",
          "8A": "Farhan Perdana, S.Pd",
          "8B": "Hj. Siti Wahyuni",
          "9A": "Dra. Hj. Sudarti",
          "9B": "Tarwoko, S.Pd",
          "7B": "Sholahuddin, S.Pd",
          "8C": "Dadi Rochnadi, S.Sn",
          "9C": "Hj. Nur Azizah, S.Ag"
        }
      },
      {
        "period": "jumat",
        "time": "11.30 - 12.50",
        "activity": "Sholat Jumat / Keputrian"
      },
      {
        "period": "7",
        "time": "12.50 - 13.30",
        "classes": {
          "7A": "Tristian Novansyah, S.Kom",
          "8A": "Farhan Perdana, S.Pd",
          "8B": "Guru IPA (Cadangan)",
          "9A": "Tarwoko, S.Pd",
          "9B": "Dadi Rochnadi, S.Sn",
          "7B": "Sholahuddin, S.Pd",
          "8C": "Guru B. Inggris (Cadangan)",
          "9C": "Admiri, S.Ag"
        }
      },
      {
        "period": "8",
        "time": "13.30 - 14.10",
        "classes": {
          "7A": "Sholahuddin, S.Pd",
          "8A": "Dra. Hj. Sudarti",
          "8B": "Guru IPA (Cadangan)",
          "9A": "Febriantika Putri Pangesti, S.Pd",
          "9B": "Dadi Rochnadi, S.Sn",
          "7B": "Tristian Novansyah, S.Kom",
          "8C": "Guru B. Inggris (Cadangan)",
          "9C": "Admiri, S.Ag"
        }
      },
      {
        "period": "9",
        "time": "14.10 - 14.50",
        "classes": {
          "7A": "Sholahuddin, S.Pd",
          "8A": "Dra. Hj. Sudarti",
          "8B": "Guru IPA (Cadangan)",
          "9A": "Febriantika Putri Pangesti, S.Pd",
          "9B": "Admiri, S.Ag",
          "7B": "-",
          "8C": "-",
          "9C": "-"
        }
      },
      {
        "period": "sore",
        "time": "14.50 -",
        "activity": "TBA/Murajaah - Sholat Ashar Berjamaah"
      }
    ]
  }
]
;

// Kosong secara sengaja — riwayat absensi guru mulai dikumpulkan sejak fitur
// ini dibuat, bukan direkonstruksi dari AttendanceMap lama (yang cuma
// snapshot nama hari, tanpa tanggal asli sehingga tidak bisa dipetakan ke
// bulan tertentu).
export const INITIAL_TEACHER_ATTENDANCE_LOG: TeacherAttendanceRecord[] = [];
