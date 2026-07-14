/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Layar kiosk absensi murid — untuk scanner barcode USB di pintu masuk.
 * Scanner USB bertindak seperti keyboard: ketik NIS + Enter.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, Keyboard, ScanLine, XCircle, Clock, School } from 'lucide-react';
import CameraBarcodeScanner from './CameraBarcodeScanner';
import type { Student, StudentAttendanceRecord } from '../types';
import {
  createScanAttendance,
  findStudentByScan,
  findTodayRecord,
  formatCheckInTime,
  mergeAttendanceRecord,
  todayDateKey,
} from '../lib/studentAttendance';
import { upsertStudentAttendance } from '../lib/portalDb';
import SchoolLogo from './SchoolLogo';

interface StudentAttendanceKioskProps {
  students: Student[];
  records: StudentAttendanceRecord[];
  onRecordsChange: (next: StudentAttendanceRecord[]) => void;
  portalReady: boolean;
  supabaseOn: boolean;
}

type Flash = { kind: 'success' | 'info' | 'error'; title: string; subtitle: string } | null;

export default function StudentAttendanceKiosk({
  students,
  records,
  onRecordsChange,
  portalReady,
  supabaseOn,
}: StudentAttendanceKioskProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [buffer, setBuffer] = useState('');
  const [flash, setFlash] = useState<Flash>(null);
  const [recent, setRecent] = useState<StudentAttendanceRecord[]>([]);
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

  useEffect(() => {
    const today = records
      .filter((r) => r.date === date && r.status === 'Hadir')
      .sort((a, b) => (b.checkInAt ?? '').localeCompare(a.checkInAt ?? ''))
      .slice(0, 8);
    setRecent(today);
  }, [records, date]);

  const showFlash = (next: Flash) => {
    setFlash(next);
    window.setTimeout(() => setFlash(null), 4500);
  };

  const commitScan = async (code: string) => {
    const student = findStudentByScan(students, code);
    if (!student) {
      showFlash({
        kind: 'error',
        title: 'Kartu tidak dikenali',
        subtitle: 'Pastikan barcode berisi NIS siswa yang terdaftar.',
      });
      return;
    }

    const existing = findTodayRecord(records, student.id, date);
    const result = createScanAttendance(student, existing);
    showFlash({
      kind: result.kind,
      title: result.kind === 'success' ? 'Absensi berhasil' : result.kind === 'info' ? 'Sudah tercatat' : 'Gagal',
      subtitle: result.message,
    });

    if (result.record) {
      if (portalReady && supabaseOn) {
        // upsert_student_attendance memutuskan "timpa" vs "tambah baru" di
        // server dalam satu transaksi (dicocokkan lewat murid+tanggal) —
        // bukan ditebak di browser — supaya 2 kiosk/gerbang yang scan murid
        // yang sama hampir bersamaan tidak pernah menghasilkan baris kembar.
        const saved = await upsertStudentAttendance(result.record);
        onRecordsChange(mergeAttendanceRecord(records, saved ?? result.record));
      } else {
        onRecordsChange(mergeAttendanceRecord(records, result.record));
      }
    }
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

  const hadirCount = records.filter((r) => r.date === date && r.status === 'Hadir').length;

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950 text-white flex flex-col"
      onClick={focusInput}
    >
      <header className="px-6 py-5 border-b border-white/10 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <SchoolLogo className="w-12 h-12" />
          <div>
            <p className="text-xs uppercase tracking-widest text-amber-300/80 font-bold">SMP Taman Harapan Bekasi</p>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">Absensi Murid — Scan Kartu</h1>
          </div>
        </div>
        <div className="text-right text-sm text-slate-300">
          <p className="font-semibold">{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <p className="text-amber-300 font-bold">{hadirCount} siswa hadir hari ini</p>
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
              <h2 className="text-2xl sm:text-3xl font-black">Arahkan kamera ke barcode kartu</h2>
              <p className="text-slate-400 text-sm max-w-lg mx-auto">
                Mode kamera HP — izinkan akses kamera saat diminta. Scan NIS = Hadir otomatis.
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
              Mode scanner USB — siswa scan sendiri di pintu masuk. Guru hanya mengisi Izin, Sakit, atau Alpa lewat web.
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
                <li key={r.id} className="flex justify-between text-sm border-b border-white/5 pb-2">
                  <span>
                    <span className="font-semibold">{r.studentName}</span>
                    <span className="text-slate-400 ml-2">{r.className}</span>
                  </span>
                  <span className="text-amber-300 font-mono">{formatCheckInTime(r.checkInAt)}</span>
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