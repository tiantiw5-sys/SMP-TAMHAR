/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowRight, Play, Megaphone, GraduationCap, BookOpen, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import {
  AKREDITASI_IMAGE_URL,
  PPDB_HERO_IMAGE_URL,
  PPDB_PROMO_IMAGE_URL,
  PPDB_FORM_URL,
  DIGITAL_MPLS_URL,
  STAR_LEARNING_URL,
} from '../orgStructure';

interface HeroProps {
  onExploreCourses: () => void;
  onHowItWorks: () => void;
  onPlayDemo: () => void;
}

function AndroidLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993.0003.5511-.4482.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.2439 13.8533 7.8508 12 7.8508s-3.5902.3931-5.1367 1.0989L4.841 5.4467a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3435-4.1021-2.6892-7.5743-6.1185-9.4396" />
    </svg>
  );
}

export default function Hero({ onHowItWorks }: HeroProps) {

  return (
    <section id="home" className="relative bg-[#071324] text-white pt-12 pb-24 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover opacity-70"
          poster="https://labs.google/fx/api/og-video/thumbnail/shared/6b4363ad-f42a-45a8-b93e-01ce10d847c2"
        >
          <source src="https://labs.google/fx/api/og-video/shared/6b4363ad-f42a-45a8-b93e-01ce10d847c2" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-[#071324]/60 via-[#071324]/70 to-[#071324]/95" />
      </div>
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          <div className="lg:col-span-7 space-y-6 text-left">
            <motion.div
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6 relative z-30"
            >
              <div className="relative z-50 flex-shrink-0 w-32 h-32 sm:w-36 sm:h-36 transform hover:scale-105 transition-transform duration-300 self-start">
                <img
                  src={AKREDITASI_IMAGE_URL}
                  alt="Akreditasi SMP Taman Harapan"
                  className="w-full h-full object-contain filter drop-shadow-md"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="inline-block">
                <div className="inline-flex items-center space-x-2 bg-amber-400/10 border border-amber-400/25 text-amber-300 px-4 py-2 rounded-full text-xs font-bold tracking-wider uppercase">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                  <span>Penerimaan Peserta Didik Baru (PPDB)</span>
                </div>
              </div>

              <div className="space-y-1">
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[46px] font-extrabold tracking-tight leading-[1.1] font-sans">
                  <span className="block whitespace-nowrap">SMP TAMAN HARAPAN</span>
                  Bekasi
                  <br />
                  <span className="text-amber-400 relative inline-block mt-1">
                    Bermata Hati.
                    <svg className="absolute -bottom-2 left-0 w-full h-2 text-amber-400/40" viewBox="0 0 100 10" preserveAspectRatio="none">
                      <path d="M0,5 C30,9 70,1 100,5" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" />
                    </svg>
                  </span>
                </h1>
              </div>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-sm sm:text-base text-slate-300 font-sans max-w-xl leading-relaxed"
            >
              &quot;Membangun Generasi Berkarakter, Berprestasi, dan Bermata Hati.&quot; Daftarkan putra-putri Anda segera di SMP Taman Harapan Bekasi. Kami berkomitmen membentuk siswa cerdas yang beriman, mandiri, berakhlak mulia, serta peduli sosial spiritual.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 pt-2"
            >
              <a
                href={PPDB_FORM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-center space-x-2 bg-amber-400 hover:bg-amber-300 text-slate-900 font-extrabold px-8 py-3.5 rounded-xl transition-all shadow-lg shadow-amber-400/10 hover:shadow-amber-400/20 cursor-pointer text-center text-sm"
                id="hero-explore-btn"
              >
                <span>Daftar Formulir Online</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>

              <button
                onClick={onHowItWorks}
                className="flex items-center justify-center space-x-2 px-8 py-3.5 rounded-xl font-bold border border-slate-800 hover:bg-slate-900 text-slate-200 hover:text-white transition-all cursor-pointer text-sm"
                id="hero-howitworks-btn"
              >
                <div className="bg-slate-800 border border-slate-700 p-1 rounded-full text-amber-400 shrink-0">
                  <Play className="w-3 h-3 fill-amber-400" />
                </div>
                <span>Profil & Visi Misi</span>
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="flex flex-wrap items-center gap-2.5"
            >
              <a
                href="https://drive.google.com/uc?export=download&id=1U_nQy5KqMOhm8ifXDmUYvru0J8yqhuLg"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-white hover:bg-slate-100 text-slate-900 shadow-md transition-all cursor-pointer text-sm font-bold"
                id="hero-download-apk-btn"
              >
                <AndroidLogo className="w-4 h-4 text-slate-900" />
                <span>Download APK</span>
              </a>

              <a
                href="#pengumuman-kelas"
                className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 border border-blue-400/30 hover:border-blue-400/50 text-blue-200 hover:text-blue-100 transition-all cursor-pointer text-sm font-bold"
                id="hero-pengumuman-kelas-btn"
              >
                <Megaphone className="w-4 h-4 text-blue-300" />
                <span>Pengumuman Kelas</span>
              </a>

              <a
                href={DIGITAL_MPLS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/30 hover:border-emerald-400/50 text-emerald-200 hover:text-emerald-100 transition-all cursor-pointer text-sm font-bold"
                id="hero-digital-mpls-btn"
                title="Beyond The Stars — Panduan Digital MPLS"
              >
                <GraduationCap className="w-4 h-4 text-emerald-300" />
                <span>Digital MPLS</span>
                <ArrowRight className="w-3.5 h-3.5 text-emerald-300" />
              </a>

              <a
                href={STAR_LEARNING_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/30 hover:border-sky-400/50 text-sky-200 hover:text-sky-100 transition-all cursor-pointer text-sm font-bold"
                id="hero-star-learning-btn"
                title="Star-Learning — LMS SMP Taman Harapan"
              >
                <Sparkles className="w-4 h-4 text-sky-300" />
                <span>StarLearning</span>
                <ArrowRight className="w-3.5 h-3.5 text-sky-300" />
              </a>

              <a
                href="#pelajaran"
                className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-violet-500/15 hover:bg-violet-500/25 border border-violet-400/30 hover:border-violet-400/50 text-violet-200 hover:text-violet-100 transition-all cursor-pointer text-sm font-bold"
                id="hero-pelajaran-btn"
              >
                <BookOpen className="w-4 h-4 text-violet-300" />
                <span>Mata Pelajaran</span>
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex items-center gap-4 pt-6 border-t border-slate-800/60"
            >
              <img
                src="https://lh3.googleusercontent.com/d/1YHLA5Oq0nTIdAENoRdmtNA_QBik4ZHIq"
                alt="SMP Taman Harapan Badges"
                className="h-10 w-auto object-contain shrink-0"
                referrerPolicy="no-referrer"
              />
              <p className="text-xs text-slate-400 font-medium leading-relaxed">
                Siswa aktif belajar, mengukur prestasi, dan mengasah mata hati.
              </p>
            </motion.div>
          </div>

          <div className="lg:col-span-5 relative">
            <div className="relative w-full max-w-[450px] aspect-[4/5] mx-auto rounded-3xl overflow-hidden border border-slate-800 bg-[#0a1727] shadow-2xl">
              <img
                src={PPDB_HERO_IMAGE_URL}
                alt="Siswa SMP Taman Harapan belajar bersama di kelas"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
              <div className="absolute top-4 right-4 bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-xl w-52 text-left">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">KUOTA PPDB TERISI</span>
                  <span className="text-sm font-black text-amber-400">85%</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-1.5">
                  <div className="bg-amber-400 h-full rounded-full w-[85%] animate-pulse" />
                </div>
                <p className="text-[10px] text-slate-400 font-bold leading-none">Kursi Yang Tersisa Terbatas</p>
              </div>
              <div className="absolute bottom-4 left-4 z-20 select-none transform hover:scale-105 transition-transform duration-300">
                <img
                  src={PPDB_PROMO_IMAGE_URL}
                  alt="Promo PPDB"
                  className="w-56 sm:w-64 h-auto object-contain filter drop-shadow-[0_8px_32px_rgba(0,0,0,0.7)]"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}