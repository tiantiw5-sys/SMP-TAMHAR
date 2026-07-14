/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Super Admin' | 'Managerial OSIS' | 'Managerial Sekolah' | 'Guru Piket' | 'Guru' | 'Normal User' | 'Orang Tua';
  status: 'Active' | 'Inactive';
  lastActive?: string;
  mustChangePassword?: boolean;
  // Cuma dipakai role 'Orang Tua' — id murid (koleksi `students`) yang
  // terhubung ke akun ini. 1 akun = 1 anak (lihat PRD-PORTAL-ORANG-TUA.md).
  linkedStudentId?: string;
}

export interface RolePermission {
  role: 'Super Admin' | 'Managerial OSIS' | 'Managerial Sekolah' | 'Guru Piket' | 'Guru' | 'Normal User' | 'Orang Tua';
  permissions: string[];
}

export interface Article {
  id: string;
  title: string;
  category: 'Berita' | 'Kegiatan' | 'Prestasi' | 'OSIS';
  content: string; // supports rich text tags like headings, images, etc.
  excerpt: string;
  image?: string;
  videoUrl?: string;
  author: string;
  date: string;
  viewsCount: number;
}

export interface GalleryItem {
  id: string;
  album: string;
  type: 'Photo' | 'Video';
  url: string;
  caption: string;
  date: string;
}

export interface Teacher {
  id: string;
  name: string;
  subject: string;
  position: string;
  image: string;
  // Kode guru resmi dari dokumen "PEMBAGIAN TUGAS GURU" — dipakai supaya
  // tabel Jadwal Mengajar bisa tampil ringkas pakai kode (muat di layar HP),
  // nama lengkapnya baru muncul begitu kode itu diklik/tap.
  code?: number;
  // Kelas yang diwalikan (dropdown, salah satu CLASS_ROSTER_OPTIONS) —
  // kosong/'-' kalau guru ini bukan wali kelas. Dipakai kartu "Wali Kelas"
  // di dashboard Orang Tua untuk mencocokkan guru ke kelas anak, jadi
  // sengaja field terstruktur sendiri, bukan ditebak dari teks "Jabatan".
  waliKelas?: string;
}

// Satu baris = satu slot jam pelajaran pada satu hari. `classes` memetakan
// nama kelas -> nama guru yang mengajar (sudah diresolusi dari kode guru di
// dokumen sumber "PEMBAGIAN TUGAS GURU", bukan disimpan sebagai kode supaya
// tidak perlu tabel referensi terpisah di tampilan). `activity` dipakai untuk
// baris kegiatan bersama (Tadarus, Sholat Dhuha, Istirahat, dst.) yang tidak
// punya guru per kelas.
export interface TeachingScheduleSlot {
  period: string; // '1'..'9', atau label kegiatan seperti 'dhuha'
  time: string;
  classes?: Record<string, string>;
  activity?: string;
}

export interface TeachingScheduleDay {
  day: 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat';
  slots: TeachingScheduleSlot[];
  piketTeacher: string;
}

export interface Uniform {
  id: string;
  name: string;
  days: string;
  description: string;
  image: string;
}

export interface VisionMission {
  vision: string;
  mission: string[];
  history: string;
  profile: string;
}

export interface DocumentStructure {
  id: string; // 'school' or 'osis'
  title: string;
  fileName: string;
  url: string;
  updatedAt: string;
}

export interface CashTransaction {
  id: string;
  type: 'Masuk' | 'Keluar';
  amount: number;
  description: string;
  category: 'Iuran Bulanan' | 'Konsumsi' | 'Dokumentasi' | 'Sponsorship' | 'Lain-lain';
  date: string;
  author: string;
}

export interface FineTransaction {
  id: string;
  type: 'Masuk' | 'Keluar'; // Masuk = Denda Masuk, Keluar = Pengeluaran Dana Denda
  amount: number;
  description: string;
  violator?: string; // name of student who committed violation (if Masuk)
  category: 'Keterlambatan' | 'Atribut Tidak Lengkap' | 'Kebersihan' | 'Pengeluaran Kegiatan' | 'Lain-lain';
  date: string;
  author: string;
  status: 'Belum Lunas' | 'Lunas';
}

export interface ClassRosterStudent {
  name: string;
  gender: 'L' | 'P';
}

// Satu baris = satu kelas (Pengumuman Kelas) — judul yang ditampilkan adalah
// className (mis. "8A"), isinya cuma nama lengkap & jenis kelamin murid.
// Sengaja terpisah dari koleksi `students` (yang menyimpan NIS/NISN dan
// dikunci RLS khusus login) karena halaman ini memang publik tanpa login.
export interface ClassRosterEntry {
  id: string; // sama dengan className
  className: string;
  students: ClassRosterStudent[];
}

export interface NotificationItem {
  id: string;
  type: 'Akun Baru' | 'Reset Password' | 'Artikel Baru' | 'Kas Baru' | 'Denda Baru';
  title: string;
  message: string;
  date: string;
  read: boolean;
}

export interface ActivityLog {
  id: string;
  user: string;
  role: string;
  action: 'Login' | 'Logout' | 'Tambah' | 'Edit' | 'Hapus' | 'Export';
  details: string;
  timestamp: string;
}

// Saklar on/off per bagian di Portal Orang Tua — diatur Super Admin di menu
// Pengaturan, untuk jaga-jaga kalau sewaktu-waktu ada informasi yang perlu
// disembunyikan dari orang tua (mis. status kehadiran guru) tanpa perlu
// ubah kode. Opsional & default semua `true` (tampil semua seperti sebelum
// fitur ini ada) — supaya settings lama yang belum punya field ini tidak
// tiba-tiba menyembunyikan apa pun.
export interface ParentPortalVisibility {
  waliKelas: boolean;
  attendanceRecap: boolean;
  calendar: boolean;
  schedule: boolean;
  teacherAttendance: boolean;
  uniforms: boolean;
}

export interface SystemSettings {
  schoolName: string;
  slogan: string;
  address: string;
  website: string;
  phone: string;
  whatsapp: string;
  instagram: string;
  facebook: string;
  ppdbStatus: 'Buka' | 'Tutup';
  lastBackupExportedAt?: string;
  parentPortalVisibility?: ParentPortalVisibility;
}

export interface Student {
  id: string;
  nis: string;
  nisn: string;
  name: string;
  className: string;
  gender: 'L' | 'P';
  schoolYear: string;
  active: boolean;
}

export type StudentAttendanceStatus = 'Hadir' | 'Izin' | 'Sakit' | 'Alpa';

export interface StudentAttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  date: string;
  status: StudentAttendanceStatus;
  checkInAt?: string;
  source: 'scan' | 'manual';
  recordedBy?: string;
  note?: string;
}

// Riwayat absensi guru per TANGGAL asli (bukan cuma nama hari seperti
// AttendanceMap lama) — supaya Rekap Absensi Guru bisa dihitung per bulan
// persis seperti Rekap Absensi Murid, dan histori minggu lalu tidak
// tertimpa saat hari yang sama datang lagi minggu berikutnya.
export interface TeacherAttendanceRecord {
  id: string;
  teacherId: string;
  teacherName: string;
  date: string;
  status: StudentAttendanceStatus;
  recordedBy: string;
}

// Keep a compatible wrapper for userProgress to prevent compilation errors if referenced elsewhere
export interface UserProgress {
  enrolledCourses: { [courseId: string]: number };
  completedLessons: { [lessonId: string]: boolean };
  streak: number;
  studyHoursThisWeek: number[];
  selectedCategory: string;
}
