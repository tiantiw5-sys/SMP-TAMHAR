/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Aturan kekuatan password dipakai di SEMUA jalur ganti/atur password
// (ganti wajib login pertama, ganti password sendiri, reset akun lain,
// & buat akun baru) — supaya konsisten satu aturan di seluruh aplikasi,
// bukan dicek terpisah-pisah dengan aturan beda-beda di tiap form.
export function validatePasswordStrength(password: string): string | null {
  if (password.length < 8) return 'Password minimal 8 karakter.';
  if (!/[A-Z]/.test(password)) return 'Password harus mengandung minimal 1 huruf besar.';
  if (!/[0-9]/.test(password)) return 'Password harus mengandung minimal 1 angka.';
  return null;
}

export function formatWhatsAppUrl(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const normalized = digits.startsWith('62')
    ? digits
    : digits.startsWith('0')
      ? `62${digits.slice(1)}`
      : digits;
  return `https://wa.me/${normalized}`;
}
