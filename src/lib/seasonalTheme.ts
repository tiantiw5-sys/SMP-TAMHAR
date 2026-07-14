/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Helper tema musiman — dipakai IndependenceDayBanner & Hero supaya logika
 * "lagi Agustus atau bukan" cuma didefinisikan sekali.
 */

const INDEPENDENCE_YEAR = 1945;

// Override manual buat pratinjau kapan saja tanpa perlu menunggu Agustus
// atau mengubah jam sistem — buka halaman dengan ?tema-preview=agustus.
// Cuma baca query string, tidak pernah ditulis/disimpan di mana pun.
function previewOverride(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('tema-preview') === 'agustus';
}

export function isIndependenceMonth(): boolean {
  if (previewOverride()) return true;
  return new Date().getMonth() === 7; // 0-indexed: Januari=0 ... Agustus=7
}

export function independenceAnniversary(): number {
  return new Date().getFullYear() - INDEPENDENCE_YEAR;
}
