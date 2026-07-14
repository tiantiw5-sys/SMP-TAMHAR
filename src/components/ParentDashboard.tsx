import React, { useEffect, useMemo, useState } from 'react';
import {
  GraduationCap, LogOut, CheckCircle2, Activity, FileText, XCircle,
  Calendar, Shirt, Sparkles, RefreshCw, ChevronLeft, ChevronRight, BookOpen, Radio, UserCircle2,
} from 'lucide-react';
import { User as UserType, Student, StudentAttendanceRecord, StudentAttendanceStatus, TeachingScheduleDay, Uniform, SystemSettings, Teacher } from '../types';
import { getMyChild, getMyChildAttendance } from '../lib/portalDb';

interface ParentDashboardProps {
  currentUser: UserType;
  onLogout: () => void;
  teachingSchedule: TeachingScheduleDay[];
  uniforms: Uniform[];
  settings: SystemSettings;
  teachers: Teacher[];
}

const SCHEDULE_DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'] as const;

// Beberapa slot di jadwal sumber belum diisi guru tetap — placeholder
// cadangan/bilingual, bukan nama orang, tapi tetap mewakili 1 mata
// pelajaran yang pasti (sama seperti resolusi di SubjectSchedule.tsx).
const PLACEHOLDER_SUBJECTS: Record<string, string> = {
  'Guru IPA (Cadangan)': 'IPA',
  'Guru B. Inggris (Cadangan)': 'Bahasa Inggris',
  'Native Speaker (Program Bilingual)': 'Bahasa Inggris (Bilingual)',
};

// Warna status — dari palet aksesibilitas standar (lihat dataviz skill):
// good/warning/serious/critical, masing-masing SELALU dipasangkan ikon +
// label teks (bukan warna saja) karena 2 di antaranya di bawah kontras 3:1
// di atas latar terang.
const STATUS_STYLE: Record<StudentAttendanceStatus, { label: string; text: string; bg: string; ring: string; Icon: typeof CheckCircle2 }> = {
  Hadir: { label: 'Hadir', text: '#0ca30c', bg: '#0ca30c1a', ring: '#0ca30c40', Icon: CheckCircle2 },
  Izin: { label: 'Izin', text: '#b3780f', bg: '#fab2191a', ring: '#fab21940', Icon: FileText },
  Sakit: { label: 'Sakit', text: '#c1602f', bg: '#ec835a1a', ring: '#ec835a40', Icon: Activity },
  Alpa: { label: 'Alpa', text: '#d03b3b', bg: '#d03b3b1a', ring: '#d03b3b40', Icon: XCircle },
};

const WEEKDAY_MAP: Record<number, TeachingScheduleDay['day'] | null> = {
  0: null, 1: 'Senin', 2: 'Selasa', 3: 'Rabu', 4: 'Kamis', 5: 'Jumat', 6: null,
};

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function monthKey(year: number, month0: number): string {
  return `${year}-${String(month0 + 1).padStart(2, '0')}`;
}

