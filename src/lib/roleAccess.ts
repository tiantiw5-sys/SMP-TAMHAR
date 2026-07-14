/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { User } from '../types';

/** Role yang boleh akses absensi murid, scanner kiosk, dan cetak kartu barcode. */
export const MURID_ATTENDANCE_ROLES = [
  'Super Admin',
  'Managerial Sekolah',
  'Guru Piket',
] as const;

export type MuridAttendanceRole = (typeof MURID_ATTENDANCE_ROLES)[number];

export function canAccessMuridAttendance(role: User['role']): boolean {
  return (MURID_ATTENDANCE_ROLES as readonly string[]).includes(role);
}