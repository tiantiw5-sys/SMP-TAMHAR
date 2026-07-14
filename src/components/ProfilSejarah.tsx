/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

const FOUNDERS_IMAGE =
  'https://lh3.googleusercontent.com/d/1eKLOgwJwwB9u1qYf-XfRR3ttsO2pRsIH';

const HISTORY_PARAGRAPHS = [
  'SMP Taman Harapan berada di bawah naungan Yayasan Pendidikan Islam Swasembada (YPIS) Taman Harapan yang didirikan oleh Almarhum Drs. H.M. Thoib (1931 – 2010) dan Almarhumah Hj. Djuriah (1939 – 2009). YPIS terdiri dari beberapa Unit Satuan Pendidikan yaitu KB-TK, SD, SMP, SMA, SMK TAMAN HARAPAN 1 dan 2.',
  'YPIS berpengalaman dalam menyelenggarakan pendidikan formal sejak tahun 1972 di Setiabudi, Jakarta Selatan. Secara resmi pada tahun 1975 dengan membuka SD, kemudian SMP pada tahun 1976 dan SMEA pada tahun 1977.',
  'Pada tahun 1994 lokasi sekolah berpindah ke Bekasi, tepatnya di Kompleks Perumahan Taman Harapan Baru, Pejuang, Medan Satria, dan membuka untuk jenjang SD dan SMP (1994), TK (1995), SMA (1996) dan SMK (2000), serta membuka cabang SMP dan SMA Taman Harapan 2 di Bulak Sentul, Harapan Jaya, Bekasi pada tahun 2007.',
];

export default function ProfilSejarah() {
  return (
    <div className="rounded-3xl border border-slate-800 bg-[#0b203a] overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-0">
        {/* Foto pendiri */}
        <div className="md:col-span-4 lg:col-span-5 relative min-h-[280px] md:min-h-[360px] bg-[#091629]">
          <img
            src={FOUNDERS_IMAGE}
            alt="Almarhum Drs. H.M. Thoib dan Almarhumah Hj. Djuriah, pendiri YPIS Taman Harapan"
            className="absolute inset-0 w-[185%] max-w-none h-full object-cover object-left"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#0b203a]/20 to-[#0b203a]/90 md:to-[#0b203a]/60" />
        </div>

        {/* Teks sejarah */}
        <div className="md:col-span-8 lg:col-span-7 p-6 sm:p-8 flex flex-col justify-center min-w-0">
          <h3 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
            <span className="text-white">Profil & </span>
            <span className="text-emerald-400">Sejarah</span>
          </h3>

          <div className="flex items-center gap-3 my-4">
            <div className="h-px flex-1 bg-amber-400/40" />
            <svg className="w-5 h-5 text-amber-400 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2C8 6 4 8 4 12c0 3.3 2.7 6 6 6h4c3.3 0 6-2.7 6-6 0-4-4-6-8-10z" />
            </svg>
            <div className="h-px flex-1 bg-amber-400/40" />
          </div>

          <div className="space-y-4 text-sm sm:text-[15px] text-slate-200 leading-relaxed">
            {HISTORY_PARAGRAPHS.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </div>
      </div>

      {/* Slogan */}
      <div className="px-6 sm:px-8 py-4 bg-[#071324] border-t border-slate-800">
        <p className="text-sm sm:text-base text-white font-bold">
          Slogan Utama{' '}
          <span className="text-emerald-400">&quot;Bermata Hati&quot;</span>
        </p>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Kejujuran nurani dalam belajar, bersosialisasi, dan beribadah.
        </p>
      </div>
    </div>
  );
}
