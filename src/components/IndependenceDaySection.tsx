/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Section musiman HUT Kemerdekaan RI — landing page saja, di antara Hero
 * dan Galeri. Tampil otomatis sepanjang bulan Agustus (lihat
 * lib/seasonalTheme.ts), evergreen tiap tahun tanpa perlu disentuh lagi.
 * Gaya: latar merah pekat + kartu putih membulat mengambang, terinspirasi
 * referensi desain yang dikasih user (kontras berani, bukan banner tipis).
 */

import React from 'react';
import { independenceAnniversary, isIndependenceMonth } from '../lib/seasonalTheme';

export default function IndependenceDaySection() {
  if (!isIndependenceMonth()) return null;

  const anniversary = independenceAnniversary();

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-red-800 via-red-700 to-red-900 py-16 sm:py-20">
      {/* Watermark dekoratif — teks besar transparan, terinspirasi gaya wordmark raksasa di referensi */}
      <div
        className="absolute inset-0 pointer-events-none select-none overflow-hidden flex items-center justify-end"
        aria-hidden="true"
      >
        <span className="text-[18vw] sm:text-[14vw] font-black text-white/5 leading-none whitespace-nowrap -mr-8 sm:mr-0">
          MERDEKA
        </span>
      </div>
      <div className="absolute -top-24 -left-24 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Kartu putih mengambang — pesan utama */}
          <div className="lg:col-span-7 bg-white rounded-3xl shadow-2xl p-8 sm:p-10">
            <div className="inline-flex items-center gap-2 bg-red-700/10 text-red-700 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-5">
              <span aria-hidden="true">🇮🇩</span>
              HUT Kemerdekaan RI
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 leading-[1.1] mb-4">
              Dirgahayu Republik<br />Indonesia ke-{anniversary}!
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-lg">
              Segenap keluarga besar SMP Taman Harapan Bekasi mengucapkan Selamat Hari Kemerdekaan.
              Mari terus membangun generasi yang berkarakter, berprestasi, dan cinta tanah air. Merdeka!
            </p>
          </div>

          {/* Angka besar — mengisi ruang kanan seperti mockup browser di referensi */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center text-center gap-2">
            <span className="text-white/90 text-xs font-black uppercase tracking-[0.3em]">Ke-</span>
            <span className="text-white text-[7rem] sm:text-[9rem] font-black leading-none drop-shadow-lg">
              {anniversary}
            </span>
            <span className="text-white/90 text-sm font-bold tracking-wide">17 Agustus 1945 — {1945 + anniversary}</span>
          </div>
        </div>
      </div>

      <div className="relative h-2 w-full mt-16 sm:mt-20 bg-gradient-to-r from-red-800 via-white to-red-800" />
    </section>
  );
}
