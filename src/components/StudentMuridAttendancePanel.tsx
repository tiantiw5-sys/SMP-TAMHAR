/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { ScanLine, UserCheck, ExternalLink, Search, Printer, Trash2 } from 'lucide-react';
import type { Student, StudentAttendanceRecord, StudentAttendanceStatus, User } from '../types';
import {
  formatCheckInTime,
  findTodayRecord,
  todayDateKey,
  buildManualAttendanceRecord,
  upsertManualAttendance,
  mergeAttendanceRecord,
} from '../lib/studentAttendance';
import { upsertStudentAttendance, deleteStudentAttendanceForDate } from '../lib/portalDb';

interface StudentMuridAttendancePanelProps {
  students: Student[];
  records: StudentAttendanceRecord[];
  onRecordsChange: (next: StudentAttendanceRecord[]) => void;
  currentUser: User;
  portalReady: boolean;
  supabaseOn: boolean;
}

// "Hadir" manual disediakan untuk murid yang lupa bawa kartu barcode —
// tetap tercatat wajar seperti scan, cuma sumbernya 'manual' bukan 'scan'.
const MANUAL_STATUSES: StudentAttendanceStatus[] = ['Hadir', 'Izin', 'Sakit', 'Alpa'];

const manualButtonStyle: Record<StudentAttendanceStatus, string> = {
  Hadir: 'border-emerald-700 text-emerald-300 hover:bg-emerald-950/50',
  Izin: 'border-amber-700 text-amber-300 hover:bg-amber-950/50',
  Sakit: 'border-amber-700 text-amber-300 hover:bg-amber-950/50',
  Alpa: 'border-rose-700 text-rose-300 hover:bg-rose-950/50',
};

