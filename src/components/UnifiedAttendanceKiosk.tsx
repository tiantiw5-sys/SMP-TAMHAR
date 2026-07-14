/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Layar kiosk absensi universal — SATU titik scan untuk guru & murid
 * sekaligus (barcode/QR kartu), supaya cuma perlu 1 alat/URL di pintu
 * gerbang. Kode discan dicocokkan dulu ke murid, kalau tidak ketemu baru
 * dicoba ke guru — masing-masing tetap dicatat ke tabel absensinya sendiri
 * (student_attendance / teacher_attendance).
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, Keyboard, ScanLine, XCircle, Clock, School } from 'lucide-react';
import CameraBarcodeScanner from './CameraBarcodeScanner';
import type { Student, StudentAttendanceRecord, Teacher, TeacherAttendanceRecord } from '../types';
import {
  createScanAttendance,
  findStudentByScan,
  findTodayRecord,
  mergeAttendanceRecord,
  todayDateKey,
} from '../lib/studentAttendance';
import {
  createScanTeacherAttendance,
  findTeacherByScan,
  findTodayTeacherRecord,
  mergeTeacherAttendanceRecord,
} from '../lib/teacherAttendance';
import { upsertStudentAttendance, upsertTeacherAttendance } from '../lib/portalDb';
import SchoolLogo from './SchoolLogo';

interface UnifiedAttendanceKioskProps {
  students: Student[];
  studentRecords: StudentAttendanceRecord[];
  onStudentRecordsChange: (next: StudentAttendanceRecord[]) => void;
  teachers: Teacher[];
  teacherRecords: TeacherAttendanceRecord[];
  onTeacherRecordsChange: (next: TeacherAttendanceRecord[]) => void;
  portalReady: boolean;
  supabaseOn: boolean;
}

type Flash = { kind: 'success' | 'info' | 'error'; title: string; subtitle: string } | null;
type RecentEntry = { id: string; kind: 'murid' | 'guru'; label: string; sub: string; at: string };

