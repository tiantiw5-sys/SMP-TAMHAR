/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const PORTAL_TITLE = 'Portal SMP Taman Harapan Bekasi';
export const PORTAL_DESCRIPTION =
  'Portal resmi SMP Taman Harapan Bekasi — Bermata Hati. Informasi PPDB, berita sekolah, dan Portal ERP OSIS internal.';

export const CONTACT_PHONE = '(021) 88965432';
export const CONTACT_WHATSAPP = '08992226147';
export const CONTACT_WHATSAPP_INTL = '628992226147';

/**
 * Domain login internal — dicoba berurutan saat sign-in, supaya siapa pun
 * yang bikin akun manual di Supabase Dashboard dengan salah satu domain ini
 * tetap bisa login cukup ketik ID pendek (mis. "farhan"), tanpa perlu tahu/
 * ketik domain di belakangnya.
 */
export const STAFF_LOGIN_EMAIL_SUFFIXES = ['@smptamhar.com', '@tamhar.com', '@tamhar.local'] as const;

export const STAFF_LOGIN_EMAIL_SUFFIX = STAFF_LOGIN_EMAIL_SUFFIXES[0];

export const staffLoginEmails = (loginId: string): string[] => {
  const raw = loginId.trim().toLowerCase();
  if (raw.includes('@')) return [raw];
  return STAFF_LOGIN_EMAIL_SUFFIXES.map((suffix) => `${raw}${suffix}`);
};

export const staffLoginEmail = (loginId: string): string => staffLoginEmails(loginId)[0];

// Daftar kelas aktif tahun ajaran 2026/2027 — 7A/B/C ikut disiapkan duluan
// meski rombelnya baru terbentuk setelah PPDB & MPLS (13-17 Juli 2026)
// selesai, supaya opsi kelas ini tidak perlu ditambah manual lagi begitu
// murid baru masuk.
export const CLASS_ROSTER_OPTIONS = [
  '7A', '7B', '7C',
  '8A', '8B', '8C',
  '9A', '9B', '9C',
] as const;

export const NAV_ITEMS = [
  { id: 'home', label: 'Beranda' },
  { id: 'courses', label: 'Berita & Artikel' },
  { id: 'program-unggulan', label: 'Keunggulan' },
  { id: 'uniforms', label: 'Seragam' },
  { id: 'pricing', label: 'PPDB 2026/2027' },
  { id: 'profil-sekolah', label: 'Profile Sekolah' },
] as const;