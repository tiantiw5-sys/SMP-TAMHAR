/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Import/export data guru lewat CSV (dibuka & diisi langsung di Excel).
 * Baris yang "Kode Mengajar"-nya cocok dengan guru yang sudah ada akan
 * MENIMPA data guru itu (nama/mapel/jabatan/foto), bukan jadi duplikat —
 * kalau kode kosong/tidak cocok, dicoba cocokkan lewat nama, baru kalau
 * tetap tidak ketemu dianggap guru baru.
 */

import type { Teacher } from '../types';
import { downloadCsv, parseCsvText } from './csv';

export const TEACHER_IMPORT_HEADERS = [
  'Nama Lengkap',
  'Kode Mengajar',
  'Mata Pelajaran',
  'Jabatan',
  'URL Foto',
] as const;

const EXAMPLE_ROWS: string[][] = [
  ['Contoh Guru Satu, S.Pd', '1', 'Matematika', 'Guru', ''],
  ['Contoh Guru Dua, S.Pd', '2', 'Bahasa Indonesia', 'Wali Kelas VII.A', ''],
];

const DEFAULT_TEACHER_IMAGE =
  'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=300';

export function downloadTeacherTemplate(): void {
  downloadCsv('Template-Data-Guru.csv', TEACHER_IMPORT_HEADERS, EXAMPLE_ROWS);
}

export interface TeacherImportResult {
  valid: Teacher[];
  errors: string[];
}

/**
 * Parse isi file CSV yang diupload jadi daftar Teacher siap disimpan.
 * `existingTeachers` — dipakai untuk mencocokkan baris ke guru yang sudah
 * ada (lewat Kode Mengajar dulu, baru nama) supaya jadi TIMPA bukan duplikat.
 */
export function parseTeacherImportCsv(text: string, existingTeachers: Teacher[]): TeacherImportResult {
  const rows = parseCsvText(text);
  const errors: string[] = [];
  const valid: Teacher[] = [];

  if (rows.length === 0) {
    return { valid, errors: ['File kosong atau formatnya tidak terbaca.'] };
  }

  const dataRows = rows.slice(1);
  const seenCodes = new Set<number>();
  let nextSeq = existingTeachers.length;

  dataRows.forEach((cols, idx) => {
    const rowNum = idx + 2;
    const [nameRaw, codeRaw, subjectRaw, positionRaw, imageRaw] = cols.map((c) => (c ?? '').trim());

    if (!nameRaw && !codeRaw && !subjectRaw) return; // baris kosong, lewati diam-diam

    const rowErrors: string[] = [];
    if (!nameRaw) rowErrors.push('Nama Lengkap kosong');
    if (!subjectRaw) rowErrors.push('Mata Pelajaran kosong');
    if (!positionRaw) rowErrors.push('Jabatan kosong');

    let code: number | undefined;
    if (codeRaw) {
      code = Number(codeRaw);
      if (!Number.isFinite(code) || code <= 0) {
        rowErrors.push('Kode Mengajar harus berupa angka positif');
        code = undefined;
      } else if (seenCodes.has(code)) {
        rowErrors.push(`Kode Mengajar "${code}" duplikat di dalam file ini`);
      }
    }

    if (rowErrors.length > 0) {
      errors.push(`Baris ${rowNum}: ${rowErrors.join(', ')}`);
      return;
    }

    if (code) seenCodes.add(code);

    const existingByCode = code ? existingTeachers.find((t) => t.code === code) : undefined;
    const existingByName = existingTeachers.find((t) => t.name.toLowerCase() === nameRaw.toLowerCase());
    const match = existingByCode ?? existingByName;

    if (!match) nextSeq += 1;

    valid.push({
      id: match?.id ?? `t-${nextSeq}`,
      name: nameRaw,
      code,
      subject: subjectRaw,
      position: positionRaw,
      image: imageRaw || match?.image || DEFAULT_TEACHER_IMAGE,
      // Wali Kelas diisi lewat dropdown di form Tambah/Edit Guru, bukan
      // kolom CSV — dipertahankan dari data lama supaya import ulang tidak
      // diam-diam menghapus penugasan wali kelas yang sudah diset manual.
      waliKelas: match?.waliKelas,
    });
  });

  return { valid, errors };
}
