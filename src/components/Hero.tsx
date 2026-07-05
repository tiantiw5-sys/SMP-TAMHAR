/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowRight, Play, CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';
import SchoolLogo from './SchoolLogo';

interface HeroProps {
  onExploreCourses: () => void;
  onHowItWorks: () => void;
  onPlayDemo: () => void;
}

export default function Hero({ onExploreCourses, onHowItWorks, onPlayDemo }: HeroProps) {
  return (
    <section id="home" className="relative bg-[#0b1a30] text-white pt-12 pb-24 overflow-hidden">
      
      {/* Decorative background video (VideoFX) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover"
          poster="https://labs.google/fx/api/og-video/thumbnail/shared/6b4363ad-f42a-45a8-b93e-01ce10d847c2"
        >
          <source src="https://labs.google/fx/api/og-video/shared/6b4363ad-f42a-45a8-b93e-01ce10d847c2" type="video/mp4" />
        </video>
        {/* Dark overlay to ensure readability of white text */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0b1a30]/85 via-[#0b1a30]/90 to-[#0b1a30]/98" />
      </div>
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Headline and Call-to-actions */}
          <div className="lg:col-span-6 space-y-8 text-left">
            <motion.div 
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-4"
            >
              <div className="inline-flex items-center space-x-2 bg-amber-400/10 border border-amber-400/20 text-amber-300 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase">
                <SchoolLogo className="w-4 h-4 rounded-full bg-white" />
                <span>Penerimaan Peserta Didik Baru (PPDB)</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-[46px] font-extrabold tracking-tight leading-tight font-display">
                SMP TAMAN HARAPAN<br />
                BEKASI<br />
                <span className="text-amber-400 relative">
                  Bermata Hati.
                  <svg className="absolute -bottom-2 left-0 w-full h-2 text-amber-400/40" viewBox="0 0 100 10" preserveAspectRatio="none">
                    <path d="M0,5 C30,9 70,1 100,5" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" />
                  </svg>
                </span>
              </h1>
            </motion.div>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-base text-slate-300 font-sans max-w-xl leading-relaxed"
            >
              "Membangun Generasi Berkarakter, Berprestasi, dan Bermata Hati." Daftarkan putra-putri Anda segera di SMP Taman Harapan Bekasi. Kami berkomitmen membentuk siswa cerdas yang beriman, mandiri, berakhlak mulia, serta peduli sosial spiritual.
            </motion.p>

            {/* CTAs */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-4 sm:space-y-0 sm:space-x-4"
            >
              <a
                href="https://wa.me/628992226147"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-center space-x-2 bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold px-8 py-4 rounded-xl transition-all shadow-lg shadow-amber-400/10 hover:shadow-amber-400/20 cursor-pointer text-center"
                id="hero-explore-btn"
              >
                <span>Daftar PPDB Online</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>

              <button
                onClick={onHowItWorks}
                className="flex items-center justify-center space-x-3 px-8 py-4 rounded-xl font-bold border border-slate-700 hover:bg-slate-800 text-white transition-colors cursor-pointer"
                id="hero-howitworks-btn"
              >
                <div className="bg-slate-800 border border-slate-700 p-1 rounded-full text-amber-400">
                  <Play className="w-4 h-4 fill-amber-400" />
                </div>
                <span>Profil & Visi Misi</span>
              </button>
            </motion.div>

            {/* Already learning avatars replaced by new logo */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex items-center gap-4 pt-4 border-t border-slate-800/80"
            >
              <img
                src="https://lh3.googleusercontent.com/d/1YHLA5Oq0nTIdAENoRdmtNA_QBik4ZHIq"
                alt="SMP Taman Harapan Logo"
                className="h-12 w-auto object-contain shrink-0"
                referrerPolicy="no-referrer"
              />
              <p className="text-sm text-slate-400 font-medium">
                Siswa aktif belajar, mengukir prestasi, dan mengasah mata hati.
              </p>
            </motion.div>
          </div>

          {/* Right Column: Hero Visuals & Live Progress Badge overlays */}
          <div className="lg:col-span-6 relative flex justify-center">
            
            {/* The Main Student Visual */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="relative w-full max-w-[450px] aspect-[3/4] rounded-3xl overflow-hidden border border-slate-800 shadow-2xl group"
            >
              <img
                src="https://lh3.googleusercontent.com/d/1-EU7yxqLPlSGAHvRkntaQsAk8DFsJnEo"
                alt="Siswa SMP Taman Harapan belajar bersama di kelas"
                className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-700"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
            </motion.div>

            {/* Overlap Card 1: Your Progress */}
            <motion.div
              initial={{ opacity: 0, x: 50, y: -20 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3, type: 'spring' }}
              className="absolute -top-6 right-2 sm:-right-6 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-xl w-60 text-left"
              id="hero-progress-card"
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Kuota PPDB Terisi</span>
                <span className="text-base font-bold text-amber-400">85%</span>
              </div>
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden mb-2">
                <div className="bg-amber-400 h-full rounded-full w-[85%] animate-pulse" />
              </div>
              <p className="text-[11px] text-slate-300 font-medium">
                Kursi Yang Tersisa Terbatas
              </p>
            </motion.div>

          </div>

        </div>
      </div>
    </section>
  );
}
