/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GraduationCap, BookOpen, Compass, Lightbulb, TrendingUp, Languages, Star } from 'lucide-react';

export default function FeaturesBar() {
  const programs = [
    {
      icon: <GraduationCap className="w-6 h-6" />,
      title: 'Integrated Islamic Curriculum',
      titleInd: 'Kurikulum Islam Terpadu',
      description: 'Mengintegrasikan kurikulum nasional dengan nilai-nilai keislaman secara holistik. Membentuk siswa yang tidak hanya unggul secara akademis tetapi juga kokoh dalam karakter akhlakul karimah.'
    },
    {
      icon: <BookOpen className="w-6 h-6" />,
      title: "Al-Qur'an Intensive Program",
      titleInd: "Program Intensif Al-Qur'an",
      description: 'Program unggulan bimbingan tilawah, tahsin, dan tahfizh Al-Qur\'an dengan metode interaktif. Menargetkan hafalan juz pilihan serta menumbuhkan kecintaan mendalam terhadap Al-Qur\'an.'
    },
    {
      icon: <Compass className="w-6 h-6" />,
      title: 'Islamic Leadership Skill',
      titleInd: 'Kepemimpinan Islam',
      description: 'Menanamkan jiwa kepemimpinan yang amanah, mandiri, dan bertanggung jawab meneladani Rasulullah SAW. Melatih kepercayaan diri siswa melalui kegiatan organisasi, latihan dasar kepemimpinan, dan bakti sosial.'
    },
    {
      icon: <Lightbulb className="w-6 h-6" />,
      title: 'Creative Thinking Skill',
      titleInd: 'Keterampilan Berpikir Kreatif',
      description: 'Mengembangkan pola pikir kritis, inovatif, dan analitis dalam memecahkan masalah. Siswa didorong untuk bereksplorasi secara bebas melalui proyek sains kreatif, seni, dan teknologi modern.'
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: 'Muslimpreneurship',
      titleInd: 'Kewirausahaan Muslim',
      description: 'Membekali siswa dengan mentalitas wirausaha islami yang jujur, mandiri, dan tangguh sejak dini. Melalui simulasi bisnis riil dan praktik langsung, siswa diajarkan dasar manajemen keuangan dan etika niaga syariah.'
    },
    {
      icon: <Languages className="w-6 h-6" />,
      title: 'English & Arabic Communication Skills',
      titleInd: 'Keterampilan Komunikasi Dwibahasa',
      description: 'Program pembiasaan komunikasi aktif bahasa Inggris dan bahasa Arab untuk membangun rasa percaya diri di kancah global. Dilengkapi dengan forum debat, presentasi, serta lingkungan belajar yang komunikatif.'
    }
  ];

  return (
    <section id="program-unggulan" className="bg-white py-14 border-y border-emerald-50 relative overflow-hidden">
      {/* Decorative premium background blobs */}
      <div className="absolute top-0 left-1/4 w-72 h-72 bg-emerald-50/40 rounded-full mix-blend-multiply filter blur-3xl opacity-20 -z-10 pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-amber-50/40 rounded-full mix-blend-multiply filter blur-3xl opacity-20 -z-10 pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header Section */}
        <div className="text-center space-y-3 max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center space-x-1.5 text-emerald-700 font-extrabold text-[10px] uppercase tracking-widest bg-emerald-50 border border-emerald-100 px-3.5 py-1.5 rounded-full">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span>Program Unggulan Sekolah</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display">
            Program Unggulan <span className="text-emerald-700">SMP Taman Harapan</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
            Membentuk generasi cerdas secara akademis, kokoh dalam karakter keislaman, serta siap menyongsong masa depan yang gemilang.
          </p>
        </div>

        {/* Responsive Grid - Optimized spacing and gaps */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {programs.map((program, idx) => (
            <div 
              key={idx} 
              className="relative group bg-white border border-emerald-100/80 rounded-xl p-5 sm:p-6 shadow-sm hover:shadow-lg hover:shadow-emerald-950/5 hover:-translate-y-1 transition-all duration-300 flex flex-col items-start text-left"
              id={`program-card-${idx}`}
            >
              {/* Subtle Gold line accent at top of card on hover */}
              <div className="absolute top-0 left-0 w-0 h-1 bg-gradient-to-r from-emerald-600 to-amber-400 rounded-t-xl group-hover:w-full transition-all duration-500"></div>
              
              {/* Elegant Islamic-themed geometric icon container (Rub el Hizb shape) */}
              <div className="mb-4 relative w-11 h-11 flex items-center justify-center shrink-0 transition-transform duration-500 group-hover:rotate-12">
                <div className="absolute inset-0 bg-emerald-50 rounded border border-emerald-100"></div>
                <div className="absolute inset-0 bg-emerald-50 rounded border border-emerald-100 transform rotate-45"></div>
                <div className="relative text-emerald-700 z-10 flex items-center justify-center scale-90">
                  {program.icon}
                </div>
                {/* Decorative gold dot accent */}
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-400 rounded-full z-20 border border-white"></div>
              </div>

              {/* Title and Badge */}
              <div className="space-y-1.5 mb-2.5">
                <h3 className="text-base font-black text-slate-900 tracking-tight leading-snug group-hover:text-emerald-700 transition-colors duration-200 font-sans">
                  {program.titleInd}
                </h3>
                <span className="inline-block text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 uppercase tracking-wider font-mono">
                  {program.title}
                </span>
              </div>

              {/* Description */}
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-medium">
                {program.description}
              </p>
              
              {/* Subtle Arrow indicator on bottom right on hover */}
              <div className="absolute bottom-5 right-5 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
