/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Student, StudentAttendanceRecord, StudentAttendanceStatus } from '../types';

export const todayDateKey = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const normalizeScanCode = (raw: string): string => raw.trim().replace(/\s+/g, '');

export const findStudentByScan = (students: Student[], code: string): Student | undefined => {
  const normalized = normalizeScanCode(code);
  if (!normalized) return undefined;

  return students.find((s) => {
    if (!s.active) return false;
    const nis = normalizeScanCode(s.nis);
    const nisn = normalizeScanCode(s.nisn);
    const nisPlain = nis.replace(/\./g, '');
    const codePlain = normalized.replace(/\./g, '');
    return (
      normalized === nis ||
      normalized === nisn ||
      codePlain === nisPlain ||
      normalized === s.id
    );
  });
};

export const findTodayRecord = (
  records: StudentAttendanceRecord[],
  studentId: string,
  date = todayDateKey()
): StudentAttendanceRecord | undefined =>
  records.find((r) => r.studentId === studentId && r.date === date);

export const formatCheckInTime = (iso?: string): string => {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '-';
  }
};

export const createScanAttendance = (
  student: Student,
  existing: StudentAttendanceRecord | undefined
): { record: StudentAttendanceRecord | null; message: string; kind: 'success' | 'info' | 'error' } => {
  const now = new Date().toISOString();
  const date = todayDateKey();

  if (existing?.status === 'Hadir') {
    return {
      record: null,
      kind: 'info',
      message: `${student.name} sudah hadir pukul ${formatCheckInTime(existing.checkInAt)}`,
    };
  }

  const record: StudentAttendanceRecord = {
    id: existing?.id ?? `att-${student.id}-${date}`,
    studentId: student.id,
    studentName: student.name,
    className: student.className,
    date,
    status: 'Hadir',
    checkInAt: now,
    source: 'scan',
  };

  return {
    record,
    kind: 'success',
    message: `Hadir — ${student.name} (${student.className})`,
  };
};

// Menghitung record manual + apakah ini menimpa record hari ini yang sudah
// ada (isUpdate) — dipisah dari penggabungan ke array supaya pemanggil bisa
// memilih menulis lewat RPC atomik (append_to_collection /
// update_collection_item) alih-alih mengganti seluruh array absensi.
export const buildManualAttendanceRecord = (
  records: StudentAttendanceRecord[],
  student: Student,
  status: StudentAttendanceStatus,
  recordedBy: string,
  targetDate: string = todayDateKey(),
  note?: string
): { record: StudentAttendanceRecord; isUpdate: boolean } => {
  const existing = findTodayRecord(records, student.id, targetDate);
  const record: StudentAttendanceRecord = {
    id: existing?.id ?? `att-${student.id}-${targetDate}`,
    studentId: student.id,
    studentName: student.name,
    className: student.className,
    date: targetDate,
    status,
    // Manual "Hadir" (murid lupa bawa kartu barcode) tetap dicatat jam
    // check-in-nya seperti scan asli, supaya tampil normal di kolom Jam.
    checkInAt: status === 'Hadir' ? (existing?.checkInAt ?? new Date().toISOString()) : existing?.checkInAt,
    source: 'manual',
    recordedBy,
    note: note?.trim() || undefined,
  };

  return { record, isUpdate: Boolean(existing) };
};

// Fallback untuk mode tanpa Supabase (localStorage) — tetap mengganti
// seluruh array di memori karena tidak ada RPC atomik untuk dipanggil.
export const upsertManualAttendance = (
  records: StudentAttendanceRecord[],
  student: Student,
  status: StudentAttendanceStatus,
  recordedBy: string,
  targetDate: string = todayDateKey(),
  note?: string
): StudentAttendanceRecord[] => {
  const { record, isUpdate } = buildManualAttendanceRecord(records, student, status, recordedBy, targetDate, note);
  return isUpdate ? records.map((r) => (r.id === record.id ? record : r)) : [...records, record];
};

export const mergeAttendanceRecord = (
  records: StudentAttendanceRecord[],
  record: StudentAttendanceRecord
): StudentAttendanceRecord[] => {
  const idx = records.findIndex((r) => r.id === record.id);
  if (idx >= 0) {
    const copy = [...records];
    copy[idx] = record;
    return copy;
  }
  return [...records, record];
};