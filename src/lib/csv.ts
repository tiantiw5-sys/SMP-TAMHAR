/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Parser & escaper CSV kecil dipakai bersama oleh studentImport.ts dan
 * teacherImport.ts — sengaja TIDAK pakai library .xlsx pihak ketiga (lihat
 * catatan di studentImport.ts soal celah keamanan paket "xlsx").
 */

export function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Parser CSV sederhana — dukung field berisi koma/titik-koma/kutip, dan auto-deteksi pemisah (, atau ;). */
export function parseCsvText(text: string): string[][] {
  const body = text.replace(/^﻿/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const headerLine = body.split('\n', 1)[0] ?? '';
  const semicolons = (headerLine.match(/;/g) ?? []).length;
  const commas = (headerLine.match(/,/g) ?? []).length;
  const delimiter = semicolons > commas ? ';' : ',';

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (inQuotes) {
      if (ch === '"') {
        if (body[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

/** Trigger unduhan file CSV di browser (dengan BOM UTF-8 supaya Excel langsung kebaca dengan benar). */
export function downloadCsv(filename: string, headers: readonly string[], rows: string[][]): void {
  const lines = [headers.join(','), ...rows.map((row) => row.map(csvEscape).join(','))];
  const csvContent = '﻿' + lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
