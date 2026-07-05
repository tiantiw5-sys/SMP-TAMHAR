/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Super Admin' | 'Managerial OSIS' | 'Managerial Sekolah' | 'Guru Piket' | 'Guru' | 'Normal User';
  status: 'Active' | 'Inactive';
  lastActive?: string;
  mustChangePassword?: boolean;
  password?: string;
}

export interface RolePermission {
  role: 'Super Admin' | 'Managerial OSIS' | 'Managerial Sekolah' | 'Guru Piket' | 'Guru' | 'Normal User';
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
}

// Keep a compatible wrapper for userProgress to prevent compilation errors if referenced elsewhere
export interface UserProgress {
  enrolledCourses: { [courseId: string]: number };
  completedLessons: { [lessonId: string]: boolean };
  streak: number;
  studyHoursThisWeek: number[];
  selectedCategory: string;
}
