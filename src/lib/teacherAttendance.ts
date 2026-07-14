/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Teacher, TeacherAttendanceRecord } from '../types';
import { normalizeScanCode, todayDateKey } from './studentAttendance';

export const findTeacherByScan = (teachers: Teacher[], code: string): Teacher | undefined => {
  const normalized = normalizeScanCode(code);
  if (!normalized) return undefined;

  return teachers.find((t) => {
    if (normalized === t.id) return true;
    if (t.code !== undefined && normalized === String(t.code)) return true;
    return false;
  });
};

export const findTodayTeacherRecord = (
  records: TeacherAttendanceRecord[],
  teacherId: string,
  date = todayDateKey()
): TeacherAttendanceRecord | undefined =>
  records.find((r) => r.teacherId === teacherId && r.date === date);

// Pakai template id yang sama dengan input manual guru piket
// (`tatt-${teacherId}-${date}`, lihat StudentDashboard.tsx) supaya scan dan
// input manual untuk guru+tanggal yang sama menimpa baris yang sama,
// bukan jadi baris kembar.
export const createScanTeacherAttendance = (
  teacher: Teacher,
  existing: TeacherAttendanceRecord | undefined
): { record: TeacherAttendanceRecord | null; message: string; kind: 'success' | 'info' | 'error' } => {
  const date = todayDateKey();

  if (existing?.status === 'Hadir') {
    return {
      record: null,
      kind: 'info',
      message: `${teacher.name} sudah tercatat hadir hari ini`,
    };
  }

  const record: TeacherAttendanceRecord = {
    id: existing?.id ?? `tatt-${teacher.id}-${date}`,
    teacherId: teacher.id,
    teacherName: teacher.name,
    date,
    status: 'Hadir',
    recordedBy: 'Scan Kartu Barcode',
  };

  return {
    record,
    kind: 'success',
    message: `Hadir — ${teacher.name}`,
  };
};

export const mergeTeacherAttendanceRecord = (
  records: TeacherAttendanceRecord[],
  record: TeacherAttendanceRecord
): TeacherAttendanceRecord[] => {
  const idx = records.findIndex((r) => r.id === record.id);
  if (idx >= 0) {
    const copy = [...records];
    copy[idx] = record;
    return copy;
  }
  return [...records, record];
};
