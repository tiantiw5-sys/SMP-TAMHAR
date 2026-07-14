/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Helper tema musiman — dipakai IndependenceDayBanner & Hero supaya logika
 * "lagi Agustus atau bukan" cuma didefinisikan sekali.
 */

const INDEPENDENCE_YEAR = 1945;

export function isIndependenceMonth(): boolean {
  return new Date().getMonth() === 7; // 0-indexed: Januari=0 ... Agustus=7
}

export function independenceAnniversary(): number {
  return new Date().getFullYear() - INDEPENDENCE_YEAR;
}
