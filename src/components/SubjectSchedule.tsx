/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Jadwal Mata Pelajaran — halaman publik (tanpa login), mobile-first,
 * tema cyberpunk (neon di atas latar nyaris hitam, kontras tinggi).
 * Model navigasinya sama seperti menu "Jadwal Mengajar" di dashboard
 * (pilih hari Senin-Jumat, baris per jam) dan membaca koleksi
 * `teachingSchedule` yang SAMA — perubahan lewat Mode Edit di dashboard
 * otomatis tampil di sini juga. Disusun per KELAS (satu kelas dilihat
 * sekaligus, bukan tabel lebar semua kelas) dan menonjolkan NAMA MATA
 * PELAJARAN — bukan kode guru. Mapel diresolusi dari nama guru yang
 * tercatat di `teachingSchedule` dengan mencocokkan `Teacher.subject`.
 */

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, BookOpen, ChevronDown, Radio, Sparkles, Users2, Zap } from 'lucide-react';
import type { Teacher, TeachingScheduleDay } from '../types';
import SchoolLogo from './SchoolLogo';

interface SubjectScheduleProps {
  teachers: Teacher[];
  teachingSchedule: TeachingScheduleDay[];
  initialClass?: string;
}

const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'] as const;

// Palet neon — teks warna penuh (bukan pastel redup) + efek glow lewat
// drop-shadow(currentColor), supaya kontras tetap tinggi di latar gelap.
const SUBJECT_COLORS = [
  { text: 'text-cyan-300', border: 'border-cyan-400/70', dot: 'bg-cyan-400', bg: 'bg-cyan-400/10', ring: 'shadow-[0_0_18px_rgba(34,211,238,0.35)]' },
  { text: 'text-fuchsia-300', border: 'border-fuchsia-400/70', dot: 'bg-fuchsia-400', bg: 'bg-fuchsia-400/10', ring: 'shadow-[0_0_18px_rgba(232,121,249,0.35)]' },
  { text: 'text-lime-300', border: 'border-lime-400/70', dot: 'bg-lime-400', bg: 'bg-lime-400/10', ring: 'shadow-[0_0_18px_rgba(163,230,53,0.35)]' },
  { text: 'text-violet-300', border: 'border-violet-400/70', dot: 'bg-violet-400', bg: 'bg-violet-400/10', ring: 'shadow-[0_0_18px_rgba(167,139,250,0.35)]' },
  { text: 'text-yellow-300', border: 'border-yellow-400/70', dot: 'bg-yellow-400', bg: 'bg-yellow-400/10', ring: 'shadow-[0_0_18px_rgba(250,204,21,0.35)]' },
  { text: 'text-sky-300', border: 'border-sky-400/70', dot: 'bg-sky-400', bg: 'bg-sky-400/10', ring: 'shadow-[0_0_18px_rgba(56,189,248,0.35)]' },
  { text: 'text-rose-300', border: 'border-rose-400/70', dot: 'bg-rose-400', bg: 'bg-rose-400/10', ring: 'shadow-[0_0_18px_rgba(251,113,133,0.35)]' },
  { text: 'text-orange-300', border: 'border-orange-400/70', dot: 'bg-orange-400', bg: 'bg-orange-400/10', ring: 'shadow-[0_0_18px_rgba(251,146,60,0.35)]' },
];

function colorForSubject(subject: string) {
  let hash = 0;
  for (let i = 0; i < subject.length; i++) hash = (hash * 31 + subject.charCodeAt(i)) >>> 0;
  return SUBJECT_COLORS[hash % SUBJECT_COLORS.length];
}

// Beberapa slot di jadwal sumber (dokumen "PEMBAGIAN TUGAS GURU") belum
// diisi guru tetap — namanya berupa placeholder cadangan/bilingual, bukan
// nama orang, tapi tetap mewakili satu mata pelajaran yang pasti.
const PLACEHOLDER_SUBJECTS: Record<string, string> = {
  'Guru IPA (Cadangan)': 'IPA',
  'Guru B. Inggris (Cadangan)': 'Bahasa Inggris',
  'Native Speaker (Program Bilingual)': 'Bahasa Inggris (Bilingual)',
};

function todayScheduleDay(): (typeof DAYS)[number] {
  const idx = new Date().getDay(); // 0=Minggu .. 6=Sabtu
  const map: Record<number, (typeof DAYS)[number] | undefined> = {
    1: 'Senin', 2: 'Selasa', 3: 'Rabu', 4: 'Kamis', 5: 'Jumat',
  };
  return map[idx] ?? 'Senin';
}

