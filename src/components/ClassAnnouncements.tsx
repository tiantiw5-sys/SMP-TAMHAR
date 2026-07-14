/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pengumuman Kelas — halaman publik (tanpa login) berisi nama kelas sebagai
 * judul, lalu daftar nama lengkap & jenis kelamin murid di kelas tersebut.
 * Sengaja terpisah dari koleksi `students` (NIS/NISN, dikunci RLS login)
 * karena data ini memang untuk dilihat siapa saja, seperti pengumuman
 * pembagian kelas yang biasa ditempel di papan sekolah.
 */

import React, { useMemo, useState } from 'react';
import { ArrowLeft, Megaphone, Users } from 'lucide-react';
import type { ClassRosterEntry } from '../types';
import { CLASS_ROSTER_OPTIONS } from '../constants';
import SchoolLogo from './SchoolLogo';

interface ClassAnnouncementsProps {
  roster: ClassRosterEntry[];
  initialClass?: string;
}

export default function ClassAnnouncements({ roster, initialClass }: ClassAnnouncementsProps) {
  const [selectedClass, setSelectedClass] = useState<string>(
    initialClass && CLASS_ROSTER_OPTIONS.includes(initialClass as any) ? initialClass : ''
  );

  const entry = useMemo(
    () => roster.find((r) => r.className === selectedClass) ?? null,
    [roster, selectedClass]
  );

  const students = useMemo(
    () => [...(entry?.students ?? [])].sort((a, b) => a.name.localeCompare(b.name, 'id')),
    [entry]
  );

  const goBack = () => {
    window.location.hash = '';
  };

  return (
    <div className="min-h-screen bg-[#070f1e] text-slate-100 font-sans">
      <header className="sticky top-0 z-10 bg-[#0b1d33] border-b border-slate-800 px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <SchoolLogo className="w-9 h-9 shrink-0" />
          <div className="min-w-0">
            <h1 className="font-black text-sm sm:text-base text-white flex items-center gap-2 truncate">
              <Megaphone className="w-4 h-4 text-amber-400 shrink-0" />
              Pengumuman Kelas
            </h1>
            <p className="text-[11px] text-slate-400 truncate">SMP Taman Harapan Bekasi</p>
          </div>
        </div>
        <button
          type="button"
          onClick={goBack}
          className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 text-xs font-bold shrink-0 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Kembali</span>
        </button>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="bg-[#0b1d33] border border-slate-800 rounded-2xl p-5 space-y-3">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pilih Kelas</label>
          <div className="flex flex-wrap gap-2">
            {CLASS_ROSTER_OPTIONS.map((cls) => (
              <button
                key={cls}
                type="button"
                onClick={() => setSelectedClass(cls)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedClass === cls
                    ? 'bg-amber-400 text-slate-900 shadow'
                    : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {cls}
              </button>
            ))}
          </div>
        </div>

        {selectedClass && (
          <div className="bg-[#0b1d33] border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight">{selectedClass}</h2>
                <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
                  <Users className="w-3.5 h-3.5" />
                  {students.length} murid terdaftar
                </p>
              </div>
            </div>

            {students.length > 0 ? (
              <ul className="divide-y divide-slate-800">
                {students.map((s, i) => (
                  <li key={`${s.name}-${i}`} className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3">
                    <span className="text-sm text-white font-semibold break-words min-w-0">{i + 1}. {s.name}</span>
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-1 rounded-md shrink-0 ${
                        s.gender === 'P'
                          ? 'bg-rose-400/10 text-rose-300'
                          : 'bg-sky-400/10 text-sky-300'
                      }`}
                    >
                      {s.gender === 'P' ? 'Perempuan' : 'Laki-laki'}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-10 text-center text-slate-500 text-xs">
                Belum ada data murid untuk kelas {selectedClass}.
              </div>
            )}
          </div>
        )}

        {!selectedClass && (
          <div className="text-center text-slate-500 text-xs py-10">
            Pilih kelas di atas untuk melihat daftar murid.
          </div>
        )}
      </div>
    </div>
  );
}