export default function StudentMuridAttendancePanel({
  students,
  records,
  onRecordsChange,
  currentUser,
  portalReady,
  supabaseOn,
}: StudentMuridAttendancePanelProps) {
  const [classFilter, setClassFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [note, setNote] = useState('');
  const today = todayDateKey();
  const [selectedDate, setSelectedDate] = useState(today);
  const isToday = selectedDate === today;

  const classes = useMemo(
    () => Array.from(new Set(students.map((s) => s.className))).sort(),
    [students]
  );

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students
      .filter((s) => s.active)
      .filter((s) => classFilter === 'all' || s.className === classFilter)
      .filter((s) => !q || s.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name, 'id'));
  }, [students, classFilter, search]);

  const dayRecords = useMemo(
    () => records.filter((r) => r.date === selectedDate),
    [records, selectedDate]
  );

  const stats = useMemo(() => {
    const base = { Hadir: 0, Izin: 0, Sakit: 0, Alpa: 0, belum: 0 };
    for (const s of filteredStudents) {
      const r = findTodayRecord(dayRecords, s.id, selectedDate);
      if (!r) base.belum += 1;
      else base[r.status] += 1;
    }
    return base;
  }, [filteredStudents, dayRecords, selectedDate]);

  const setManual = async (student: Student, status: StudentAttendanceStatus) => {
    if (portalReady && supabaseOn) {
      // upsert_student_attendance memutuskan "timpa" vs "tambah baru" di
      // server (dicocokkan lewat murid+tanggal), bukan ditebak di browser —
      // supaya kiosk scan dan panel manual guru yang jalan bersamaan tidak
      // pernah menghasilkan baris absensi kembar untuk murid+tanggal yang sama.
      const { record } = buildManualAttendanceRecord(records, student, status, currentUser.name, selectedDate, note);
      const saved = await upsertStudentAttendance(record);
      onRecordsChange(mergeAttendanceRecord(records, saved ?? record));
    } else {
      onRecordsChange(upsertManualAttendance(records, student, status, currentUser.name, selectedDate, note));
    }
  };

  const base = `${window.location.origin}${window.location.pathname}`;
  const kioskUrl = `${base}#absen-murid`;
  const cardsQuery = classFilter !== 'all' ? `?kelas=${encodeURIComponent(classFilter)}` : '';
  const cardsUrl = `${base}${cardsQuery}#kartu-barcode-murid`;

  const formatIndoDate = (iso: string) => {
    try {
      return new Date(`${iso}T00:00:00`).toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  const deleteAttendanceForDay = async () => {
    const confirmed = window.confirm(
      `Yakin mau hapus riwayat absensi murid tanggal ${formatIndoDate(selectedDate)}? Aksi ini tidak bisa dibatalkan.`
    );
    if (!confirmed) return;

    const next = records.filter((r) => r.date !== selectedDate);

    if (portalReady && supabaseOn) {
      const ok = await deleteStudentAttendanceForDate(selectedDate);
      if (!ok) {
        window.alert('Gagal menghapus riwayat absensi — coba lagi, atau cek koneksi internet.');
        return;
      }
    }
    onRecordsChange(next);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Absensi Murid</h2>
          <p className="text-slate-400 text-sm mt-1">
            Scan di pintu = Hadir otomatis. Lupa bawa kartu? Klik "Hadir" manual di sini. Izin, Sakit, Alpa juga diisi/direvisi manual — pilih tanggal di bawah untuk mengisi atau membetulkan hari yang sudah lewat.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={cardsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-600 text-white font-bold text-sm hover:bg-slate-700 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Cetak Kartu Barcode
            <ExternalLink className="w-3.5 h-3.5 opacity-70" />
          </a>
          <a
            href={kioskUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 text-slate-900 font-bold text-sm hover:bg-amber-300 transition-colors"
          >
            <ScanLine className="w-4 h-4" />
            Buka Layar Scanner (Kiosk)
            <ExternalLink className="w-3.5 h-3.5 opacity-70" />
          </a>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-700/60 bg-slate-800/40 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wide shrink-0">
          Tanggal ditampilkan/diisi
        </label>
        <input
          type="date"
          value={selectedDate}
          max={today}
          onChange={(e) => setSelectedDate(e.target.value || today)}
          className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm"
        />
        {!isToday && (
          <button
            type="button"
            onClick={() => setSelectedDate(today)}
            className="text-xs font-bold text-amber-400 hover:underline cursor-pointer"
          >
            ← Kembali ke Hari Ini
          </button>
        )}
        <span className="text-xs text-slate-500">
          Menampilkan: <span className="text-slate-300 font-semibold">{formatIndoDate(selectedDate)}</span>
          {!isToday && ' (bukan hari ini — Hadir lewat scan hanya tercatat di tanggal aslinya)'}
        </span>
        {currentUser.role === 'Super Admin' && (
          <button
            type="button"
            onClick={deleteAttendanceForDay}
            className="sm:ml-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 font-bold text-sm hover:bg-rose-900/60 transition-colors cursor-pointer shrink-0"
          >
            <Trash2 className="w-4 h-4" />
            Hapus Riwayat Tanggal Ini
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {(['Hadir', 'Izin', 'Sakit', 'Alpa', 'belum'] as const).map((key) => (
          <div key={key} className="rounded-xl border border-slate-700/60 bg-slate-800/40 px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">{key === 'belum' ? 'Belum' : key}</p>
            <p className="text-2xl font-black text-white mt-1">{stats[key]}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm"
          />
        </div>
        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm"
        >
          <option value="all">Semua kelas</option>
          {classes.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Catatan opsional (izin/sakit)"
          className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm"
        />
      </div>

      <div className="rounded-2xl border border-slate-700/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-800/80 text-slate-400 text-xs uppercase">
              <tr>
                <th className="px-4 py-3">Nama</th>
                <th className="px-4 py-3">Kelas</th>
                <th className="px-4 py-3">Status tanggal terpilih</th>
                <th className="px-4 py-3">Jam</th>
                <th className="px-4 py-3">Manual</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => {
                const rec = findTodayRecord(dayRecords, student.id, selectedDate);
                return (
                  <tr key={student.id} className="border-t border-slate-800/80 hover:bg-slate-800/30">
                    <td className="px-4 py-3 font-semibold text-white">{student.name}</td>
                    <td className="px-4 py-3 text-slate-300">{student.className}</td>
                    <td className="px-4 py-3">
                      {rec ? (
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${
                            rec.status === 'Hadir'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : rec.status === 'Alpa'
                                ? 'bg-rose-500/20 text-rose-300'
                                : 'bg-amber-500/20 text-amber-200'
                          }`}
                        >
                          {rec.status}
                          {rec.source === 'scan' ? ' (scan)' : ''}
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">
                      {rec?.status === 'Hadir' ? formatCheckInTime(rec.checkInAt) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {MANUAL_STATUSES.map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => setManual(student, st)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${manualButtonStyle[st]}`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-slate-500 flex items-center gap-2">
        <UserCheck className="w-3.5 h-3.5" />
        Pasang tablet/PC di pintu dengan scanner USB — buka link kiosk di atas. Barcode kartu = NIS siswa.
      </p>
    </div>
  );
}