export default function UnifiedAttendanceKiosk({
  students,
  studentRecords,
  onStudentRecordsChange,
  teachers,
  teacherRecords,
  onTeacherRecordsChange,
  portalReady,
  supabaseOn,
}: UnifiedAttendanceKioskProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [buffer, setBuffer] = useState('');
  const [flash, setFlash] = useState<Flash>(null);
  const [recent, setRecent] = useState<RecentEntry[]>([]);
  const [scanMode, setScanMode] = useState<'camera' | 'usb'>(() =>
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'camera' : 'usb'
  );
  const date = todayDateKey();

  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (scanMode !== 'usb') return;
    focusInput();
    const t = setInterval(focusInput, 2000);
    return () => clearInterval(t);
  }, [focusInput, scanMode]);

  const showFlash = (next: Flash) => {
    setFlash(next);
    window.setTimeout(() => setFlash(null), 4500);
  };

  const pushRecent = (entry: Omit<RecentEntry, 'at'>) => {
    setRecent((prev) => [{ ...entry, at: new Date().toISOString() }, ...prev].slice(0, 8));
  };

  const commitScan = async (code: string) => {
    const student = findStudentByScan(students, code);
    if (student) {
      const existing = findTodayRecord(studentRecords, student.id, date);
      const result = createScanAttendance(student, existing);
      showFlash({
        kind: result.kind,
        title: result.kind === 'success' ? 'Absensi berhasil' : result.kind === 'info' ? 'Sudah tercatat' : 'Gagal',
        subtitle: result.message,
      });
      if (result.record) {
        if (portalReady && supabaseOn) {
          const saved = await upsertStudentAttendance(result.record);
          onStudentRecordsChange(mergeAttendanceRecord(studentRecords, saved ?? result.record));
        } else {
          onStudentRecordsChange(mergeAttendanceRecord(studentRecords, result.record));
        }
        pushRecent({ id: result.record.id, kind: 'murid', label: student.name, sub: student.className });
      }
      return;
    }

    const teacher = findTeacherByScan(teachers, code);
    if (teacher) {
      const existing = findTodayTeacherRecord(teacherRecords, teacher.id, date);
      const result = createScanTeacherAttendance(teacher, existing);
      showFlash({
        kind: result.kind,
        title: result.kind === 'success' ? 'Absensi berhasil' : result.kind === 'info' ? 'Sudah tercatat' : 'Gagal',
        subtitle: result.message,
      });
      if (result.record) {
        if (portalReady && supabaseOn) {
          const saved = await upsertTeacherAttendance(result.record);
          onTeacherRecordsChange(mergeTeacherAttendanceRecord(teacherRecords, saved ?? result.record));
        } else {
          onTeacherRecordsChange(mergeTeacherAttendanceRecord(teacherRecords, result.record));
        }
        pushRecent({ id: result.record.id, kind: 'guru', label: teacher.name, sub: teacher.subject });
      }
      return;
    }

    showFlash({
      kind: 'error',
      title: 'Kartu tidak dikenali',
      subtitle: 'Kode ini tidak cocok dengan murid maupun guru yang terdaftar.',
    });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const code = buffer.trim();
      setBuffer('');
      if (code) commitScan(code);
      return;
    }
  };

  const muridHadirCount = studentRecords.filter((r) => r.date === date && r.status === 'Hadir').length;
  const guruHadirCount = teacherRecords.filter((r) => r.date === date && r.status === 'Hadir').length;

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950 text-white flex flex-col"
      onClick={focusInput}
    >
      <header className="px-6 py-5 border-b border-white/10 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <SchoolLogo className="w-12 h-12" />
          <div>
            <p className="text-xs uppercase tracking-widest text-amber-300/80 font-bold">SMP Taman Harapan Bekasi</p>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">Scanner — Absensi Guru & Murid</h1>
          </div>
        </div>
        <div className="text-right text-sm text-slate-300">
          <p className="font-semibold">{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <p className="text-amber-300 font-bold">{muridHadirCount} siswa &middot; {guruHadirCount} guru hadir hari ini</p>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-10 gap-8">
        <div className="flex flex-wrap gap-2 bg-slate-800/80 p-1.5 rounded-xl border border-slate-600">
          <button
            type="button"
            onClick={() => setScanMode('camera')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
              scanMode === 'camera' ? 'bg-amber-400 text-slate-950' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Camera className="w-4 h-4" />
            Kamera HP
          </button>
          <button
            type="button"
            onClick={() => setScanMode('usb')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
              scanMode === 'usb' ? 'bg-amber-400 text-slate-950' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Keyboard className="w-4 h-4" />
            Scanner USB
          </button>
        </div>

        {scanMode === 'camera' ? (
          <>
            <div className="w-full max-w-2xl text-center space-y-3">
              <h2 className="text-2xl sm:text-3xl font-black">Arahkan kamera ke kartu — guru atau murid</h2>
              <p className="text-slate-400 text-sm max-w-lg mx-auto">
                Mode kamera HP — izinkan akses kamera saat diminta. Scan = Hadir otomatis, terdeteksi sendiri milik guru atau murid.
              </p>
            </div>
            <CameraBarcodeScanner active={scanMode === 'camera'} onScan={commitScan} />
          </>
        ) : (
          <div className="w-full max-w-2xl text-center space-y-4">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-amber-400/15 border-2 border-amber-400/40">
              <ScanLine className="w-12 h-12 text-amber-300" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-black">Tempelkan kartu ke scanner</h2>
            <p className="text-slate-400 text-sm sm:text-base max-w-lg mx-auto">
              Mode scanner USB — guru & murid scan sendiri di pintu masuk, satu alat untuk semua.
            </p>
            <input
              ref={inputRef}
              type="text"
              value={buffer}
              onChange={(e) => setBuffer(e.target.value)}
              onKeyDown={onKeyDown}
              autoComplete="off"
              aria-label="Input scanner barcode"
              className="sr-only"
            />
          </div>
        )}

        {flash && (
          <div
            className={`w-full max-w-xl rounded-2xl border px-6 py-5 flex items-start gap-4 shadow-2xl ${
              flash.kind === 'success'
                ? 'bg-emerald-950/80 border-emerald-400/50'
                : flash.kind === 'info'
                  ? 'bg-slate-800/80 border-amber-400/40'
                  : 'bg-rose-950/80 border-rose-400/50'
            }`}
          >
            {flash.kind === 'error' ? (
              <XCircle className="w-8 h-8 shrink-0 text-rose-400" />
            ) : (
              <CheckCircle2 className="w-8 h-8 shrink-0 text-emerald-400" />
            )}
            <div>
              <p className="font-black text-lg">{flash.title}</p>
              <p className="text-slate-200 mt-1">{flash.subtitle}</p>
            </div>
          </div>
        )}

        <div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center gap-2 mb-4 text-amber-200 font-bold text-sm uppercase tracking-wide">
            <Clock className="w-4 h-4" />
            Hadir terbaru hari ini
          </div>
          {recent.length === 0 ? (
            <p className="text-slate-500 text-sm">Belum ada scan hari ini.</p>
          ) : (
            <ul className="space-y-2">
              {recent.map((r) => (
                <li key={`${r.kind}-${r.id}`} className="flex justify-between text-sm border-b border-white/5 pb-2">
                  <span>
                    <span
                      className={`text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded mr-2 ${
                        r.kind === 'guru' ? 'bg-sky-400/20 text-sky-300' : 'bg-amber-400/20 text-amber-300'
                      }`}
                    >
                      {r.kind}
                    </span>
                    <span className="font-semibold">{r.label}</span>
                    <span className="text-slate-400 ml-2">{r.sub}</span>
                  </span>
                  <span className="text-amber-300 font-mono">
                    {new Date(r.at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      <footer className="px-6 py-3 text-center text-xs text-slate-500 border-t border-white/5 flex items-center justify-center gap-2">
        <School className="w-3 h-3" />
        Mode kiosk — tutup tab ini untuk keluar
      </footer>
    </div>
  );
}
