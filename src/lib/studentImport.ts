/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Import/export data murid lewat CSV (dibuka & diisi langsung di Excel).
 * Sengaja TIDAK pakai library .xlsx pihak ketiga — paket npm "xlsx" yang
 * beredar resmi sudah lama tidak ditambal (ada celah keamanan), dan versi
 * yang sudah ditambal cuma didistribusikan lewat CDN mereka sendiri (bukan
 * npm registry). CSV cukup untuk kebutuhan ini: Excel bisa buka & simpan CSV
 * secara native, tanpa dependency tambahan sama sekali.
 */

import type { Student } from '../types';
import { downloadCsv, parseCsvText } from './csv';

export const STUDENT_IMPORT_HEADERS = [
  'Nama Lengkap',
  'NIS',
  'NISN',
  'Kelas',
  'Jenis Kelamin (L/P)',
  'Tahun Ajaran',
  'Status Aktif (Ya/Tidak)',
] as const;

const EXAMPLE_ROWS: string[][] = [
  ['Contoh Siswa Satu', '10001', '0012345601', 'VII.1', 'L', '2025/2026', 'Ya'],
  ['Contoh Siswa Dua', '10002', '0012345602', 'VII.1', 'P', '2025/2026', 'Ya'],
];

/** Menghasilkan file CSV template (siap diisi di Excel) lalu langsung diunduh browser. */
export function downloadStudentTemplate(): void {
  downloadCsv('Template-Data-Murid.csv', STUDENT_IMPORT_HEADERS, EXAMPLE_ROWS);
}

export interface StudentImportResult {
  valid: Student[];
  errors: string[];
}

/**
 * Parse isi file CSV yang diupload jadi daftar Student siap diimpor.
 * `existingNis` — NIS yang sudah terdaftar (dicek supaya tidak dobel).
 */
export function parseStudentImportCsv(text: string, existingNis: Set<string>): StudentImportResult {
  const rows = parseCsvText(text);
  const errors: string[] = [];
  const valid: Student[] = [];
  const seenNis = new Set<string>();

  if (rows.length === 0) {
    return { valid, errors: ['File kosong atau formatnya tidak terbaca.'] };
  }

  // Baris pertama dianggap header, dilewati.
  const dataRows = rows.slice(1);

  dataRows.forEach((cols, idx) => {
    const rowNum = idx + 2; // +2: baris 1 = header, data mulai baris 2 (sama seperti nomor baris di Excel)
    const [nameRaw, nisRaw, nisnRaw, classNameRaw, genderRaw, schoolYearRaw, activeRaw] = cols.map((c) => (c ?? '').trim());

    if (!nameRaw && !nisRaw && !classNameRaw) return; // baris kosong, lewati diam-diam

    const rowErrors: string[] = [];
    if (!nameRaw) rowErrors.push('Nama Lengkap kosong');
    if (!nisRaw) rowErrors.push('NIS kosong');
    if (!classNameRaw) rowErrors.push('Kelas kosong');

    const genderNormalized = genderRaw.toUpperCase();
    if (genderNormalized !== 'L' && genderNormalized !== 'P') {
      rowErrors.push('Jenis Kelamin harus diisi "L" atau "P"');
    }

    if (nisRaw && (seenNis.has(nisRaw) || existingNis.has(nisRaw))) {
      rowErrors.push(`NIS "${nisRaw}" duplikat (sudah dipakai murid lain)`);
    }

    if (rowErrors.length > 0) {
      errors.push(`Baris ${rowNum}: ${rowErrors.join(', ')}`);
      return;
    }

    seenNis.add(nisRaw);
    const activeNormalized = activeRaw.toLowerCase();
    const active = activeNormalized === '' || activeNormalized === 'ya' || activeNormalized === 'yes' || activeNormalized === 'true';

    valid.push({
      id: nisRaw,
      nis: nisRaw,
      nisn: nisnRaw,
      name: nameRaw,
      className: classNameRaw,
      gender: genderNormalized as 'L' | 'P',
      schoolYear: schoolYearRaw || '2025/2026',
      active,
    });
  });

  return { valid, errors };
}