export default function SubjectSchedule({ teachers, teachingSchedule, initialClass }: SubjectScheduleProps) {
  const classColumns = useMemo(() => {
    const set = new Set<string>();
    for (const day of teachingSchedule) {
      for (const slot of day.slots) {
        if (slot.classes) Object.keys(slot.classes).forEach((c) => set.add(c));
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'id', { numeric: true }));
  }, [teachingSchedule]);

  const [selectedClass, setSelectedClass] = useState<string>(
    initialClass && classColumns.includes(initialClass) ? initialClass : classColumns[0] ?? ''
  );
  const [selectedDay, setSelectedDay] = useState<(typeof DAYS)[number]>(todayScheduleDay());
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const teacherByName = useMemo(() => {
    const map = new Map<string, Teacher>();
    for (const t of teachers) map.set(t.name, t);
    return map;
  }, [teachers]);

  const activeDay = useMemo(
    () => teachingSchedule.find((d) => d.day === selectedDay) ?? null,
    [teachingSchedule, selectedDay]
  );

  const lessonSlots = useMemo(
    () => (activeDay?.slots ?? []).filter((s) => !s.activity && s.classes?.[selectedClass]),
    [activeDay, selectedClass]
  );

  const subjectCount = useMemo(() => {
    const set = new Set<string>();
    for (const slot of lessonSlots) {
      const teacherName = slot.classes?.[selectedClass];
      const subject = teacherName
        ? teacherByName.get(teacherName)?.subject ?? PLACEHOLDER_SUBJECTS[teacherName]
        : undefined;
      if (subject) set.add(subject);
    }
    return set.size;
  }, [lessonSlots, selectedClass, teacherByName]);

  const goBack = () => {
    window.location.hash = '';
  };

  return (
    <div className="min-h-screen bg-black text-slate-100 font-sans relative">
      {/* Grid neon latar belakang, mati-mati sinyal khas cyberpunk */}
      <div
        className="fixed inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage:
            'linear-gradient(rgba(34,211,238,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.08) 1px, transparent 1px)',
          backgroundSize: '34px 34px',
        }}
      />
      <div className="fixed -top-32 -left-24 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed -bottom-32 -right-24 w-80 h-80 bg-fuchsia-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10">
        <header className="sticky top-0 z-20 bg-black/90 backdrop-blur-md border-b border-cyan-400/20 px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <SchoolLogo className="w-9 h-9 shrink-0" />
            <div className="min-w-0">
              <h1 className="font-black text-sm sm:text-base tracking-wide flex items-center gap-2 truncate">
                <BookOpen className="w-4 h-4 text-cyan-400 shrink-0 drop-shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
                <span className="bg-gradient-to-r from-cyan-300 via-white to-fuchsia-300 bg-clip-text text-transparent uppercase">
                  Jadwal Mata Pelajaran
                </span>
              </h1>
              <p className="text-[11px] text-cyan-400/60 truncate font-mono">SMP TAMAN HARAPAN BEKASI</p>
            </div>
          </div>
          <button
            type="button"
            onClick={goBack}
            className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl bg-white/5 border border-cyan-400/30 text-cyan-200 hover:text-white hover:border-cyan-400/60 hover:bg-cyan-400/10 text-xs font-bold shrink-0 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Kembali</span>
          </button>
        </header>
        <div className="h-[2px] bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent" />

        {/* Pemilih kelas — sticky, scroll horizontal di HP */}
        <div className="sticky top-[65px] sm:top-[69px] z-10 bg-black/90 backdrop-blur-md border-b border-cyan-400/10 px-4 sm:px-6 py-3">
          <div className="flex gap-2 overflow-x-auto no-scrollbar max-w-3xl mx-auto">
            {classColumns.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => { setSelectedClass(c); setExpandedKey(null); }}
                className={`shrink-0 px-4 py-2 rounded-xl text-xs font-black tracking-wide transition-all cursor-pointer border ${
                  selectedClass === c
                    ? 'bg-cyan-400 text-black border-cyan-300 shadow-[0_0_16px_rgba(34,211,238,0.55)] scale-105'
                    : 'bg-white/5 text-cyan-200/70 hover:text-cyan-100 hover:border-cyan-400/40 border-white/10'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">
          {/* Pemilih hari */}
          <div className="flex gap-1.5 bg-white/5 p-1.5 rounded-xl border border-white/10 overflow-x-auto no-scrollbar">
            {DAYS.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => { setSelectedDay(day); setExpandedKey(null); }}
                className={`flex-1 min-w-[4.5rem] px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedDay === day
                    ? 'bg-fuchsia-400 text-black shadow-[0_0_14px_rgba(232,121,249,0.5)] font-black'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {day}
              </button>
            ))}
          </div>

          {/* Ringkasan hari */}
          <div className="flex items-center justify-between gap-3 bg-white/[0.04] border border-cyan-400/20 rounded-2xl px-4 sm:px-5 py-3.5">
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-white flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                Kelas {selectedClass} &middot; {selectedDay}
              </p>
              {activeDay?.piketTeacher && (
                <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5 truncate">
                  <Users2 className="w-3 h-3 shrink-0" />
                  Guru Piket: <span className="text-slate-200 font-semibold truncate">{activeDay.piketTeacher}</span>
                </p>
              )}
            </div>
            <span className="text-[10px] font-black uppercase px-2.5 py-1.5 rounded-full bg-fuchsia-400/10 text-fuchsia-300 border border-fuchsia-400/40 shrink-0 shadow-[0_0_12px_rgba(232,121,249,0.25)]">
              {subjectCount} mapel
            </span>
          </div>

          {/* Daftar jadwal */}
          {activeDay ? (
            <div className="space-y-2.5">
              {activeDay.slots.map((slot, i) => {
                if (slot.activity) {
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-4 py-2.5 text-[11px] text-fuchsia-300"
                    >
                      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-fuchsia-400/40" />
                      <Radio className="w-3.5 h-3.5 shrink-0 drop-shadow-[0_0_5px_currentColor]" />
                      <span className="font-semibold italic text-center">{slot.activity}</span>
                      <span className="text-slate-500 font-mono shrink-0">{slot.time}</span>
                      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-fuchsia-400/40" />
                    </div>
                  );
                }

                const teacherName = slot.classes?.[selectedClass];
                if (!teacherName) return null;

                const teacher = teacherByName.get(teacherName);
                const isPlaceholder = !teacher && teacherName in PLACEHOLDER_SUBJECTS;
                const subject = teacher?.subject ?? PLACEHOLDER_SUBJECTS[teacherName] ?? 'Belum diketahui';
                const color = colorForSubject(subject);
                const key = `${i}-${teacherName}`;
                const isOpen = expandedKey === key;

                return (
                  <div
                    key={i}
                    className={`bg-white/[0.03] border rounded-2xl overflow-hidden transition-all ${
                      isOpen ? `${color.border} ${color.ring}` : 'border-white/10'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedKey(isOpen ? null : key)}
                      className="w-full flex items-center gap-3 px-4 py-3.5 text-left cursor-pointer"
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 ${color.dot} shadow-[0_0_8px_currentColor] ${color.text}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-mono text-slate-500 tracking-wide">
                          JAM KE-{slot.period} &middot; {slot.time}
                        </p>
                        <p className={`text-sm font-extrabold truncate ${color.text} drop-shadow-[0_0_6px_currentColor]`}>
                          {subject}
                        </p>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 shrink-0 transition-transform ${isOpen ? `rotate-180 ${color.text}` : 'text-slate-500'}`}
                      />
                    </button>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className={`mx-4 mb-4 flex items-center gap-3 rounded-xl border px-3.5 py-3 ${color.bg} ${color.border}`}>
                            <div className="w-9 h-9 rounded-full overflow-hidden bg-black border border-white/10 shrink-0">
                              {teacher?.image ? (
                                <img
                                  src={teacher.image}
                                  alt={teacherName}
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-500">
                                  <Users2 className="w-4 h-4" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white truncate">
                                {isPlaceholder ? 'Belum ada guru tetap' : teacherName}
                              </p>
                              <p className="text-[10px] text-slate-400 truncate">
                                {isPlaceholder ? 'Slot cadangan / bilingual' : teacher?.position ?? 'Guru pengampu'}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-10 text-center text-slate-500 text-xs bg-white/[0.03] border border-white/10 rounded-2xl">
              <Sparkles className="w-5 h-5 mx-auto mb-2 text-slate-600" />
              Jadwal untuk hari ini belum tersedia.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