function monthLabel(key: string): string {
  return new Date(`${key}-01T00:00:00`).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

function addMonths(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return monthKey(d.getFullYear(), d.getMonth());
}

export default function ParentDashboard({ currentUser, onLogout, teachingSchedule, uniforms, settings, teachers }: ParentDashboardProps) {
  const [child, setChild] = useState<Student | null>(null);
  const [attendance, setAttendance] = useState<StudentAttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [scheduleDay, setScheduleDay] = useState<(typeof SCHEDULE_DAYS)[number]>('Senin');

  const loadData = async () => {
    setLoading(true);
    setLoadError(false);
    const [childData, attendanceData] = await Promise.all([getMyChild(), getMyChildAttendance()]);
    if (!childData) {
      setLoadError(true);
      setLoading(false);
      return;
    }
    setChild(childData);
    setAttendance(attendanceData);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const now = new Date();
  const thisMonthKey = monthKey(now.getFullYear(), now.getMonth());

  // Bulan yang lagi ditampilkan di kalender — panah kiri/kanan, tidak boleh
  // maju melewati bulan berjalan (belum ada datanya).
  const [viewMonth, setViewMonth] = useState(thisMonthKey);

  // Rentang "Dari bulan — Sampai bulan" untuk tabel rekap di bawah stat
  // tile — defaultnya bulan berjalan saja, bisa diperlebar manual.
  const [rangeFrom, setRangeFrom] = useState(thisMonthKey);
  const [rangeTo, setRangeTo] = useState(thisMonthKey);

  const attendanceByDate = useMemo(() => {
    const map = new Map<string, StudentAttendanceStatus>();
    for (const r of attendance) map.set(r.date, r.status);
    return map;
  }, [attendance]);

  // Daftar bulan yang punya catatan absensi (+ bulan berjalan selalu ikut,
  // supaya dropdown tidak kosong buat murid yang baru mulai diabsen).
  const availableMonths = useMemo(() => {
    const set = new Set<string>([thisMonthKey]);
    for (const r of attendance) set.add(r.date.slice(0, 7));
    return Array.from(set).sort();
  }, [attendance, thisMonthKey]);

  const countsForMonth = (key: string): Record<StudentAttendanceStatus, number> => {
    const counts: Record<StudentAttendanceStatus, number> = { Hadir: 0, Izin: 0, Sakit: 0, Alpa: 0 };
    for (const r of attendance) {
      if (r.date.startsWith(key)) counts[r.status]++;
    }
    return counts;
  };

  const monthsInRange = useMemo(() => {
    const [from, to] = rangeFrom <= rangeTo ? [rangeFrom, rangeTo] : [rangeTo, rangeFrom];
    const months: string[] = [];
    let cursor = from;
    while (cursor <= to) {
      months.push(cursor);
      if (months.length > 60) break; // jaga-jaga rentang kebalik/ekstrem
      cursor = addMonths(cursor, 1);
    }
    return months;
  }, [rangeFrom, rangeTo]);

  const rangeCounts = useMemo(() => {
    const total: Record<StudentAttendanceStatus, number> = { Hadir: 0, Izin: 0, Sakit: 0, Alpa: 0 };
    for (const key of monthsInRange) {
      const c = countsForMonth(key);
      total.Hadir += c.Hadir;
      total.Izin += c.Izin;
      total.Sakit += c.Sakit;
      total.Alpa += c.Alpa;
    }
    return total;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthsInRange, attendance]);

  const [viewYear, viewMonth0] = viewMonth.split('-').map(Number);
  const calendarDays = daysInMonth(viewYear, viewMonth0 - 1);

  const todayWeekday = WEEKDAY_MAP[now.getDay()];

  const todayWeekdayName = now.toLocaleDateString('id-ID', { weekday: 'long' });

  useEffect(() => {
    if (todayWeekday) setScheduleDay(todayWeekday);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const teacherByName = useMemo(() => {
    const map = new Map<string, Teacher>();
    for (const t of teachers) map.set(t.name, t);
    return map;
  }, [teachers]);

  const activeScheduleDay = useMemo(
    () => teachingSchedule.find((d) => d.day === scheduleDay) ?? null,
    [teachingSchedule, scheduleDay]
  );

  // Wali Kelas diambil dari data Dewan Guru (`teachers`) — dicocokkan lewat
  // field terstruktur `waliKelas` (dropdown di form Tambah/Edit Guru), bukan
  // tebak-tebakan dari teks Jabatan.
  const waliKelas = useMemo(() => {
    if (!child) return null;
    return teachers.find((t) => t.waliKelas === child.className) ?? null;
  }, [teachers, child]);

  return (
    <div className="min-h-screen" style={{ background: '#f9f9f7' }}>
      {/* HEADER */}
      <header className="sticky top-0 z-30 bg-white border-b border-[#e1e0d9] shadow-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#2a78d6]/10 text-[#2a78d6] flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#898781] truncate">{settings.schoolName || 'Portal Orang Tua'}</p>
              <p className="text-sm font-extrabold text-[#0b0b0b] truncate">Portal Orang Tua</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 text-xs font-bold text-[#52514e] hover:text-[#d03b3b] bg-[#f9f9f7] hover:bg-[#d03b3b]/10 border border-[#e1e0d9] rounded-xl px-3 py-2 transition-colors cursor-pointer shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            Keluar
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {loading && (
          <div className="bg-white border border-[#e1e0d9] rounded-3xl p-8 text-center text-[#52514e] text-sm">
            Memuat data anak Anda…
          </div>
        )}

        {!loading && loadError && (
          <div className="bg-white border border-[#d03b3b]/30 rounded-3xl p-8 text-center space-y-3">
            <p className="text-sm font-bold text-[#d03b3b]">Data anak belum terhubung ke akun ini.</p>
            <p className="text-xs text-[#52514e]">Hubungi Admin Sekolah untuk menghubungkan akun Anda ke data murid.</p>
            <button
              onClick={loadData}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2a78d6] hover:underline cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Coba lagi
            </button>
          </div>
        )}

        {!loading && !loadError && child && (
          <>
            {/* CHILD CARD */}
            <div className="bg-white border border-[#e1e0d9] rounded-3xl p-5 sm:p-6 flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#2a78d6]/10 text-[#2a78d6] flex items-center justify-center text-lg font-black shrink-0">
                {child.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-lg font-black text-[#0b0b0b] truncate">{child.name}</p>
                <p className="text-xs font-bold text-[#52514e]">Kelas {child.className} &middot; NIS {child.nis}</p>
              </div>
            </div>

            {/* WALI KELAS — dari data Dewan Guru */}
            <div className="bg-white border border-[#e1e0d9] rounded-3xl p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <UserCircle2 className="w-4 h-4 text-[#1baf7a]" />
                <p className="text-xs font-black uppercase tracking-widest text-[#0b0b0b]">Wali Kelas</p>
              </div>
              {waliKelas ? (
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden bg-[#f9f9f7] border border-[#e1e0d9] shrink-0">
                    {waliKelas.image ? (
                      <img src={waliKelas.image} alt={waliKelas.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#898781]">
                        <UserCircle2 className="w-7 h-7" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-[#0b0b0b] truncate">{waliKelas.name}</p>
                    <p className="text-[11px] text-[#1baf7a] font-bold truncate">{waliKelas.position}</p>
                    <p className="text-[10px] text-[#898781] font-semibold truncate">{waliKelas.subject}</p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[#898781] font-semibold">
                  Info Wali Kelas {child.className} belum tersedia — cek data Dewan Guru di menu admin.
                </p>
              )}
            </div>

            {/* REKAP KEHADIRAN — PILIH RENTANG BULAN */}
            <div className="bg-white border border-[#e1e0d9] rounded-3xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-xs font-black uppercase tracking-widest text-[#898781]">Rekap Kehadiran</p>
                <div className="flex items-center gap-2">
                  <select
                    value={rangeFrom}
                    onChange={(e) => setRangeFrom(e.target.value)}
                    className="text-[11px] font-bold text-[#0b0b0b] bg-[#f9f9f7] border border-[#e1e0d9] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#2a78d6]"
                  >
                    {availableMonths.map((m) => (
                      <option key={m} value={m}>{monthLabel(m)}</option>
                    ))}
                  </select>
                  <span className="text-[10px] text-[#898781] font-bold">s/d</span>
                  <select
                    value={rangeTo}
                    onChange={(e) => setRangeTo(e.target.value)}
                    className="text-[11px] font-bold text-[#0b0b0b] bg-[#f9f9f7] border border-[#e1e0d9] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#2a78d6]"
                  >
                    {availableMonths.map((m) => (
                      <option key={m} value={m}>{monthLabel(m)}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* STAT TILES — total rentang terpilih */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(Object.keys(STATUS_STYLE) as StudentAttendanceStatus[]).map((status) => {
                  const style = STATUS_STYLE[status];
                  return (
                    <div key={status} className="bg-[#f9f9f7] border border-[#e1e0d9] rounded-2xl p-4 flex flex-col gap-2">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center"
                        style={{ background: style.bg, color: style.text }}
                      >
                        <style.Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-2xl font-black text-[#0b0b0b] leading-none">{rangeCounts[status]}</p>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-[#898781] mt-1">{style.label}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* TABEL PER BULAN — cuma muncul kalau rentangnya lebih dari 1 bulan */}
              {monthsInRange.length > 1 && (
                <div className="overflow-x-auto -mx-1 px-1">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="text-left text-[#898781] uppercase tracking-wide">
                        <th className="font-black py-1.5 pr-2">Bulan</th>
                        {(Object.keys(STATUS_STYLE) as StudentAttendanceStatus[]).map((status) => (
                          <th key={status} className="font-black py-1.5 px-2 text-center">{STATUS_STYLE[status].label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {monthsInRange.map((m) => {
                        const c = countsForMonth(m);
                        return (
                          <tr key={m} className="border-t border-[#e1e0d9]">
                            <td className="py-2 pr-2 font-bold text-[#0b0b0b] whitespace-nowrap">{monthLabel(m)}</td>
                            {(Object.keys(STATUS_STYLE) as StudentAttendanceStatus[]).map((status) => (
                              <td key={status} className="py-2 px-2 text-center font-bold" style={{ color: STATUS_STYLE[status].text }}>
                                {c[status]}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* CALENDAR */}
            <div className="bg-white border border-[#e1e0d9] rounded-3xl p-5 sm:p-6">
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2 min-w-0">
                  <Calendar className="w-4 h-4 text-[#2a78d6] shrink-0" />
                  <p className="text-xs font-black uppercase tracking-widest text-[#0b0b0b] truncate">
                    Kalender &mdash; {monthLabel(viewMonth)}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setViewMonth((m) => addMonths(m, -1))}
                    className="w-7 h-7 rounded-lg bg-[#f9f9f7] border border-[#e1e0d9] flex items-center justify-center text-[#52514e] hover:text-[#0b0b0b] cursor-pointer"
                    aria-label="Bulan sebelumnya"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setViewMonth((m) => addMonths(m, 1))}
                    disabled={viewMonth >= thisMonthKey}
                    className="w-7 h-7 rounded-lg bg-[#f9f9f7] border border-[#e1e0d9] flex items-center justify-center text-[#52514e] hover:text-[#0b0b0b] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    aria-label="Bulan berikutnya"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: calendarDays }, (_, i) => {
                  const day = i + 1;
                  const dateKey = `${viewMonth}-${String(day).padStart(2, '0')}`;
                  const status = attendanceByDate.get(dateKey);
                  const style = status ? STATUS_STYLE[status] : null;
                  const isToday = viewMonth === thisMonthKey && day === now.getDate();
                  return (
                    <div
                      key={day}
                      className="aspect-square rounded-lg flex items-center justify-center text-[11px] font-bold"
                      style={{
                        background: style ? style.bg : '#f9f9f7',
                        color: style ? style.text : '#898781',
                        boxShadow: isToday ? '0 0 0 2px #2a78d6' : style ? `0 0 0 1px ${style.ring}` : 'none',
                      }}
                      title={status ? `${day} — ${style?.label}` : `${day} — belum ada catatan`}
                    >
                      {day}
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-[#e1e0d9]">
                {(Object.keys(STATUS_STYLE) as StudentAttendanceStatus[]).map((status) => {
                  const style = STATUS_STYLE[status];
                  return (
                    <div key={status} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: style.text }} />
                      <span className="text-[10px] font-bold text-[#52514e]">{style.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* JADWAL MATA PELAJARAN — mingguan, default ke hari ini */}
            <div className="bg-white border border-[#e1e0d9] rounded-3xl p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="w-4 h-4 text-[#4a3aa7]" />
                <p className="text-xs font-black uppercase tracking-widest text-[#0b0b0b]">Jadwal Mata Pelajaran</p>
              </div>

              <div className="flex gap-1.5 bg-[#f9f9f7] p-1.5 rounded-xl border border-[#e1e0d9] overflow-x-auto no-scrollbar mb-4">
                {SCHEDULE_DAYS.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setScheduleDay(day)}
                    className={`flex-1 min-w-[4.2rem] px-3 py-2 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                      scheduleDay === day
                        ? 'bg-[#4a3aa7] text-white'
                        : 'text-[#52514e] hover:text-[#0b0b0b]'
                    } ${day === todayWeekday && scheduleDay !== day ? 'ring-1 ring-[#4a3aa7]/40' : ''}`}
                  >
                    {day}
                  </button>
                ))}
              </div>

              {activeScheduleDay?.piketTeacher && (
                <p className="text-[10px] text-[#898781] font-semibold mb-3">
                  Guru Piket {scheduleDay}: <span className="text-[#0b0b0b] font-bold">{activeScheduleDay.piketTeacher}</span>
                </p>
              )}

              {!activeScheduleDay ? (
                <p className="text-xs text-[#898781] font-semibold">Jadwal untuk hari {scheduleDay} belum tersedia.</p>
              ) : (
                <ul className="space-y-2">
                  {activeScheduleDay.slots.map((slot, i) => {
                    if (slot.activity) {
                      return (
                        <li key={i} className="flex items-center gap-2 px-3.5 py-1.5 text-[10px] text-[#4a3aa7] font-bold italic">
                          <Radio className="w-3 h-3 shrink-0" />
                          {slot.activity}
                          <span className="text-[#898781] font-mono not-italic ml-auto">{slot.time}</span>
                        </li>
                      );
                    }

                    const teacherName = child.className ? slot.classes?.[child.className] : undefined;
                    if (!teacherName) return null;

                    const teacher = teacherByName.get(teacherName);
                    const subject = teacher?.subject ?? PLACEHOLDER_SUBJECTS[teacherName] ?? 'Belum diketahui';

                    return (
                      <li key={i} className="flex items-center gap-3 bg-[#f9f9f7] rounded-xl px-3.5 py-2.5">
                        <span className="text-[10px] font-black text-[#4a3aa7] bg-[#4a3aa7]/10 rounded-lg px-2 py-1 shrink-0">
                          {slot.time}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-[#0b0b0b] truncate">{subject}</p>
                          <p className="text-[10px] text-[#898781] truncate">{teacherName}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* INFORMASI SERAGAM — koleksi lengkap, sama seperti di landing page */}
            <div className="bg-white border border-[#e1e0d9] rounded-3xl p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-1">
                <Shirt className="w-4 h-4 text-[#eb6834]" />
                <p className="text-xs font-black uppercase tracking-widest text-[#0b0b0b]">Informasi Seragam</p>
              </div>
              <p className="text-[10px] text-[#898781] font-semibold mb-4">Koleksi Seragam Sekolah Lengkap — ketentuan pakaian per hari.</p>
              {uniforms.length === 0 ? (
                <p className="text-xs text-[#898781] font-semibold">Info seragam belum tersedia.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {uniforms.map((u) => {
                    const isToday = u.days.toLowerCase().includes(todayWeekdayName.toLowerCase());
                    return (
                      <div
                        key={u.id}
                        className="bg-[#f9f9f7] border rounded-2xl overflow-hidden"
                        style={{ borderColor: isToday ? '#eb6834' : '#e1e0d9' }}
                      >
                        {u.image && (
                          <div className="relative aspect-[4/3] bg-white">
                            <img src={u.image} alt={u.name} className="w-full h-full object-contain p-2" />
                            {isToday && (
                              <span className="absolute top-2 right-2 bg-[#eb6834] text-white px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wide">
                                Hari Ini
                              </span>
                            )}
                          </div>
                        )}
                        <div className="p-3.5 space-y-1">
                          <span className="inline-block text-[9px] font-black uppercase tracking-wide text-[#eb6834] bg-[#eb6834]/10 rounded-md px-2 py-0.5">
                            {u.days}
                          </span>
                          <p className="text-xs font-black text-[#0b0b0b] leading-tight">{u.name}</p>
                          <p className="text-[10px] text-[#898781] font-semibold leading-relaxed">{u.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-1.5 text-[10px] text-[#898781] font-semibold py-2">
              <Sparkles className="w-3 h-3" />
              Login sebagai {currentUser.name}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
