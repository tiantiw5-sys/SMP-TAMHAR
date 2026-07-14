/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Banner musiman HUT Kemerdekaan RI — landing page saja, tampil otomatis
 * sepanjang bulan Agustus (evergreen, cek tanggal berjalan, jadi tidak
 * perlu diaktifkan/dimatikan manual tiap tahun). Bisa ditutup manual
 * (per sesi tab, bukan permanen) kalau mengganggu.
 */

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { independenceAnniversary, isIndependenceMonth } from '../lib/seasonalTheme';

export default function IndependenceDayBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (!isIndependenceMonth() || dismissed) return null;

  const anniversary = independenceAnniversary();

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-red-700 via-red-600 to-red-700 text-white">
      <div className="absolute inset-0 opacity-10 pointer-events-none" aria-hidden="true">
        <div className="absolute -top-6 -left-6 w-32 h-32 rounded-full bg-white blur-2xl" />
        <div className="absolute -bottom-6 -right-6 w-32 h-32 rounded-full bg-white blur-2xl" />
      </div>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-center gap-3 text-center">
        <span className="text-lg shrink-0" aria-hidden="true">🇮🇩</span>
        <p className="text-xs sm:text-sm font-bold tracking-wide">
          Dirgahayu Republik Indonesia ke-{anniversary}! Merdeka!
        </p>
        <span className="text-lg shrink-0" aria-hidden="true">🇮🇩</span>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Tutup banner"
          className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 text-white/70 hover:text-white cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="h-1 w-full bg-gradient-to-r from-red-700 via-white to-red-700" />
    </div>
  );
}
