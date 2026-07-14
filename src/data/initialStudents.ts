import type { Student } from '../types';

/**
 * Data siswa ASLI sudah dipindahkan sepenuhnya ke tabel `students` di
 * Supabase (lihat supabase/schema.sql + RLS v2) — bukan lagi disimpan di
 * source code. File ini dulu berisi data nyata (nama/NIS/NISN) 53 murid
 * kelas 8 dan ikut ter-bundle ke JavaScript publik yang bisa dibaca siapa
 * saja tanpa login (lihat temuan audit produksi). Sekarang isinya cuma
 * data contoh untuk mode lokal/offline (tanpa Supabase) — BUKAN data asli.
 */
export const INITIAL_STUDENTS: Student[] = [
  {
    id: 'contoh-001',
    nis: 'contoh-001',
    nisn: '0000000001',
    name: 'Contoh Siswa Satu',
    className: 'VIII.1',
    gender: 'L',
    schoolYear: '2025/2026',
    active: true,
  },
  {
    id: 'contoh-002',
    nis: 'contoh-002',
    nisn: '0000000002',
    name: 'Contoh Siswa Dua',
    className: 'VIII.1',
    gender: 'P',
    schoolYear: '2025/2026',
    active: true,
  },
];
