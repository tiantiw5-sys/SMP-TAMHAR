/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  BarChart3, FileText, FileImage, Users, User, Shield, 
  Settings, Key, Trash2, Plus, Edit3, Download, LogOut, 
  AlertTriangle, Calendar, CheckCircle2, TrendingUp, TrendingDown,
  Sparkles, Filter, X, ArrowUpRight, Search, Menu,
  Globe, MapPin, Activity, Wifi, Clock, Link2, RefreshCw,
  LayoutDashboard as LayoutDashboardIcon, ChevronUp, ChevronDown,
  Printer, ScanLine, ExternalLink, GripVertical, HelpCircle
} from 'lucide-react';
import {
  Article, GalleryItem, Teacher, Uniform, CashTransaction,
  FineTransaction, NotificationItem, ActivityLog, SystemSettings, User as UserType,
  Student, StudentAttendanceRecord, StudentAttendanceStatus,
  ClassRosterEntry, ClassRosterStudent, TeachingScheduleDay, TeachingScheduleSlot, TeacherAttendanceRecord,
} from '../types';
import StudentMuridAttendancePanel from './StudentMuridAttendancePanel';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import type { AttendanceMap } from '../lib/portalDb';
import { appendToCollection, updateCollectionItem, deleteCollectionItem, reorderCollection, fetchCollectionRow, fetchStudentAttendance, upsertCashTransaction, deleteCashTransaction, upsertFineTransaction, deleteFineTransaction, mergeById, removeById, upsertTeacherAttendance, deleteTeacherAttendanceForDate } from '../lib/portalDb';
import { normalizeImageUrl } from '../lib/imageUrl';
import { validatePasswordStrength } from '../auth';
import { getSupabase, createSignupOnlyClient } from '../lib/supabase';
import { canAccessMuridAttendance } from '../lib/roleAccess';
import { todayDateKey, formatCheckInTime } from '../lib/studentAttendance';
import { mergeTeacherAttendanceRecord } from '../lib/teacherAttendance';
import { downloadStudentTemplate, parseStudentImportCsv } from '../lib/studentImport';
import { downloadTeacherTemplate, parseTeacherImportCsv } from '../lib/teacherImport';
import { STAFF_LOGIN_EMAIL_SUFFIXES, CLASS_ROSTER_OPTIONS } from '../constants';
import DriveLinkConverter from './DriveLinkConverter';

// Textarea "Nama Lengkap - L/P" (satu murid per baris) <-> ClassRosterStudent[].
// Format tulisan-tangan sengaja dipakai (bukan form berulang per murid)
// supaya admin bisa isi/ubah satu kelas penuh sekali tempel dari Excel.
const classRosterStudentsToText = (students: ClassRosterStudent[]): string =>
  students.map((s) => `${s.name} - ${s.gender === 'P' ? 'P' : 'L'}`).join('\n');

// Kode guru asli dari dokumen "PEMBAGIAN TUGAS GURU 2627" — dipakai supaya
// tabel Jadwal Mengajar bisa tampil ringkas pakai kode (muat di layar HP),
// nama lengkapnya baru muncul begitu kode itu diklik/tap. Kode guru ASLI
// sekarang disimpan di field Teacher.code (bisa diedit lewat menu Data
// Dewan Guru) — konstanta ini cuma fallback untuk 3 slot cadangan/bilingual
// yang bukan guru sungguhan (tidak punya baris Teacher tersendiri).
const CADANGAN_CODE_BY_NAME: Record<string, number> = {
  'Guru IPA (Cadangan)': 21,
  'Guru B. Inggris (Cadangan)': 22,
  'Native Speaker (Program Bilingual)': 23,
};

const parseClassRosterStudentsText = (text: string): ClassRosterStudent[] =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(.*)-\s*(L|P)\s*$/i);
      if (match) {
        return { name: match[1].trim(), gender: match[2].toUpperCase() === 'P' ? 'P' : 'L' } as ClassRosterStudent;
      }
      return { name: line, gender: 'L' } as ClassRosterStudent;
    });

// Helper untuk Rekap Absensi Murid — kunci bulan berformat 'YYYY-MM' (sama
// persis format <input type="month">), dipetakan ke nama bulan Indonesia
// supaya bisa dituliskan di judul/hasil ekspor CSV.
const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const formatMonthLabel = (monthKey: string): string => {
  const [y, m] = monthKey.split('-').map(Number);
  if (!y || !m) return monthKey;
  return `${MONTH_NAMES_ID[m - 1]} ${y}`;
};

const monthKeysInRange = (from: string, to: string): string[] => {
  if (!from || !to) return [];
  const [fy, fm] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  if (!fy || !fm || !ty || !tm) return [];
  const startIdx = fy * 12 + fm;
  const endIdx = ty * 12 + tm;
  if (startIdx > endIdx) return [];
  const keys: string[] = [];
  let idx = startIdx;
  while (idx <= endIdx) {
    const y = Math.floor((idx - 1) / 12);
    const m = idx - y * 12;
    keys.push(`${y}-${String(m).padStart(2, '0')}`);
    idx++;
  }
  return keys;
};

const csvEscapeField = (value: string): string =>
  /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

interface StudentDashboardProps {
  articles: Article[];
  setArticles: React.Dispatch<React.SetStateAction<Article[]>>;
  gallery: GalleryItem[];
  setGallery: React.Dispatch<React.SetStateAction<GalleryItem[]>>;
  teachers: Teacher[];
  setTeachers: React.Dispatch<React.SetStateAction<Teacher[]>>;
  uniforms: Uniform[];
  setUniforms: React.Dispatch<React.SetStateAction<Uniform[]>>;
  cashTransactions: CashTransaction[];
  setCashTransactions: React.Dispatch<React.SetStateAction<CashTransaction[]>>;
  fineTransactions: FineTransaction[];
  setFineTransactions: React.Dispatch<React.SetStateAction<FineTransaction[]>>;
  notifications: NotificationItem[];
  setNotifications: React.Dispatch<React.SetStateAction<NotificationItem[]>>;
  logs: ActivityLog[];
  setLogs: React.Dispatch<React.SetStateAction<ActivityLog[]>>;
  settings: SystemSettings;
  setSettings: React.Dispatch<React.SetStateAction<SystemSettings>>;
  attendance: AttendanceMap;
  setAttendance: React.Dispatch<React.SetStateAction<AttendanceMap>>;
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  studentAttendance: StudentAttendanceRecord[];
  setStudentAttendance: React.Dispatch<React.SetStateAction<StudentAttendanceRecord[]>>;
  classRoster: ClassRosterEntry[];
  setClassRoster: React.Dispatch<React.SetStateAction<ClassRosterEntry[]>>;
  teachingSchedule: TeachingScheduleDay[];
  setTeachingSchedule: React.Dispatch<React.SetStateAction<TeachingScheduleDay[]>>;
  teacherAttendanceLog: TeacherAttendanceRecord[];
  setTeacherAttendanceLog: React.Dispatch<React.SetStateAction<TeacherAttendanceRecord[]>>;
  portalReady: boolean;
  supabaseOn: boolean;
  visitsByDay: Record<string, number>;
  onlineNow: number;
  currentUser: UserType;
  onLogout: () => void;
  addActivityLog: (user: string, role: string, action: 'Login' | 'Logout' | 'Tambah' | 'Edit' | 'Hapus' | 'Export', details: string) => void;
}

export default function StudentDashboard({
  articles, setArticles,
  gallery, setGallery,
  teachers, setTeachers,
  uniforms, setUniforms,
  cashTransactions, setCashTransactions,
  fineTransactions, setFineTransactions,
  notifications, setNotifications,
  logs, setLogs,
  settings, setSettings,
  attendance, setAttendance,
  students,
  setStudents,
  studentAttendance,
  setStudentAttendance,
  classRoster,
  setClassRoster,
  teachingSchedule,
  setTeachingSchedule,
  teacherAttendanceLog,
  setTeacherAttendanceLog,
  portalReady,
  supabaseOn,
  visitsByDay,
  onlineNow,
  currentUser,
  onLogout,
  addActivityLog
}: StudentDashboardProps) {
  
  // Tab Management
  const [dashboardTab, setDashboardTab] = useState<
    | 'overview'
    | 'articles'
    | 'gallery'
    | 'teachers'
    | 'uniforms'
    | 'cash'
    | 'fines'
    | 'users'
    | 'logs'
    | 'settings'
    | 'piket'
    | 'attendance-recap'
    | 'students'
    | 'murid-attendance'
    | 'kunjungan'
    | 'drive-converter'
    | 'class-roster'
    | 'data-guru'
    | 'rekap-absensi-murid'
  >(currentUser.role === 'Guru Piket' ? 'murid-attendance' : 'overview');

  // Menu ERP di mobile default collapsed — sebelumnya daftar menu (10+ tombol)
  // selalu terbuka penuh dan menutupi seluruh layar di atas konten, jadi
  // user harus scroll panjang dulu sebelum lihat isi tab yang aktif.
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const [jadwalDayFilter, setJadwalDayFilter] = useState<'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat'>('Senin');
  const [revealedTeacherCode, setRevealedTeacherCode] = useState<number | null>(null);

  // Mode edit Jadwal Mengajar (Data Guru) — form tambah/ubah/hapus slot jam,
  // hanya untuk Super Admin. scheduleModalSlotIndex null = mode tambah baru.
  const [scheduleEditMode, setScheduleEditMode] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleModalSlotIndex, setScheduleModalSlotIndex] = useState<number | null>(null);
  const [scheduleSlotPeriod, setScheduleSlotPeriod] = useState('');
  const [scheduleSlotTime, setScheduleSlotTime] = useState('');
  const [scheduleSlotType, setScheduleSlotType] = useState<'kelas' | 'kegiatan'>('kelas');
  const [scheduleSlotActivity, setScheduleSlotActivity] = useState('');
  const [scheduleSlotClasses, setScheduleSlotClasses] = useState<Record<string, string>>({});
  const [deleteSlotConfirm, setDeleteSlotConfirm] = useState<{ day: string; index: number } | null>(null);

  const SCHEDULE_CLASS_COLUMNS = ['7A', '7B', '8A', '8B', '8C', '9A', '9B', '9C'];
  const SCHEDULE_TEACHER_OPTIONS = [
    ...teachers.map((t) => t.name),
    'Guru IPA (Cadangan)',
    'Guru B. Inggris (Cadangan)',
    'Native Speaker (Program Bilingual)',
  ];

  // Kode guru dinamis (dari Teacher.code, bisa diedit lewat Data Dewan
  // Guru) digabung dengan fallback kode slot cadangan/bilingual.
  const teacherCodeByName = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of teachers) {
      if (t.code) map.set(t.name, t.code);
    }
    for (const [name, code] of Object.entries(CADANGAN_CODE_BY_NAME)) {
      map.set(name, code);
    }
    return map;
  }, [teachers]);

  const openAddSlotModal = () => {
    setScheduleModalSlotIndex(null);
    setScheduleSlotPeriod('');
    setScheduleSlotTime('');
    setScheduleSlotType('kelas');
    setScheduleSlotActivity('');
    setScheduleSlotClasses({});
    setScheduleModalOpen(true);
  };

  const openEditSlotModal = (index: number, slot: TeachingScheduleSlot) => {
    setScheduleModalSlotIndex(index);
    setScheduleSlotPeriod(slot.period);
    setScheduleSlotTime(slot.time);
    setScheduleSlotType(slot.activity ? 'kegiatan' : 'kelas');
    setScheduleSlotActivity(slot.activity ?? '');
    setScheduleSlotClasses(slot.classes ?? {});
    setScheduleModalOpen(true);
  };

  const handleSaveSlot = () => {
    if (!scheduleSlotPeriod.trim() || !scheduleSlotTime.trim()) {
      triggerDashAlert('error', 'Kode periode dan waktu wajib diisi.');
      return;
    }
    if (scheduleSlotType === 'kegiatan' && !scheduleSlotActivity.trim()) {
      triggerDashAlert('error', 'Keterangan kegiatan wajib diisi.');
      return;
    }

    const newSlot: TeachingScheduleSlot =
      scheduleSlotType === 'kegiatan'
        ? { period: scheduleSlotPeriod.trim(), time: scheduleSlotTime.trim(), activity: scheduleSlotActivity.trim() }
        : { period: scheduleSlotPeriod.trim(), time: scheduleSlotTime.trim(), classes: scheduleSlotClasses };

    setTeachingSchedule((prev) =>
      prev.map((d) => {
        if (d.day !== jadwalDayFilter) return d;
        const slots = [...d.slots];
        if (scheduleModalSlotIndex === null) {
          slots.push(newSlot);
        } else {
          slots[scheduleModalSlotIndex] = newSlot;
        }
        return { ...d, slots };
      })
    );

    addActivityLog(
      currentUser.name,
      currentUser.role,
      scheduleModalSlotIndex === null ? 'Tambah' : 'Edit',
      `${scheduleModalSlotIndex === null ? 'Menambah' : 'Mengubah'} slot jadwal mengajar hari ${jadwalDayFilter} (${scheduleSlotTime})`
    );
    triggerDashAlert('success', 'Jadwal mengajar berhasil disimpan!');
    setScheduleModalOpen(false);
  };

  const confirmDeleteSlot = () => {
    if (!deleteSlotConfirm) return;
    const { day, index } = deleteSlotConfirm;
    setTeachingSchedule((prev) =>
      prev.map((d) => (d.day === day ? { ...d, slots: d.slots.filter((_, i) => i !== index) } : d))
    );
    addActivityLog(currentUser.name, currentUser.role, 'Hapus', `Menghapus slot jadwal mengajar hari ${day}`);
    triggerDashAlert('success', 'Slot jadwal berhasil dihapus.');
    setDeleteSlotConfirm(null);
  };

  const handleUpdatePiketTeacher = (day: string, name: string) => {
    setTeachingSchedule((prev) => prev.map((d) => (d.day === day ? { ...d, piketTeacher: name } : d)));
    addActivityLog(currentUser.name, currentUser.role, 'Edit', `Mengubah Guru Piket hari ${day} menjadi ${name}`);
  };

  // Pindah menu di Navbar kiri harus selalu kembali ke posisi paling atas,
  // supaya konten baru tidak nyangkut di posisi scroll menu sebelumnya.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [dashboardTab]);

  const todayVisitKey = todayDateKey();

  // Search and Filter states
  const [filterCategory, setFilterCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Alerts inside Dashboard
  const [dashAlert, setDashAlert] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Popup pengingat Super Admin — muncul otomatis tiap kali dashboard dibuka
  // (bukan cuma banner tersembunyi di tab Ringkasan), supaya benar-benar
  // ke-notice tiap login, bisa ditutup lalu dibuka lagi lewat banner di Ringkasan.
  const [reminderPopupOpen, setReminderPopupOpen] = useState(false);

  // Modal / Add/Edit Item States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'article' | 'gallery' | 'teacher' | 'uniform' | 'cash' | 'fine' | 'user' | 'student' | 'classRoster' | null>(null);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editId, setEditId] = useState<string | null>(null);

  // Custom Delete Confirmation Modal State
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    type: 'article' | 'gallery' | 'teacher' | 'uniform' | 'cash' | 'fine' | 'student' | 'classRoster' | null;
    id: string | null;
  }>({ isOpen: false, type: null, id: null });

  // Generic Form States
  // 1. Article Form
  const [artTitle, setArtTitle] = useState('');
  const [artCategory, setArtCategory] = useState<'Berita' | 'Kegiatan' | 'Prestasi' | 'OSIS'>('Berita');
  const [artExcerpt, setArtExcerpt] = useState('');
  const [artContent, setArtContent] = useState('');
  const [artImage, setArtImage] = useState('');

  // 2. Gallery Form
  const [galAlbum, setGalAlbum] = useState('');
  const [galType, setGalType] = useState<'Photo' | 'Video'>('Photo');
  const [galUrl, setGalUrl] = useState('');
  const [galCaption, setGalCaption] = useState('');

  // 3. Teacher Form
  const [teachName, setTeachName] = useState('');
  const [teachCode, setTeachCode] = useState('');
  const [teachSubject, setTeachSubject] = useState('');
  const [teachPosition, setTeachPosition] = useState('');
  const [teachImage, setTeachImage] = useState('');
  const [teachWaliKelas, setTeachWaliKelas] = useState('-');

  // Import CSV Data Guru
  const [teacherImportErrors, setTeacherImportErrors] = useState<string[]>([]);
  const [teacherImportBusy, setTeacherImportBusy] = useState(false);

  // 3b. Student (Murid) Form
  const [studName, setStudName] = useState('');
  const [studNis, setStudNis] = useState('');
  const [studNisn, setStudNisn] = useState('');
  const [studClassName, setStudClassName] = useState('');
  const [studGender, setStudGender] = useState<'L' | 'P'>('L');
  const [studSchoolYear, setStudSchoolYear] = useState('2025/2026');
  const [studActive, setStudActive] = useState(true);

  // Import CSV Data Murid
  const [studentImportErrors, setStudentImportErrors] = useState<string[]>([]);
  const [studentImportBusy, setStudentImportBusy] = useState(false);
  const [studentClassFilter, setStudentClassFilter] = useState('all');
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [teacherSearchQuery, setTeacherSearchQuery] = useState('');
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState<{ isOpen: boolean; mode: 'selected' | 'class' | null }>({
    isOpen: false,
    mode: null,
  });
  const [bulkDeleteBusy, setBulkDeleteBusy] = useState(false);

  // 3c. Pengumuman Kelas (Class Roster) Form — satu baris textarea per
  // murid, format "Nama Lengkap - L" atau "Nama Lengkap - P", supaya admin
  // tidak perlu form berulang per murid untuk mengisi satu kelas penuh.
  const [crClassName, setCrClassName] = useState('');
  const [crStudentsText, setCrStudentsText] = useState('');

  // 4. Uniform Form
  const [uniName, setUniName] = useState('');
  const [uniDays, setUniDays] = useState('');
  const [uniDesc, setUniDesc] = useState('');
  const [uniImage, setUniImage] = useState('');

  // 5. Cash Form
  const [cashType, setCashType] = useState<'Masuk' | 'Keluar'>('Masuk');
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [cashCategory, setCashCategory] = useState<'Iuran Bulanan' | 'Konsumsi' | 'Dokumentasi' | 'Sponsorship' | 'Lain-lain'>('Iuran Bulanan');
  const [cashDesc, setCashDesc] = useState('');

  // 6. Fine Form
  const [fineViolator, setFineViolator] = useState('');
  const [fineAmount, setFineAmount] = useState<number>(0);
  const [fineCategory, setFineCategory] = useState<'Keterlambatan' | 'Atribut Tidak Lengkap' | 'Kebersihan' | 'Pengeluaran Kegiatan' | 'Lain-lain'>('Keterlambatan');
  const [fineDesc, setFineDesc] = useState('');
  const [fineStatus, setFineStatus] = useState<'Belum Lunas' | 'Lunas'>('Belum Lunas');

  // 7. User Form — "Tambah Akun" membuat akun Supabase Auth asli (lewat
  // createSignupOnlyClient(), bukan klien sesi utama) + baris profiles-nya;
  // "Edit" hanya mengubah nama/role/status di tabel profiles.
  const [usrName, setUsrName] = useState('');
  const [usrEmail, setUsrEmail] = useState('');
  const [usrRole, setUsrRole] = useState<'Super Admin' | 'Managerial OSIS' | 'Managerial Sekolah' | 'Guru Piket' | 'Guru' | 'Normal User' | 'Orang Tua'>('Normal User');
  const [usrMustChangePwd, setUsrMustChangePwd] = useState(true);
  const [usrPassword, setUsrPassword] = useState('');
  // Cuma dipakai saat usrRole === 'Orang Tua' — id murid (koleksi `students`)
  // yang dihubungkan ke akun ini (1 akun = 1 anak, lihat PRD-PORTAL-ORANG-TUA.md).
  const [usrLinkedStudentId, setUsrLinkedStudentId] = useState('');

  // Daftar profil pengguna ERP, dimuat langsung dari tabel `profiles` di Supabase.
  const [profiles, setProfiles] = useState<UserType[]>([]);
  // Super Admin Password Form States
  const [oldPassword, setOldPassword] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [confirmAdminPassword, setConfirmAdminPassword] = useState('');

  // Reset Sandi Akun Lain (Super Admin only) — lewat Edge Function server-side.
  const [resetPwdTarget, setResetPwdTarget] = useState<UserType | null>(null);
  const [resetPwdValue, setResetPwdValue] = useState('');
  const [resetPwdSubmitting, setResetPwdSubmitting] = useState(false);

  // PIN Keamanan Eksekusi — kode tambahan wajib sebelum hapus massal data
  // krusial (lihat set_execution_pin/verify_execution_pin di schema.sql).
  const [execPinIsSet, setExecPinIsSet] = useState<boolean | null>(null);
  const [execPinNew, setExecPinNew] = useState('');
  const [execPinConfirm, setExecPinConfirm] = useState('');
  const [execPinSubmitting, setExecPinSubmitting] = useState(false);
  // Dipakai popup verifikasi PIN sebelum eksekusi hapus massal murid.
  const [execPinPromptOpen, setExecPinPromptOpen] = useState(false);
  const [execPinPromptValue, setExecPinPromptValue] = useState('');
  const [execPinPromptError, setExecPinPromptError] = useState('');
  const [execPinPromptSubmitting, setExecPinPromptSubmitting] = useState(false);

  // Absensi Guru Piket sekarang dipilih lewat TANGGAL asli (bukan cuma nama
  // hari) — supaya setiap catatan tersimpan sebagai histori per tanggal
  // (bisa direkap per bulan), bukan snapshot nama hari yang tertimpa terus
  // tiap minggu seperti sistem lama.
  const [pikietSelectedDate, setPikietSelectedDate] = useState(() => todayDateKey());
  const pikietIsToday = pikietSelectedDate === todayDateKey();
  const attendanceDayFilter = new Date(`${pikietSelectedDate}T00:00:00`).toLocaleDateString('id-ID', { weekday: 'long' });
  const isSchoolDay = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'].includes(attendanceDayFilter);

  // Guru yang punya jadwal mengajar (kode guru muncul di tabel KBM) untuk
  // setiap hari — dipakai supaya Absensi Guru Piket cuma menampilkan guru
  // yang memang wajib masuk hari itu, sinkron dengan menu "Jadwal Mengajar".
  // Guru yang namanya TIDAK PERNAH muncul sama sekali di jadwal manapun
  // (mis. Kepala Sekolah, yang tugasnya BK Layanan bukan jam KBM terstruktur)
  // tetap ditampilkan SETIAP hari sebagai fallback, karena kita tidak punya
  // info hari kerja spesifik untuk mereka.
  const teacherNamesByDay = useMemo(() => {
    const byDay = new Map<string, Set<string>>();
    const everTaught = new Set<string>();
    for (const day of teachingSchedule) {
      const names = new Set<string>();
      for (const slot of day.slots) {
        if (!slot.classes) continue;
        for (const name of Object.values(slot.classes)) {
          if (name && name !== '-') {
            names.add(name);
            everTaught.add(name);
          }
        }
      }
      byDay.set(day.day, names);
    }
    return { byDay, everTaught };
  }, [teachingSchedule]);

  const teachersForAttendanceDay = useMemo(() => {
    if (!isSchoolDay) return [];
    const namesToday = teacherNamesByDay.byDay.get(attendanceDayFilter);
    if (!namesToday) return teachers;
    return teachers.filter(
      (t) => namesToday.has(t.name) || !teacherNamesByDay.everTaught.has(t.name)
    );
  }, [teachers, teacherNamesByDay, attendanceDayFilter, isSchoolDay]);

  // Status guru pada pikietSelectedDate, diambil dari teacherAttendanceLog
  // (histori per tanggal), bukan dari AttendanceMap lama (per nama hari).
  const teacherStatusOnSelectedDate = (teacherId: string): StudentAttendanceStatus | undefined =>
    teacherAttendanceLog.find((r) => r.teacherId === teacherId && r.date === pikietSelectedDate)?.status;

  const setTeacherStatusOnSelectedDate = async (teacher: Teacher, status: StudentAttendanceStatus) => {
    const existing = teacherAttendanceLog.find(
      (r) => r.teacherId === teacher.id && r.date === pikietSelectedDate
    );
    const record: TeacherAttendanceRecord = {
      id: existing?.id ?? `tatt-${teacher.id}-${pikietSelectedDate}`,
      teacherId: teacher.id,
      teacherName: teacher.name,
      date: pikietSelectedDate,
      status,
      recordedBy: currentUser.name,
    };

    if (portalReady && supabaseOn) {
      // upsert_teacher_attendance menulis & meng-broadcast Realtime SATU
      // baris saja (lihat migrate_teacher_attendance_table.sql) — bukan lagi
      // seluruh riwayat absensi guru seperti waktu masih blob JSONB tunggal.
      const saved = await upsertTeacherAttendance(record);
      setTeacherAttendanceLog((prev) => mergeTeacherAttendanceRecord(prev, saved ?? record));
    } else {
      setTeacherAttendanceLog((prev) => mergeTeacherAttendanceRecord(prev, record));
    }
  };

  // Jam berjalan (hari, tanggal, waktu sekarang) untuk header Absensi Guru Piket —
  // update tiap detik supaya benar-benar menunjukkan waktu real-time saat guru diabsen.
  const [pikietClockNow, setPikietClockNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setPikietClockNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const pikietClockDateLabel = pikietClockNow.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const pikietClockTimeLabel = pikietClockNow.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  // Rekap Absensi Murid — rentang bulan (boleh satu bulan saja kalau
  // Dari/Sampai diisi sama) + filter kelas opsional.
  const [rekapMuridFromMonth, setRekapMuridFromMonth] = useState(() => todayDateKey().slice(0, 7));
  const [rekapMuridToMonth, setRekapMuridToMonth] = useState(() => todayDateKey().slice(0, 7));
  const [rekapMuridClassFilter, setRekapMuridClassFilter] = useState('all');

  const rekapMuridMonthKeys = useMemo(
    () => monthKeysInRange(rekapMuridFromMonth, rekapMuridToMonth),
    [rekapMuridFromMonth, rekapMuridToMonth]
  );

  const rekapMuridClassOptions = useMemo(
    () => Array.from(new Set(students.map((s) => s.className))).sort(),
    [students]
  );

  const buildRekapMuridRowsForMonth = (monthKey: string) => {
    const counts = new Map<string, { Hadir: number; Izin: number; Sakit: number; Alpa: number }>();
    for (const r of studentAttendance) {
      if (!r.date.startsWith(monthKey)) continue;
      if (rekapMuridClassFilter !== 'all' && r.className !== rekapMuridClassFilter) continue;
      const c = counts.get(r.studentId) ?? { Hadir: 0, Izin: 0, Sakit: 0, Alpa: 0 };
      c[r.status] += 1;
      counts.set(r.studentId, c);
    }
    return students
      .filter((s) => s.active && (rekapMuridClassFilter === 'all' || s.className === rekapMuridClassFilter))
      .map((s) => {
        const c = counts.get(s.id) ?? { Hadir: 0, Izin: 0, Sakit: 0, Alpa: 0 };
        const total = c.Hadir + c.Izin + c.Sakit + c.Alpa;
        return { id: s.id, name: s.name, className: s.className, ...c, total };
      })
      .sort((a, b) => a.className.localeCompare(b.className) || a.name.localeCompare(b.name, 'id'));
  };

  const handleExportRekapMurid = () => {
    if (rekapMuridMonthKeys.length === 0) {
      triggerDashAlert('error', 'Rentang bulan tidak valid — pastikan "Dari Bulan" tidak melewati "Sampai Bulan".');
      return;
    }

    const sections = rekapMuridMonthKeys.map((monthKey) => {
      const label = formatMonthLabel(monthKey);
      const rows = buildRekapMuridRowsForMonth(monthKey);
      const lines = [
        `REKAP ABSENSI MURID - ${label.toUpperCase()}`,
        'Nama Murid,Kelas,Hadir,Izin,Sakit,Alpa,Total',
        ...rows.map((r) => [csvEscapeField(r.name), r.className, r.Hadir, r.Izin, r.Sakit, r.Alpa, r.total].join(',')),
      ];
      return lines.join('\n');
    });

    const csvContent = sections.join('\n\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const fileLabel = rekapMuridMonthKeys.length === 1
      ? formatMonthLabel(rekapMuridMonthKeys[0]).replace(' ', '_')
      : `${formatMonthLabel(rekapMuridMonthKeys[0]).replace(' ', '_')}_sd_${formatMonthLabel(rekapMuridMonthKeys[rekapMuridMonthKeys.length - 1]).replace(' ', '_')}`;
    a.download = `Rekap_Absensi_Murid_${fileLabel}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    addActivityLog(currentUser.name, currentUser.role, 'Export', `Mengekspor Rekap Absensi Murid (${rekapMuridMonthKeys.map(formatMonthLabel).join(', ')})`);
    triggerDashAlert('success', 'Rekap Absensi Murid berhasil diekspor ke CSV!');
  };

  // Rekap Absensi Guru — style sama persis dengan Rekap Absensi Murid
  // (rentang bulan + tabel per bulan + ekspor CSV berjudul nama bulan),
  // dihitung dari teacherAttendanceLog (histori per tanggal asli).
  const [rekapGuruFromMonth, setRekapGuruFromMonth] = useState(() => todayDateKey().slice(0, 7));
  const [rekapGuruToMonth, setRekapGuruToMonth] = useState(() => todayDateKey().slice(0, 7));

  const rekapGuruMonthKeys = useMemo(
    () => monthKeysInRange(rekapGuruFromMonth, rekapGuruToMonth),
    [rekapGuruFromMonth, rekapGuruToMonth]
  );

  const buildRekapGuruRowsForMonth = (monthKey: string) => {
    const counts = new Map<string, { Hadir: number; Izin: number; Sakit: number; Alpa: number }>();
    for (const r of teacherAttendanceLog) {
      if (!r.date.startsWith(monthKey)) continue;
      const c = counts.get(r.teacherId) ?? { Hadir: 0, Izin: 0, Sakit: 0, Alpa: 0 };
      c[r.status] += 1;
      counts.set(r.teacherId, c);
    }
    return teachers
      .map((t) => {
        const c = counts.get(t.id) ?? { Hadir: 0, Izin: 0, Sakit: 0, Alpa: 0 };
        const total = c.Hadir + c.Izin + c.Sakit + c.Alpa;
        return { id: t.id, name: t.name, subject: t.subject, ...c, total };
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'id'));
  };

  const handleExportRekapGuru = () => {
    if (rekapGuruMonthKeys.length === 0) {
      triggerDashAlert('error', 'Rentang bulan tidak valid — pastikan "Dari Bulan" tidak melewati "Sampai Bulan".');
      return;
    }

    const sections = rekapGuruMonthKeys.map((monthKey) => {
      const label = formatMonthLabel(monthKey);
      const rows = buildRekapGuruRowsForMonth(monthKey);
      const lines = [
        `REKAP ABSENSI GURU - ${label.toUpperCase()}`,
        'Nama Guru,Mata Pelajaran,Hadir,Izin,Sakit,Alpa,Total',
        ...rows.map((r) => [csvEscapeField(r.name), csvEscapeField(r.subject), r.Hadir, r.Izin, r.Sakit, r.Alpa, r.total].join(',')),
      ];
      return lines.join('\n');
    });

    const csvContent = sections.join('\n\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const fileLabel = rekapGuruMonthKeys.length === 1
      ? formatMonthLabel(rekapGuruMonthKeys[0]).replace(' ', '_')
      : `${formatMonthLabel(rekapGuruMonthKeys[0]).replace(' ', '_')}_sd_${formatMonthLabel(rekapGuruMonthKeys[rekapGuruMonthKeys.length - 1]).replace(' ', '_')}`;
    a.download = `Rekap_Absensi_Guru_${fileLabel}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    addActivityLog(currentUser.name, currentUser.role, 'Export', `Mengekspor Rekap Absensi Guru (${rekapGuruMonthKeys.map(formatMonthLabel).join(', ')})`);
    triggerDashAlert('success', 'Rekap Absensi Guru berhasil diekspor ke CSV!');
  };

  const [sessionTime, setSessionTime] = useState<number>(0);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
    source: 'GPS' | 'Default (SMP Taman Harapan Bekasi)';
    distanceToSchool: number | null;
  }>({
    latitude: -6.2197472,
    longitude: 107.0125807,
    accuracy: 0,
    source: 'Default (SMP Taman Harapan Bekasi)',
    distanceToSchool: 0
  });

  const [networkInfo, setNetworkInfo] = useState<{
    ip: string;
    isp: string;
    city: string;
    country: string;
  } | null>(null);

  const [loadingGeo, setLoadingGeo] = useState(false);

  React.useEffect(() => {
    // 2. Session time incrementer
    const timerInterval = setInterval(() => {
      setSessionTime(prev => prev + 1);
    }, 1000);

    // 3. Geolocation fetch
    if (navigator.geolocation) {
      setLoadingGeo(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          const acc = position.coords.accuracy;
          
          // SMP Taman Harapan coordinates
          const schLat = -6.2197472;
          const schLon = 107.0125807;

          // Haversine formula
          const R = 6371; 
          const dLat = (schLat - lat) * Math.PI / 180;
          const dLon = (schLon - lon) * Math.PI / 180;
          const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat * Math.PI / 180) * Math.cos(schLat * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          const distance = R * c;

          setUserLocation({
            latitude: lat,
            longitude: lon,
            accuracy: Math.round(acc),
            source: 'GPS',
            distanceToSchool: Number(distance.toFixed(2))
          });
          setLoadingGeo(false);
        },
        (error) => {
          console.log('Error fetching geolocation, falling back:', error);
          setLoadingGeo(false);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }

    // 4. Fetch Client Public IP details safely
    fetch('https://ipapi.co/json/')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch IP details');
        return res.json();
      })
      .then(data => {
        setNetworkInfo({
          ip: data.ip || '127.0.0.1',
          isp: data.org || 'Local ISP',
          city: data.city || 'Bekasi',
          country: data.country_name || 'Indonesia'
        });
      })
      .catch(err => {
        console.log('Error fetching IP:', err);
        setNetworkInfo({
          ip: '114.125.188.' + Math.floor(Math.random() * 255),
          isp: 'Telkom Indonesia',
          city: 'Bekasi',
          country: 'Indonesia'
        });
      });

    return () => {
      clearInterval(timerInterval);
    };
  }, []);

  // Settings Temp Form States
  const [setSchoolName, setSetSchoolName] = useState(settings.schoolName);
  const [setSlogan, setSetSlogan] = useState(settings.slogan);
  const [setAddress, setSetAddress] = useState(settings.address);
  const [setWebsite, setSetWebsite] = useState(settings.website);
  const [setPhone, setSetPhone] = useState(settings.phone);
  const [setWhatsapp, setSetWhatsapp] = useState(settings.whatsapp);
  const [setInstagram, setSetInstagram] = useState(settings.instagram);
  const [setFacebook, setSetFacebook] = useState(settings.facebook);
  const [setPpdbStatus, setSetPpdbStatus] = useState<'Buka' | 'Tutup'>(settings.ppdbStatus);

  // Financial calculations
  const totalCashIn = cashTransactions.filter(t => t.type === 'Masuk').reduce((sum, t) => sum + t.amount, 0);
  const totalCashOut = cashTransactions.filter(t => t.type === 'Keluar').reduce((sum, t) => sum + t.amount, 0);
  const currentCashBalance = totalCashIn - totalCashOut;

  const totalFinesCollected = fineTransactions.filter(f => f.status === 'Lunas').reduce((sum, f) => sum + f.amount, 0);
  const totalFinesUnpaid = fineTransactions.filter(f => f.status === 'Belum Lunas').reduce((sum, f) => sum + f.amount, 0);

  // Role verification helper
  const isSuperAdmin = currentUser.role === 'Super Admin';
  const isManagerialOsis = currentUser.role === 'Managerial OSIS';
  const isManagerial = currentUser.role === 'Super Admin' || isManagerialOsis || currentUser.role === 'Managerial Sekolah';
  const isNormalUser = currentUser.role === 'Normal User';
  const isGuruPiket = currentUser.role === 'Guru Piket';
  const isGuru = currentUser.role === 'Guru';
  const canAccessFinance = currentUser.role === 'Super Admin' || isManagerialOsis;

  // Drag-drop reorder articles / galeri / seragam: update tampilan lokal
  // langsung, simpan server di-debounce (Reorder.Group fire berkali-kali
  // saat drag). RPC reorder_collection generik untuk ketiga key.
  const galleryReorderTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleGalleryReorder = (newOrder: GalleryItem[]) => {
    setGallery(newOrder);
    if (galleryReorderTimer.current) clearTimeout(galleryReorderTimer.current);
    galleryReorderTimer.current = setTimeout(() => {
      reorderCollection('gallery', newOrder.map((g) => g.id));
    }, 600);
  };
  const uniformsReorderTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleUniformsReorder = (newOrder: Uniform[]) => {
    setUniforms(newOrder);
    if (uniformsReorderTimer.current) clearTimeout(uniformsReorderTimer.current);
    uniformsReorderTimer.current = setTimeout(() => {
      reorderCollection('uniforms', newOrder.map((u) => u.id));
    }, 600);
  };
  const articlesReorderTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // newFilteredOrder = urutan hasil drag di list yang sedang ditampilkan
  // (bisa terfilter). Item yang tidak ikut filter tetap di posisi aslinya.
  const handleArticlesReorder = (newFilteredOrder: Article[]) => {
    const filteredIds = new Set(newFilteredOrder.map((a) => a.id));
    let i = 0;
    const next =
      filterCategory === 'All' && !searchQuery.trim()
        ? newFilteredOrder
        : articles.map((a) => (filteredIds.has(a.id) ? newFilteredOrder[i++] : a));
    setArticles(next);
    if (articlesReorderTimer.current) clearTimeout(articlesReorderTimer.current);
    articlesReorderTimer.current = setTimeout(() => {
      reorderCollection('articles', next.map((a) => a.id));
    }, 600);
  };
  const canAccessAttendance =
    currentUser.role === 'Super Admin' ||
    currentUser.role === 'Managerial Sekolah' ||
    isGuruPiket ||
    isGuru;
  const canAccessMurid = canAccessMuridAttendance(currentUser.role);
  const canAccessTeacherData = !isManagerialOsis && !isGuruPiket;

  // Data Murid untuk role "Guru": boleh LIHAT saja (cari/filter/lihat detail),
  // TIDAK boleh tambah/ubah/hapus/import — beda dengan canAccessMurid yang
  // masih dipakai apa adanya untuk role yang boleh kelola penuh (Super Admin,
  // Managerial Sekolah, Guru Piket).
  const canManageMurid = canAccessMurid;
  const canViewMurid = canAccessMurid || isGuru;

  // Saran/reminder Super Admin — dihitung otomatis dari kondisi data saat
  // ini (bukan daftar statis), supaya benar-benar relevan tiap kali login.
  const superAdminReminders = useMemo(() => {
    if (!isSuperAdmin) return [];
    const reminders: { text: string; tab: typeof dashboardTab }[] = [];

    const thisMonthKey = todayDateKey().slice(0, 7);
    const lastBackupMonth = settings.lastBackupExportedAt?.slice(0, 7);
    if (lastBackupMonth !== thisMonthKey) {
      reminders.push({
        text: 'Belum ekspor backup seluruh data bulan ini — data absensi lebih dari 6 bulan akan otomatis terhapus, backup dulu kalau perlu.',
        tab: 'settings',
      });
    }

    const tempIdStudents = students.filter((s) => s.id.startsWith('TEMP-'));
    if (tempIdStudents.length > 0) {
      reminders.push({
        text: `${tempIdStudents.length} murid masih pakai ID sementara (belum NIS asli) — lengkapi lewat menu Data Murid.`,
        tab: 'students',
      });
    }

    const hasGrade7 = classRoster.some((c) => c.className.startsWith('7'));
    if (!hasGrade7) {
      reminders.push({
        text: 'Kelas 7 (7A/7B/7C) belum diisi di Pengumuman Kelas — isi begitu PPDB & pembagian rombel selesai.',
        tab: 'class-roster',
      });
    }

    const today = todayDateKey();
    const todayWeekday = new Date(`${today}T00:00:00`).toLocaleDateString('id-ID', { weekday: 'long' });
    const todayIsSchoolDay = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'].includes(todayWeekday);
    if (todayIsSchoolDay) {
      const namesToday = teacherNamesByDay.byDay.get(todayWeekday);
      const teachersToday = namesToday
        ? teachers.filter((t) => namesToday.has(t.name) || !teacherNamesByDay.everTaught.has(t.name))
        : teachers;
      const alreadyMarked = teacherAttendanceLog.some((r) => r.date === today);
      if (teachersToday.length > 0 && !alreadyMarked) {
        reminders.push({
          text: `Absensi Guru Piket hari ${todayWeekday} belum diisi (${teachersToday.length} guru terjadwal).`,
          tab: 'piket',
        });
      }
    }

    return reminders;
  }, [isSuperAdmin, settings.lastBackupExportedAt, students, classRoster, teacherNamesByDay, teachers, teacherAttendanceLog]);

  // Munculkan popup pengingat otomatis sekali tiap kali dashboard dibuka
  // (login baru / refresh) — sengaja hanya bergantung ke isSuperAdmin, BUKAN
  // ke isi superAdminReminders, supaya tidak nongol berulang setiap data
  // berubah selagi Super Admin masih membuka dashboard yang sama.
  useEffect(() => {
    if (isSuperAdmin && superAdminReminders.length > 0) {
      setReminderPopupOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin]);

  // Ringkasan kehadiran murid hari ini per kelas — ditampilkan di tab
  // Ringkasan untuk SEMUA akun yang login (bukan cuma yang punya akses ke
  // menu Absensi Murid) supaya semua staf bisa lihat sekilas siapa yang
  // sudah hadir, tanpa diberi akses scan/edit absensi itu sendiri. SEMUA
  // kelas & SEMUA murid wajib muncul, bukan cuma yang sudah Hadir — murid
  // tanpa catatan hari ini diberi label "Tanpa Ket.".
  const todayAttendanceKey = todayDateKey();
  const attendanceByClass = useMemo(() => {
    const recordByStudentId = new Map(
      studentAttendance.filter((r) => r.date === todayAttendanceKey).map((r) => [r.studentId, r])
    );
    type Row = { name: string; status: StudentAttendanceStatus | 'Tanpa Ket.'; checkInAt?: string };
    const map = new Map<string, Row[]>();
    for (const s of students) {
      if (!s.active) continue;
      const rec = recordByStudentId.get(s.id);
      const row: Row = { name: s.name, status: rec?.status ?? 'Tanpa Ket.', checkInAt: rec?.checkInAt };
      const list = map.get(s.className) ?? [];
      list.push(row);
      map.set(s.className, list);
    }
    return Array.from(map.entries())
      .map(([className, list]) => {
        const sorted = list.sort((a, b) => a.name.localeCompare(b.name, 'id'));
        return {
          className,
          total: sorted.length,
          hadirCount: sorted.filter((r) => r.status === 'Hadir').length,
          students: sorted,
        };
      })
      .sort((a, b) => a.className.localeCompare(b.className));
  }, [students, studentAttendance, todayAttendanceKey]);

  const todayLongDate = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Daftar murid yang sudah difilter/dicari/diurutkan untuk tab Data Murid —
  // dipakai untuk render tabel & juga logika "pilih semua" checkbox, supaya
  // "pilih semua" hanya memilih baris yang sedang terlihat (bukan seluruh
  // murid kalau sedang difilter per kelas/pencarian).
  const [attendanceOverviewRefreshing, setAttendanceOverviewRefreshing] = useState(false);

  const filteredStudents = useMemo(() => {
    const q = studentSearchQuery.trim().toLowerCase();
    return students
      .filter((s) => studentClassFilter === 'all' || s.className === studentClassFilter)
      .filter((s) => !q || s.name.toLowerCase().includes(q) || s.nis.toLowerCase().includes(q) || s.nisn.toLowerCase().includes(q))
      .sort((a, b) => a.className.localeCompare(b.className) || a.name.localeCompare(b.name, 'id'));
  }, [students, studentClassFilter, studentSearchQuery]);

  const filteredProfiles = useMemo(() => {
    const q = userSearchQuery.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter((u) =>
      u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q)
    );
  }, [profiles, userSearchQuery]);

  const filteredTeachers = useMemo(() => {
    const q = teacherSearchQuery.trim().toLowerCase();
    const sorted = [...teachers].sort((a, b) => (a.code ?? Infinity) - (b.code ?? Infinity));
    if (!q) return sorted;
    return sorted.filter((t) =>
      t.name.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q) || t.position.toLowerCase().includes(q)
    );
  }, [teachers, teacherSearchQuery]);

  const filteredLogs = useMemo(() => {
    const q = logSearchQuery.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter((log) =>
      log.user.toLowerCase().includes(q) || log.role.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q) || log.details.toLowerCase().includes(q)
    );
  }, [logs, logSearchQuery]);

  // Muat daftar profil pengguna ERP langsung dari Supabase (bukan lagi lewat
  // portalDb — RLS di tabel profiles butuh baris SQL asli, bukan blob JSON).
  React.useEffect(() => {
    if (!isSuperAdmin) return;
    let cancelled = false;

    (async () => {
      const supabase = getSupabase();
      if (!supabase) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, role, status, must_change_password')
        .order('name', { ascending: true });

      if (!cancelled && !error && data) {
        setProfiles(
          data.map((p: any) => ({
            id: p.id,
            name: p.name,
            email: p.email ?? '',
            role: p.role,
            status: p.status,
            mustChangePassword: p.must_change_password,
          }))
        );
      }

    })();

    return () => {
      cancelled = true;
    };
  }, [isSuperAdmin]);

  // Guard for users and settings tabs (Super Admin only), and finance tabs
  React.useEffect(() => {
    if ((dashboardTab === 'users' || dashboardTab === 'settings') && !isSuperAdmin) {
      setDashboardTab('overview');
    } else if ((dashboardTab === 'cash' || dashboardTab === 'fines') && !canAccessFinance) {
      setDashboardTab('overview');
    } else if (
      (dashboardTab === 'piket' || dashboardTab === 'attendance-recap') &&
      !canAccessAttendance
    ) {
      setDashboardTab('overview');
    } else if ((dashboardTab === 'murid-attendance' || dashboardTab === 'rekap-absensi-murid' || dashboardTab === 'scanner') && !canAccessMurid) {
      setDashboardTab('overview');
    } else if (dashboardTab === 'teachers' && !canAccessTeacherData) {
      setDashboardTab('overview');
    } else if (dashboardTab === 'kunjungan' && !isSuperAdmin && currentUser.role !== 'Managerial Sekolah' && !isGuruPiket && !isGuru) {
      setDashboardTab('overview');
    }
  }, [dashboardTab, isSuperAdmin, canAccessFinance, canAccessAttendance, canAccessMurid, canAccessTeacherData, currentUser.role]);

  const triggerDashAlert = (type: 'success' | 'error', text: string) => {
    setDashAlert({ type, text });
    setTimeout(() => setDashAlert(null), 3500);
  };

  // Log Notification generator helper
  const addInternalNotification = (type: any, title: string, message: string) => {
    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      type,
      title,
      message,
      date: new Date().toLocaleString('id-ID'),
      read: false
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  // Edit Trigger Handlers
  const openEditModal = (type: 'article' | 'gallery' | 'teacher' | 'uniform' | 'cash' | 'fine' | 'user' | 'student' | 'classRoster', item: any) => {
    setModalType(type);
    setModalMode('edit');
    setEditId(item.id);
    setIsModalOpen(true);

    if (type === 'article') {
      const a = item as Article;
      setArtTitle(a.title);
      setArtCategory(a.category);
      setArtExcerpt(a.excerpt);
      setArtContent(a.content);
      setArtImage(a.image || '');
    } else if (type === 'gallery') {
      const g = item as GalleryItem;
      setGalAlbum(g.album);
      setGalType(g.type);
      setGalUrl(g.url);
      setGalCaption(g.caption);
    } else if (type === 'teacher') {
      const t = item as Teacher;
      setTeachName(t.name);
      setTeachCode(t.code ? String(t.code) : '');
      setTeachSubject(t.subject);
      setTeachPosition(t.position);
      setTeachImage(t.image);
      setTeachWaliKelas(t.waliKelas || '-');
    } else if (type === 'uniform') {
      const u = item as Uniform;
      setUniName(u.name);
      setUniDays(u.days);
      setUniDesc(u.description);
      setUniImage(u.image);
    } else if (type === 'cash') {
      const c = item as CashTransaction;
      setCashType(c.type);
      setCashAmount(c.amount);
      setCashCategory(c.category);
      setCashDesc(c.description);
    } else if (type === 'fine') {
      const f = item as FineTransaction;
      setFineViolator(f.violator || '');
      setFineAmount(f.amount);
      setFineCategory(f.category);
      setFineDesc(f.description);
      setFineStatus(f.status);
    } else if (type === 'user') {
      const u = item as UserType;
      setUsrName(u.name);
      setUsrEmail(u.email);
      setUsrRole(u.role);
      setUsrMustChangePwd(u.mustChangePassword || false);
      setUsrLinkedStudentId(u.linkedStudentId || '');
    } else if (type === 'student') {
      const s = item as Student;
      setStudName(s.name);
      setStudNis(s.nis);
      setStudNisn(s.nisn);
      setStudClassName(s.className);
      setStudGender(s.gender);
      setStudSchoolYear(s.schoolYear);
      setStudActive(s.active);
    } else if (type === 'classRoster') {
      const c = item as ClassRosterEntry;
      setCrClassName(c.className);
      setCrStudentsText(classRosterStudentsToText(c.students));
    }
  };

  const openAddModal = (type: 'article' | 'gallery' | 'teacher' | 'uniform' | 'cash' | 'fine' | 'user' | 'student' | 'classRoster') => {
    setModalType(type);
    setModalMode('add');
    setEditId(null);
    setIsModalOpen(true);

    // Reset Form States
    setArtTitle('');
    setArtCategory('Berita');
    setArtExcerpt('');
    setArtContent('');
    setArtImage('');

    setGalAlbum('');
    setGalType('Photo');
    setGalUrl('');
    setGalCaption('');

    setTeachName('');
    setTeachCode('');
    setTeachSubject('');
    setTeachPosition('');
    setTeachImage('');
    setTeachWaliKelas('-');

    setUniName('');
    setUniDays('');
    setUniDesc('');
    setUniImage('');

    setCashType('Masuk');
    setCashAmount(0);
    setCashCategory('Iuran Bulanan');
    setCashDesc('');

    setFineViolator('');
    setFineAmount(0);
    setFineCategory('Keterlambatan');
    setFineDesc('');
    setFineStatus('Belum Lunas');

    setUsrName('');
    setUsrEmail('');
    setUsrRole('Normal User');
    setUsrMustChangePwd(true);
    setUsrPassword('');
    setUsrLinkedStudentId('');

    setStudName('');
    setStudNis('');
    setStudNisn('');
    setStudClassName('');
    setStudGender('L');
    setStudSchoolYear('2025/2026');
    setStudActive(true);

    const unusedClass = CLASS_ROSTER_OPTIONS.find((cls) => !classRoster.some((c) => c.className === cls));
    setCrClassName(unusedClass ?? CLASS_ROSTER_OPTIONS[0]);
    setCrStudentsText('');
  };

  // Submit Handler for Form Dialogs
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (modalType === 'article') {
      if (modalMode === 'add') {
        const newArt: Article = {
          id: `art-${Date.now()}`,
          title: artTitle,
          category: artCategory,
          excerpt: artExcerpt,
          content: artContent,
          image: artImage || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&q=80&w=600',
          author: currentUser.name,
          date: new Date().toLocaleDateString('id-ID'),
          viewsCount: 0
        };
        const savedArticles = await appendToCollection('articles', newArt);
        setArticles(prev => savedArticles ? (savedArticles as Article[]) : [newArt, ...prev]);
        addActivityLog(currentUser.name, currentUser.role, 'Tambah', `Menambahkan artikel baru: "${artTitle}"`);
        addInternalNotification('Artikel Baru', 'Artikel Baru Diterbitkan', `Artikel "${artTitle}" berhasil diterbitkan oleh ${currentUser.name}.`);
        triggerDashAlert('success', 'Artikel baru berhasil diterbitkan!');
      } else if (editId) {
        const existing = articles.find(a => a.id === editId);
        const updated: Article = {
          ...(existing as Article),
          title: artTitle,
          category: artCategory,
          excerpt: artExcerpt,
          content: artContent,
          image: artImage || existing?.image || ''
        };
        const saved = await updateCollectionItem('articles', editId, updated);
        setArticles(prev => saved ? (saved as Article[]) : prev.map(a => a.id === editId ? updated : a));
        addActivityLog(currentUser.name, currentUser.role, 'Edit', `Merubah artikel: "${artTitle}"`);
        triggerDashAlert('success', 'Artikel berhasil diperbarui!');
      }
    }

    else if (modalType === 'gallery') {
      if (modalMode === 'add') {
        const newGal: GalleryItem = {
          id: `gal-${Date.now()}`,
          album: galAlbum,
          type: galType,
          url: galUrl || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&q=80&w=600',
          caption: galCaption,
          date: new Date().toLocaleDateString('id-ID')
        };
        const savedGallery = await appendToCollection('gallery', newGal);
        setGallery(prev => savedGallery ? (savedGallery as GalleryItem[]) : [newGal, ...prev]);
        addActivityLog(currentUser.name, currentUser.role, 'Tambah', `Menambahkan item galeri: "${galCaption}"`);
        triggerDashAlert('success', 'Dokumentasi Galeri berhasil ditambahkan!');
      } else if (editId) {
        const existing = gallery.find(g => g.id === editId);
        const updated: GalleryItem = {
          ...(existing as GalleryItem),
          album: galAlbum,
          type: galType,
          url: galUrl || existing?.url || '',
          caption: galCaption
        };
        const saved = await updateCollectionItem('gallery', editId, updated);
        setGallery(prev => saved ? (saved as GalleryItem[]) : prev.map(g => g.id === editId ? updated : g));
        addActivityLog(currentUser.name, currentUser.role, 'Edit', `Merubah item galeri: "${galCaption}"`);
        triggerDashAlert('success', 'Item galeri berhasil diperbarui!');
      }
    }

    else if (modalType === 'teacher') {
      const parsedCode = teachCode.trim() ? Number(teachCode.trim()) : undefined;
      if (teachCode.trim() && (!Number.isFinite(parsedCode) || (parsedCode as number) <= 0)) {
        triggerDashAlert('error', 'Kode Mengajar harus berupa angka positif.');
        return;
      }
      if (parsedCode && teachers.some((t) => t.code === parsedCode && t.id !== editId)) {
        triggerDashAlert('error', `Kode Mengajar "${parsedCode}" sudah dipakai guru lain.`);
        return;
      }

      if (modalMode === 'add') {
        const newTeach: Teacher = {
          id: `teach-${Date.now()}`,
          name: teachName,
          code: parsedCode,
          subject: teachSubject,
          position: teachPosition,
          image: teachImage || 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=300',
          waliKelas: teachWaliKelas === '-' ? undefined : teachWaliKelas,
        };
        const savedTeachers = await appendToCollection('teachers', newTeach);
        setTeachers(prev => savedTeachers ? (savedTeachers as Teacher[]) : [...prev, newTeach]);
        addActivityLog(currentUser.name, currentUser.role, 'Tambah', `Menambahkan staf pengajar: "${teachName}"`);
        triggerDashAlert('success', 'Staf pengajar berhasil ditambahkan!');
      } else if (editId) {
        const existing = teachers.find(t => t.id === editId);
        const updated: Teacher = {
          ...(existing as Teacher),
          name: teachName,
          code: parsedCode,
          subject: teachSubject,
          position: teachPosition,
          image: teachImage || existing?.image || '',
          waliKelas: teachWaliKelas === '-' ? undefined : teachWaliKelas,
        };
        const saved = await updateCollectionItem('teachers', editId, updated);
        setTeachers(prev => saved ? (saved as Teacher[]) : prev.map(t => t.id === editId ? updated : t));
        addActivityLog(currentUser.name, currentUser.role, 'Edit', `Merubah staf pengajar: "${teachName}"`);
        triggerDashAlert('success', 'Data staf pengajar diperbarui!');
      }
    }

    else if (modalType === 'uniform') {
      if (modalMode === 'add') {
        const newUni: Uniform = {
          id: `uni-${Date.now()}`,
          name: uniName,
          days: uniDays,
          description: uniDesc,
          image: uniImage || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=400'
        };
        const savedUniforms = await appendToCollection('uniforms', newUni);
        setUniforms(prev => savedUniforms ? (savedUniforms as Uniform[]) : [...prev, newUni]);
        addActivityLog(currentUser.name, currentUser.role, 'Tambah', `Menambahkan jenis seragam: "${uniName}"`);
        triggerDashAlert('success', 'Jenis seragam sekolah berhasil ditambahkan!');
      } else if (editId) {
        const existing = uniforms.find(u => u.id === editId);
        const updated: Uniform = {
          ...(existing as Uniform),
          name: uniName,
          days: uniDays,
          description: uniDesc,
          image: uniImage || existing?.image || ''
        };
        const saved = await updateCollectionItem('uniforms', editId, updated);
        setUniforms(prev => saved ? (saved as Uniform[]) : prev.map(u => u.id === editId ? updated : u));
        addActivityLog(currentUser.name, currentUser.role, 'Edit', `Merubah jenis seragam: "${uniName}"`);
        triggerDashAlert('success', 'Ketentuan seragam berhasil dirubah!');
      }
    }

    else if (modalType === 'cash') {
      if (modalMode === 'add') {
        const newCash: CashTransaction = {
          id: `cash-${Date.now()}`,
          type: cashType,
          amount: Number(cashAmount),
          description: cashDesc,
          category: cashCategory,
          date: new Date().toLocaleDateString('id-ID'),
          author: currentUser.name
        };
        const savedCash = await upsertCashTransaction(newCash);
        setCashTransactions(prev => mergeById(prev, savedCash ?? newCash));
        addActivityLog(currentUser.name, currentUser.role, 'Tambah', `Mencatat keuangan Kas OSIS ${cashType}: "Rp ${Number(cashAmount).toLocaleString()} - ${cashDesc}"`);
        addInternalNotification('Kas Baru', 'Transaksi Kas OSIS Baru', `Kas ${cashType} sebesar Rp ${Number(cashAmount).toLocaleString()} dicatat oleh ${currentUser.name}.`);
        triggerDashAlert('success', 'Arus Kas OSIS berhasil disimpan!');
      } else if (editId) {
        const existing = cashTransactions.find(c => c.id === editId);
        const updated: CashTransaction = {
          ...(existing as CashTransaction),
          type: cashType,
          amount: Number(cashAmount),
          category: cashCategory,
          description: cashDesc
        };
        const saved = await upsertCashTransaction(updated);
        setCashTransactions(prev => mergeById(prev, saved ?? updated));
        addActivityLog(currentUser.name, currentUser.role, 'Edit', `Merubah catatan Kas OSIS: "${cashDesc}"`);
        triggerDashAlert('success', 'Catatan Kas diperbarui!');
      }
    }

    else if (modalType === 'fine') {
      if (modalMode === 'add') {
        const newFine: FineTransaction = {
          id: `fine-${Date.now()}`,
          type: 'Masuk',
          amount: Number(fineAmount),
          description: fineDesc,
          violator: fineViolator,
          category: fineCategory,
          date: new Date().toLocaleDateString('id-ID'),
          author: currentUser.name,
          status: fineStatus
        };
        const savedFines = await upsertFineTransaction(newFine);
        setFineTransactions(prev => mergeById(prev, savedFines ?? newFine));
        addActivityLog(currentUser.name, currentUser.role, 'Tambah', `Mencatat Denda Siswa: "Rp ${Number(fineAmount).toLocaleString()} - ${fineViolator} (${fineCategory})"`);
        addInternalNotification('Denda Baru', 'Pencatatan Denda Pelanggaran', `Denda ${fineCategory} dicatat untuk ${fineViolator} sebesar Rp ${Number(fineAmount).toLocaleString()}.`);
        triggerDashAlert('success', 'Pencatatan denda berhasil disimpan!');
      } else if (editId) {
        const existing = fineTransactions.find(f => f.id === editId);
        const updated: FineTransaction = {
          ...(existing as FineTransaction),
          violator: fineViolator,
          amount: Number(fineAmount),
          category: fineCategory,
          description: fineDesc,
          status: fineStatus
        };
        const saved = await upsertFineTransaction(updated);
        setFineTransactions(prev => mergeById(prev, saved ?? updated));
        addActivityLog(currentUser.name, currentUser.role, 'Edit', `Merubah data denda: "${fineViolator} - ${fineCategory}"`);
        triggerDashAlert('success', 'Data denda pelanggaran berhasil diperbarui!');
      }
    }

    else if (modalType === 'user') {
      if (!isSuperAdmin) {
        triggerDashAlert('error', 'Akses ditolak! Hanya Super Admin yang dapat mengelola akun pengguna.');
        setIsModalOpen(false);
        return;
      }
      if (usrRole === 'Orang Tua' && !usrLinkedStudentId) {
        triggerDashAlert('error', 'Pilih murid yang dihubungkan ke akun Orang Tua ini dulu.');
        return;
      }

      if (modalMode === 'add') {
        const rawId = usrEmail.trim().toLowerCase();
        if (!rawId) {
          triggerDashAlert('error', 'ID Pengguna wajib diisi.');
          return;
        }
        const email = rawId.includes('@') ? rawId : `${rawId}${STAFF_LOGIN_EMAIL_SUFFIXES[0]}`;
        const password = usrPassword.trim() || 'Tamhar123';
        const newAcctPwdError = validatePasswordStrength(password);
        if (newAcctPwdError) {
          triggerDashAlert('error', newAcctPwdError);
          return;
        }

        const signupClient = createSignupOnlyClient();
        if (!signupClient) {
          triggerDashAlert('error', 'Portal belum terhubung ke server.');
          return;
        }

        const { data, error } = await signupClient.auth.signUp({ email, password });

        if (error || !data.user) {
          const msg = error?.message ?? '';
          const hint = msg.includes('already registered')
            ? 'ID itu sudah dipakai akun lain.'
            : msg.includes('Signups not allowed') || msg.includes('signup')
              ? 'Pendaftaran akun baru dimatikan di Supabase. Aktifkan di Dashboard → Authentication → Settings → "Allow new users to sign up".'
              : msg.includes('rate limit')
                ? 'Terlalu banyak percobaan buat akun sebentar ini, coba lagi beberapa menit lagi.'
                : msg || 'Gagal membuat akun.';
          triggerDashAlert('error', hint);
          return;
        }

        // handle_new_auth_user trigger di schema.sql sudah otomatis membuat
        // baris profiles kosong (role default Normal User) — di sini kita
        // langsung isi nama/role/status yang benar lewat sesi Super Admin
        // yang sedang aktif (klien signup di atas sengaja terpisah & tidak
        // menyentuh sesi ini sama sekali).
        const supabase = getSupabase();
        if (supabase) {
          await supabase
            .from('profiles')
            .update({
              name: usrName,
              role: usrRole,
              must_change_password: true,
              linked_student_id: usrRole === 'Orang Tua' ? usrLinkedStudentId : null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', data.user.id);
        }

        setProfiles((prev) => [
          ...prev,
          {
            id: data.user!.id,
            name: usrName,
            email,
            role: usrRole,
            status: 'Active',
            mustChangePassword: true,
            linkedStudentId: usrRole === 'Orang Tua' ? usrLinkedStudentId : undefined,
          } as UserType,
        ]);
        addActivityLog(currentUser.name, currentUser.role, 'Tambah', `Membuat akun ERP baru: "${usrName} (${usrRole})"`);
        triggerDashAlert('success', `Akun berhasil dibuat! ID: ${rawId.includes('@') ? email : rawId} — password: ${password} (wajib diganti saat login pertama).`);
        setIsModalOpen(false);
      } else if (editId) {
        const supabase = getSupabase();
        if (!supabase) { setIsModalOpen(false); return; }
        const { error } = await supabase
          .from('profiles')
          .update({
            name: usrName,
            role: usrRole,
            must_change_password: usrMustChangePwd,
            linked_student_id: usrRole === 'Orang Tua' ? usrLinkedStudentId : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editId);

        if (error) {
          triggerDashAlert('error', 'Gagal menyimpan perubahan akun.');
          return;
        }
        setProfiles((prev) =>
          prev.map((u) =>
            u.id === editId
              ? { ...u, name: usrName, role: usrRole, mustChangePassword: usrMustChangePwd, linkedStudentId: usrRole === 'Orang Tua' ? usrLinkedStudentId : undefined }
              : u
          )
        );
        addActivityLog(currentUser.name, currentUser.role, 'Edit', `Mengedit akun pengguna: "${usrName}"`);
        triggerDashAlert('success', 'Data akun pengguna berhasil dirubah!');
      }
    }

    else if (modalType === 'student') {
      if (!canAccessMurid) {
        triggerDashAlert('error', 'Akses ditolak! Anda tidak berhak mengelola data murid.');
        return;
      }
      if (!studName.trim() || !studNis.trim() || !studClassName.trim()) {
        triggerDashAlert('error', 'Nama, NIS, dan Kelas wajib diisi.');
        return;
      }

      if (modalMode === 'add') {
        if (students.some((s) => s.nis === studNis.trim())) {
          triggerDashAlert('error', `NIS "${studNis.trim()}" sudah dipakai murid lain.`);
          return;
        }
        const newStudent: Student = {
          id: studNis.trim(),
          nis: studNis.trim(),
          nisn: studNisn.trim(),
          name: studName.trim(),
          className: studClassName.trim(),
          gender: studGender,
          schoolYear: studSchoolYear.trim() || '2025/2026',
          active: studActive,
        };
        const saved = await appendToCollection('students', newStudent);
        setStudents(prev => saved ? (saved as Student[]) : [...prev, newStudent]);
        addActivityLog(currentUser.name, currentUser.role, 'Tambah', `Menambahkan data murid: "${newStudent.name}" (${newStudent.className})`);
        triggerDashAlert('success', 'Data murid berhasil ditambahkan!');
      } else if (editId) {
        const existing = students.find(s => s.id === editId);
        const updated: Student = {
          ...(existing as Student),
          name: studName.trim(),
          nisn: studNisn.trim(),
          className: studClassName.trim(),
          gender: studGender,
          schoolYear: studSchoolYear.trim() || '2025/2026',
          active: studActive,
        };
        const saved = await updateCollectionItem('students', editId, updated);
        setStudents(prev => saved ? (saved as Student[]) : prev.map(s => s.id === editId ? updated : s));
        addActivityLog(currentUser.name, currentUser.role, 'Edit', `Merubah data murid: "${updated.name}"`);
        triggerDashAlert('success', 'Data murid berhasil diperbarui!');
      }
    }

    else if (modalType === 'classRoster') {
      const parsedStudents = parseClassRosterStudentsText(crStudentsText);
      if (!crClassName.trim()) {
        triggerDashAlert('error', 'Pilih kelas terlebih dahulu.');
        return;
      }

      if (modalMode === 'add') {
        if (classRoster.some((c) => c.className === crClassName)) {
          triggerDashAlert('error', `Kelas "${crClassName}" sudah punya data. Gunakan tombol Edit.`);
          return;
        }
        const newEntry: ClassRosterEntry = {
          id: crClassName,
          className: crClassName,
          students: parsedStudents,
        };
        const saved = await appendToCollection('classRoster', newEntry);
        setClassRoster(prev => saved ? (saved as ClassRosterEntry[]) : [...prev, newEntry]);
        addActivityLog(currentUser.name, currentUser.role, 'Tambah', `Menambahkan Pengumuman Kelas: "${crClassName}" (${parsedStudents.length} murid)`);
        triggerDashAlert('success', 'Pengumuman Kelas berhasil ditambahkan!');
      } else if (editId) {
        const updated: ClassRosterEntry = { id: editId, className: crClassName, students: parsedStudents };
        const saved = await updateCollectionItem('classRoster', editId, updated);
        setClassRoster(prev => saved ? (saved as ClassRosterEntry[]) : prev.map(c => c.id === editId ? updated : c));
        addActivityLog(currentUser.name, currentUser.role, 'Edit', `Merubah Pengumuman Kelas: "${crClassName}" (${parsedStudents.length} murid)`);
        triggerDashAlert('success', 'Pengumuman Kelas berhasil diperbarui!');
      }
    }

    setIsModalOpen(false);
  };

  // Delete Action triggers
  const handleDeleteItem = (type: 'article' | 'gallery' | 'teacher' | 'uniform' | 'cash' | 'fine' | 'student' | 'classRoster', id: string) => {
    setDeleteConfirm({ isOpen: true, type, id });
  };

  const confirmDelete = async () => {
    const { type, id } = deleteConfirm;
    if (!type || !id) return;

    if (type === 'article') {
      const item = articles.find(a => a.id === id);
      const saved = await deleteCollectionItem('articles', id);
      setArticles(prev => saved ? (saved as Article[]) : prev.filter(a => a.id !== id));
      addActivityLog(currentUser.name, currentUser.role, 'Hapus', `Menghapus artikel: "${item?.title}"`);
    } else if (type === 'gallery') {
      const item = gallery.find(g => g.id === id);
      const saved = await deleteCollectionItem('gallery', id);
      setGallery(prev => saved ? (saved as GalleryItem[]) : prev.filter(g => g.id !== id));
      addActivityLog(currentUser.name, currentUser.role, 'Hapus', `Menghapus dokumentasi galeri: "${item?.caption}"`);
    } else if (type === 'teacher') {
      const item = teachers.find(t => t.id === id);
      const saved = await deleteCollectionItem('teachers', id);
      setTeachers(prev => saved ? (saved as Teacher[]) : prev.filter(t => t.id !== id));
      addActivityLog(currentUser.name, currentUser.role, 'Hapus', `Menghapus staf pengajar: "${item?.name}"`);
    } else if (type === 'uniform') {
      const item = uniforms.find(u => u.id === id);
      const saved = await deleteCollectionItem('uniforms', id);
      setUniforms(prev => saved ? (saved as Uniform[]) : prev.filter(u => u.id !== id));
      addActivityLog(currentUser.name, currentUser.role, 'Hapus', `Menghapus ketentuan seragam: "${item?.name}"`);
    } else if (type === 'cash') {
      const item = cashTransactions.find(c => c.id === id);
      const ok = await deleteCashTransaction(id);
      if (ok) setCashTransactions(prev => removeById(prev, id));
      addActivityLog(currentUser.name, currentUser.role, 'Hapus', `Menghapus transaksi kas OSIS: "${item?.description}"`);
    } else if (type === 'fine') {
      const item = fineTransactions.find(f => f.id === id);
      const ok = await deleteFineTransaction(id);
      if (ok) setFineTransactions(prev => removeById(prev, id));
      addActivityLog(currentUser.name, currentUser.role, 'Hapus', `Menghapus denda siswa: "${item?.violator}"`);
    } else if (type === 'student') {
      const item = students.find(s => s.id === id);
      const saved = await deleteCollectionItem('students', id);
      setStudents(prev => saved ? (saved as Student[]) : prev.filter(s => s.id !== id));
      addActivityLog(currentUser.name, currentUser.role, 'Hapus', `Menghapus data murid: "${item?.name}"`);
    } else if (type === 'classRoster') {
      const item = classRoster.find(c => c.id === id);
      const saved = await deleteCollectionItem('classRoster', id);
      setClassRoster(prev => saved ? (saved as ClassRosterEntry[]) : prev.filter(c => c.id !== id));
      addActivityLog(currentUser.name, currentUser.role, 'Hapus', `Menghapus Pengumuman Kelas: "${item?.className}"`);
    }

    triggerDashAlert('success', `Data ${type} berhasil dihapus dari sistem.`);
    setDeleteConfirm({ isOpen: false, type: null, id: null });
  };

  // Import massal Data Murid dari file CSV (diisi lewat Excel dari template).
  const handleStudentFileImport = async (file: File) => {
    if (!canAccessMurid) {
      triggerDashAlert('error', 'Akses ditolak! Anda tidak berhak mengelola data murid.');
      return;
    }
    setStudentImportErrors([]);
    const text = await file.text();
    const existingNis = new Set(students.map((s) => s.nis));
    const { valid, errors } = parseStudentImportCsv(text, existingNis);

    if (errors.length > 0) {
      setStudentImportErrors(errors);
    }
    if (valid.length === 0) {
      if (errors.length === 0) {
        triggerDashAlert('error', 'Tidak ada baris murid yang valid ditemukan di file ini.');
      }
      return;
    }

    setStudentImportBusy(true);
    let importedCount = 0;
    let latestStudents: Student[] = students;
    for (const newStudent of valid) {
      const saved = await appendToCollection('students', newStudent);
      if (saved) {
        latestStudents = saved as Student[];
      } else {
        latestStudents = [...latestStudents, newStudent];
      }
      importedCount++;
    }
    setStudents(latestStudents);
    setStudentImportBusy(false);

    addActivityLog(currentUser.name, currentUser.role, 'Tambah', `Import massal ${importedCount} data murid dari file Excel/CSV.`);
    if (errors.length > 0) {
      triggerDashAlert('success', `${importedCount} murid berhasil diimpor. ${errors.length} baris dilewati karena tidak valid (lihat detail di bawah).`);
    } else {
      triggerDashAlert('success', `${importedCount} murid berhasil diimpor dari file!`);
    }
  };

  // Import massal Data Guru dari CSV — baris yang "Kode Mengajar"/namanya
  // cocok dengan guru yang sudah ada akan MENIMPA (update), bukan duplikat.
  const handleTeacherFileImport = async (file: File) => {
    if (!isSuperAdmin) {
      triggerDashAlert('error', 'Akses ditolak! Hanya Super Admin yang dapat mengelola data guru.');
      return;
    }
    setTeacherImportErrors([]);
    const text = await file.text();
    const { valid, errors } = parseTeacherImportCsv(text, teachers);

    if (errors.length > 0) {
      setTeacherImportErrors(errors);
    }
    if (valid.length === 0) {
      if (errors.length === 0) {
        triggerDashAlert('error', 'Tidak ada baris guru yang valid ditemukan di file ini.');
      }
      return;
    }

    setTeacherImportBusy(true);
    let addedCount = 0;
    let updatedCount = 0;
    let latestTeachers: Teacher[] = teachers;
    for (const row of valid) {
      const isExisting = latestTeachers.some((t) => t.id === row.id);
      if (isExisting) {
        const saved = await updateCollectionItem('teachers', row.id, row);
        latestTeachers = saved ? (saved as Teacher[]) : latestTeachers.map((t) => (t.id === row.id ? row : t));
        updatedCount++;
      } else {
        const saved = await appendToCollection('teachers', row);
        latestTeachers = saved ? (saved as Teacher[]) : [...latestTeachers, row];
        addedCount++;
      }
    }
    setTeachers(latestTeachers);
    setTeacherImportBusy(false);

    addActivityLog(currentUser.name, currentUser.role, 'Tambah', `Import Data Guru: ${addedCount} baru, ${updatedCount} ditimpa, dari file Excel/CSV.`);
    triggerDashAlert('success', `Import selesai: ${addedCount} guru baru, ${updatedCount} guru ditimpa.${errors.length > 0 ? ` ${errors.length} baris dilewati (lihat detail).` : ''}`);
  };

  const toggleSelectStudent = (id: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Dipanggil dari popup PIN — verifikasi dulu ke server (verify_execution_pin),
  // baru eksekusi hapus massal beneran kalau PIN-nya cocok.
  const handleVerifyPinAndBulkDelete = async () => {
    const supabase = getSupabase();
    if (!supabase) { triggerDashAlert('error', 'Portal belum terhubung ke server.'); return; }
    if (!/^[0-9]{4,6}$/.test(execPinPromptValue)) {
      setExecPinPromptError('PIN harus 4-6 digit angka.');
      return;
    }

    setExecPinPromptSubmitting(true);
    const { data, error } = await supabase.rpc('verify_execution_pin', { p_pin: execPinPromptValue });
    setExecPinPromptSubmitting(false);

    if (error) {
      setExecPinPromptError(
        error.message.includes('belum diatur')
          ? 'PIN belum diatur Super Admin — atur dulu di tab Pengaturan.'
          : error.message.includes('Terlalu banyak')
            ? 'Terlalu banyak percobaan salah — coba lagi beberapa menit lagi.'
            : error.message
      );
      return;
    }
    if (!data) {
      setExecPinPromptError('PIN salah, coba lagi.');
      setExecPinPromptValue('');
      return;
    }

    setExecPinPromptOpen(false);
    setExecPinPromptValue('');
    setExecPinPromptError('');
    await confirmBulkDeleteStudents();
  };

  const confirmBulkDeleteStudents = async () => {
    if (!canAccessMurid) {
      triggerDashAlert('error', 'Akses ditolak! Anda tidak berhak mengelola data murid.');
      return;
    }
    const { mode } = bulkDeleteConfirm;
    const targets =
      mode === 'class'
        ? students.filter((s) => s.className === studentClassFilter)
        : students.filter((s) => selectedStudentIds.has(s.id));

    if (targets.length === 0) {
      setBulkDeleteConfirm({ isOpen: false, mode: null });
      return;
    }

    setBulkDeleteBusy(true);
    let latestStudents: Student[] = students;
    for (const target of targets) {
      const saved = await deleteCollectionItem('students', target.id);
      latestStudents = saved ? (saved as Student[]) : latestStudents.filter((s) => s.id !== target.id);
    }
    setStudents(latestStudents);
    setSelectedStudentIds(new Set());
    setBulkDeleteBusy(false);
    setBulkDeleteConfirm({ isOpen: false, mode: null });

    const label = mode === 'class' ? `seluruh kelas "${studentClassFilter}"` : `${targets.length} murid terpilih`;
    addActivityLog(currentUser.name, currentUser.role, 'Hapus', `Menghapus data murid: ${label} (${targets.length} murid).`);
    triggerDashAlert('success', `${targets.length} data murid berhasil dihapus.`);
  };

  // Refresh manual panel "Kehadiran Murid Hari Ini per Kelas" — ambil ulang
  // students + studentAttendance langsung dari server (bukan cuma nunggu
  // event realtime), supaya ada jalan pasti-segar & cepat kalau dibutuhkan.
  const handleRefreshAttendanceOverview = async () => {
    if (!portalReady || !supabaseOn) return;
    setAttendanceOverviewRefreshing(true);
    const [studentsPayload, attendanceRecords] = await Promise.all([
      fetchCollectionRow('students'),
      fetchStudentAttendance(),
    ]);
    if (Array.isArray(studentsPayload)) setStudents(studentsPayload as Student[]);
    setStudentAttendance(attendanceRecords);
    setAttendanceOverviewRefreshing(false);
  };

  // Change fine payment status
  const handleToggleFinePaid = async (fine: FineTransaction) => {
    const newStatus: 'Belum Lunas' | 'Lunas' = fine.status === 'Lunas' ? 'Belum Lunas' : 'Lunas';
    const updated: FineTransaction = { ...fine, status: newStatus };

    const saved = await upsertFineTransaction(updated);
    setFineTransactions(prev => mergeById(prev, saved ?? updated));
    addActivityLog(currentUser.name, currentUser.role, 'Edit', `Merubah status denda ${fine.violator} menjadi: ${newStatus}`);
    triggerDashAlert('success', `Status pembayaran denda "${fine.violator}" dirubah ke ${newStatus}.`);
  };

  // Settings Save Trigger
  // Cek status PIN keamanan eksekusi (sudah diatur atau belum) begitu tab
  // Pengaturan dibuka — nilainya sendiri TIDAK PERNAH bisa ditarik lewat API
  // (lihat execution_pin_is_set() di schema.sql), cuma true/false.
  useEffect(() => {
    if (dashboardTab !== 'settings' || !isSuperAdmin) return;
    const supabase = getSupabase();
    if (!supabase) return;
    supabase.rpc('execution_pin_is_set').then(({ data }) => {
      setExecPinIsSet(Boolean(data));
    });
  }, [dashboardTab, isSuperAdmin]);

  const handleSetExecutionPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) return;
    if (!/^[0-9]{4,6}$/.test(execPinNew)) {
      triggerDashAlert('error', 'PIN harus 4-6 digit angka.');
      return;
    }
    if (execPinNew !== execPinConfirm) {
      triggerDashAlert('error', 'Konfirmasi PIN tidak cocok.');
      return;
    }
    const supabase = getSupabase();
    if (!supabase) { triggerDashAlert('error', 'Portal belum terhubung ke server.'); return; }

    setExecPinSubmitting(true);
    const { error } = await supabase.rpc('set_execution_pin', { p_pin: execPinNew });
    setExecPinSubmitting(false);

    if (error) {
      triggerDashAlert('error', `Gagal mengatur PIN: ${error.message}`);
      return;
    }
    setExecPinIsSet(true);
    setExecPinNew('');
    setExecPinConfirm('');
    addActivityLog(currentUser.name, currentUser.role, 'Edit', 'Mengatur ulang PIN keamanan eksekusi.');
    triggerDashAlert('success', 'PIN keamanan eksekusi berhasil diatur.');
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      triggerDashAlert('error', 'Hanya Super Admin yang berhak merubah pengaturan portal!');
      return;
    }

    const newSettings: SystemSettings = {
      schoolName: setSchoolName,
      slogan: setSlogan,
      address: setAddress,
      website: setWebsite,
      phone: setPhone,
      whatsapp: setWhatsapp,
      instagram: setInstagram,
      facebook: setFacebook,
      ppdbStatus: setPpdbStatus
    };

    setSettings(newSettings);
    addActivityLog(currentUser.name, currentUser.role, 'Edit', 'Memperbarui Pengaturan Portal Sistem Sekolah.');
    triggerDashAlert('success', 'Pengaturan Portal Sekolah berhasil disimpan dan diaktifkan!');
  };

  // Super Admin Password Save Trigger
  const handleSaveSuperAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      triggerDashAlert('error', 'Hanya Super Admin yang berhak merubah kata sandi ini!');
      return;
    }
    if (!oldPassword) {
      triggerDashAlert('error', 'Kata sandi lama harus diisi!');
      return;
    }
    const newAdminPwdError = validatePasswordStrength(newAdminPassword);
    if (newAdminPwdError) {
      triggerDashAlert('error', newAdminPwdError);
      return;
    }
    if (newAdminPassword !== confirmAdminPassword) {
      triggerDashAlert('error', 'Konfirmasi kata sandi baru tidak cocok!');
      return;
    }

    const supabase = getSupabase();
    if (!supabase || !currentUser.email) {
      triggerDashAlert('error', 'Portal login belum terhubung ke server.');
      return;
    }

    // Verifikasi kata sandi lama dengan re-autentikasi (Supabase tidak punya
    // API "cek password lama" terpisah dari login itu sendiri).
    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: currentUser.email,
      password: oldPassword,
    });
    if (reauthError) {
      triggerDashAlert('error', 'Kata sandi lama tidak cocok!');
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newAdminPassword });
    if (updateError) {
      triggerDashAlert('error', 'Gagal mengganti kata sandi. Coba lagi.');
      return;
    }

    addActivityLog(currentUser.name, currentUser.role, 'Edit', 'Merubah kata sandi Super Admin secara berkala.');
    triggerDashAlert('success', 'Kata sandi Super Admin berhasil dirubah dan dienkripsi!');
    setOldPassword('');
    setNewAdminPassword('');
    setConfirmAdminPassword('');
  };

  // Reset Sandi Akun Lain (Super Admin only) — via Edge Function server-side
  // "admin-reset-password", karena supabase.auth.updateUser() di browser
  // cuma bisa mengubah password akun yang sedang login, bukan akun lain.
  const handleResetUserPassword = async () => {
    if (!isSuperAdmin || !resetPwdTarget) return;
    const resetPwdError = validatePasswordStrength(resetPwdValue);
    if (resetPwdError) {
      triggerDashAlert('error', resetPwdError);
      return;
    }
    const supabase = getSupabase();
    if (!supabase) {
      triggerDashAlert('error', 'Portal belum terhubung ke server.');
      return;
    }

    setResetPwdSubmitting(true);
    const { data, error } = await supabase.functions.invoke('admin-reset-password', {
      body: { userId: resetPwdTarget.id, newPassword: resetPwdValue },
    });
    setResetPwdSubmitting(false);

    const errMsg = (data as { error?: string } | null)?.error;
    if (error || errMsg) {
      triggerDashAlert('error', `Gagal reset sandi: ${errMsg || error?.message || 'Terjadi kesalahan.'}`);
      return;
    }

    setProfiles((prev) =>
      prev.map((p) => (p.id === resetPwdTarget.id ? { ...p, mustChangePassword: true } : p))
    );
    addActivityLog(currentUser.name, currentUser.role, 'Edit', `Reset kata sandi akun: "${resetPwdTarget.name}"`);
    triggerDashAlert('success', `Kata sandi "${resetPwdTarget.name}" berhasil direset. Akun wajib ganti sandi saat login berikutnya.`);
    setResetPwdTarget(null);
    setResetPwdValue('');
  };

  // Simulated export actions
  const handleExportStatement = (moduleName: 'Kas OSIS' | 'Denda Pelanggaran' | 'Log Aktivitas') => {
    addActivityLog(currentUser.name, currentUser.role, 'Export', `Mengekspor laporan berkas excel ${moduleName}`);
    triggerDashAlert('success', `Berkas Excel laporan ${moduleName} berhasil diproduksi & diunduh! 📥`);
  };

  // Filter lists based on search/category
  const filteredArticles = articles.filter(art => {
    const matchesCategory = filterCategory === 'All' || art.category === filterCategory;
    const matchesSearch = art.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          art.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const filteredCash = cashTransactions.filter(t => {
    return t.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
           t.category.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredFines = fineTransactions.filter(f => {
    return (f.violator || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
           f.category.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-[#070e1b] text-slate-100 pb-16 pt-24 text-left">

      {/* Dashboard Top banner */}
      <div className="bg-[#0b1d33] border-b border-slate-800 py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden shadow-lg">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(251,191,36,0.04),transparent_50%)]" />
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center space-x-2.5 text-amber-400">
              <Shield className="w-4 h-4 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-widest bg-amber-400/10 px-2.5 py-1 rounded-full">
                {currentUser.role} Portal ERP
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black mt-2 tracking-tight text-white">
              Selamat datang, {currentUser.name}! 👋
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Sistem ERP OSIS SMP Taman Harapan Bekasi. Kelola arus kas transparan, log pelanggaran, data guru, serta publikasi berita resmi sekolah.
            </p>
          </div>

          {/* Quick Stats Banner */}
          {canAccessFinance && (
            <div className="flex items-center space-x-4 bg-slate-900/80 border border-slate-800 p-4 rounded-2xl shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 bg-amber-400/10 text-amber-400 rounded-xl flex items-center justify-center">
                  <span className="text-xs font-black font-sans select-none tracking-tight">Rp</span>
                </div>
                <div className="text-left">
                  <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Saldo Kas OSIS</p>
                  <p className="text-sm font-black text-amber-400 font-display">Rp {currentCashBalance.toLocaleString()}</p>
                </div>
              </div>
              <div className="h-8 w-[1px] bg-slate-800" />
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 bg-rose-500/10 text-rose-400 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Denda Unpaid</p>
                  <p className="text-sm font-black text-rose-400 font-display">Rp {totalFinesUnpaid.toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        
        {/* Dynamic Alerts — fixed toast, z-[100] agar tetap terlihat di atas modal (z-50) */}
        <AnimatePresence>
          {dashAlert && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4"
            >
              <div className={`p-4 rounded-xl border flex items-center space-x-3 text-xs font-bold shadow-2xl ${
                dashAlert.type === 'success'
                  ? 'bg-[#0f2d4e] border-amber-400 text-white'
                  : 'bg-rose-950/40 border-rose-500 text-rose-200'
              }`}>
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{dashAlert.text}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Panel Sidebar Navigation */}
          <div className="lg:col-span-3 bg-[#0b1d33] border border-slate-800 rounded-2xl p-4 shadow-sm">
            {/* Toggle menu ERP — mobile-only. Daftar menu (20+ tombol) tadinya
                selalu terbuka penuh dan menutupi layar di atas konten, jadi
                default-nya sekarang collapsed di HP; desktop tidak berubah. */}
            <button
              type="button"
              onClick={() => setIsMobileNavOpen((prev) => !prev)}
              className="lg:hidden w-full flex items-center justify-between px-3 py-3 mb-2 rounded-xl bg-slate-900 border border-slate-800 text-sm font-extrabold text-white cursor-pointer"
              id="mobile-erp-menu-toggle"
            >
              <span className="flex items-center space-x-2">
                <LayoutDashboardIcon className="w-4 h-4 shrink-0 text-amber-400" />
                <span>-- PILIH MENU --</span>
              </span>
              {isMobileNavOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            <div
              onClick={() => setIsMobileNavOpen(false)}
              className={`${isMobileNavOpen ? 'block' : 'hidden'} lg:block space-y-1.5`}
            >
            <span className="text-xs lg:text-[10px] font-extrabold uppercase tracking-widest text-slate-400 px-3 block mb-2">MENU MODUL ERP</span>

            {/* SCANNER — paling atas, sengaja terpisah dari grup "Absensi &
                Kehadiran" di bawah supaya jadi SATU titik akses paling
                menonjol untuk kiosk scan (guru & murid sekaligus) + cetak
                kartu, bukan tersebar/berulang di beberapa tab. */}
            {canAccessMurid && (
              <button
                onClick={() => setDashboardTab('scanner')}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm lg:text-xs font-bold transition-all cursor-pointer ${
                  dashboardTab === 'scanner'
                    ? 'bg-amber-400 text-slate-900 shadow'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <ScanLine className="w-4 h-4 shrink-0" />
                <span>SCANNER</span>
              </button>
            )}

            {/* Overview — sekarang juga tampil untuk Guru Piket (sebelumnya disembunyikan). */}
            <button
              onClick={() => setDashboardTab('overview')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm lg:text-xs font-bold transition-all cursor-pointer ${
                dashboardTab === 'overview'
                  ? 'bg-amber-400 text-slate-900 shadow'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <BarChart3 className="w-4 h-4 shrink-0" />
              <span>Workspace Ringkasan</span>
            </button>

            {/* Jadwal Mengajar (KBM) — sengaja ungrouped, langsung di bawah
                "MENU MODUL ERP" (bukan di dalam grup "Absensi & Kehadiran"),
                supaya tetap tampil rapi dengan label yang jelas untuk SEMUA
                role, termasuk Managerial OSIS yang tidak punya akses ke
                item lain di grup Absensi & Kehadiran (sebelumnya tombol ini
                jadi "nyasar" tanpa judul grup di atasnya untuk role itu).
                Sekarang juga tampil untuk Guru Piket. */}
            <button
              onClick={() => setDashboardTab('data-guru')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm lg:text-xs font-bold transition-all cursor-pointer ${
                dashboardTab === 'data-guru'
                  ? 'bg-amber-400 text-slate-900 shadow'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <Calendar className="w-4 h-4 shrink-0" />
              <span>Jadwal Mengajar</span>
            </button>

            {/* Grup: Absensi & Kehadiran */}
            {(canAccessAttendance || canAccessMurid) && (
              <span className="text-[11px] lg:text-[9px] font-extrabold uppercase tracking-widest text-slate-600 px-3 pt-3 pb-1 block">Absensi & Kehadiran</span>
            )}

            {/* Urutan 1: Data Dewan Guru (profil guru) — dipindah ke sini dari
                grup "Konten Sekolah" sebelumnya. */}
            {canAccessTeacherData && (
              <button
                onClick={() => setDashboardTab('teachers')}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm lg:text-xs font-bold transition-all cursor-pointer ${
                  dashboardTab === 'teachers'
                    ? 'bg-amber-400 text-slate-900 shadow'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <Users className="w-4 h-4 shrink-0" />
                <span>Data Dewan Guru ({teachers.length})</span>
              </button>
            )}

            {/* Urutan 2: Data Murid — kelola penuh untuk Super Admin/Manajerial Sekolah/Guru Piket,
                Guru cuma bisa lihat (lihat canViewMurid/canManageMurid). */}
            {canViewMurid && (
              <button
                onClick={() => setDashboardTab('students')}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm lg:text-xs font-bold transition-all cursor-pointer ${
                  dashboardTab === 'students'
                    ? 'bg-amber-400 text-slate-900 shadow'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <User className="w-4 h-4 shrink-0" />
                <span>Data Murid ({students.length})</span>
              </button>
            )}

            {/* Guru Piket Attendance */}
            {canAccessAttendance && (
              <button
                onClick={() => setDashboardTab('piket')}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm lg:text-xs font-bold transition-all cursor-pointer ${
                  dashboardTab === 'piket'
                    ? 'bg-amber-400 text-slate-900 shadow'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Absensi Guru Piket</span>
              </button>
            )}

            {/* Rekap Absensi Bulanan */}
            {canAccessAttendance && (
              <button
                onClick={() => setDashboardTab('attendance-recap')}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm lg:text-xs font-bold transition-all cursor-pointer ${
                  dashboardTab === 'attendance-recap'
                    ? 'bg-amber-400 text-slate-900 shadow'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <BarChart3 className="w-4 h-4 shrink-0" />
                <span>Rekap Absensi Bulanan</span>
              </button>
            )}

            {/* Absensi Murid (scan + manual) — hanya Super Admin, Manajerial Sekolah, Guru Piket */}
            {canAccessMurid && (
              <button
                onClick={() => setDashboardTab('murid-attendance')}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm lg:text-xs font-bold transition-all cursor-pointer ${
                  dashboardTab === 'murid-attendance'
                    ? 'bg-amber-400 text-slate-900 shadow'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <Users className="w-4 h-4 shrink-0" />
                <span>Absensi Murid (Scan)</span>
              </button>
            )}

            {/* Rekap Absensi Murid per bulan */}
            {canAccessMurid && (
              <button
                onClick={() => setDashboardTab('rekap-absensi-murid')}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm lg:text-xs font-bold transition-all cursor-pointer ${
                  dashboardTab === 'rekap-absensi-murid'
                    ? 'bg-amber-400 text-slate-900 shadow'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <BarChart3 className="w-4 h-4 shrink-0" />
                <span>Rekap Absensi Murid</span>
              </button>
            )}

            {/* Grup: Konten Sekolah — sekarang juga tampil untuk Guru Piket. */}
            <span className="text-[11px] lg:text-[9px] font-extrabold uppercase tracking-widest text-slate-600 px-3 pt-3 pb-1 block">Konten Sekolah</span>

            {/* Artikel */}
            <button
              onClick={() => { setDashboardTab('articles'); setFilterCategory('All'); setSearchQuery(''); }}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm lg:text-xs font-bold transition-all cursor-pointer ${
                dashboardTab === 'articles'
                  ? 'bg-amber-400 text-slate-900 shadow'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span>Artikel & Kegiatan ({articles.length})</span>
            </button>

            {/* Galeri */}
            <button
              onClick={() => setDashboardTab('gallery')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm lg:text-xs font-bold transition-all cursor-pointer ${
                dashboardTab === 'gallery'
                  ? 'bg-amber-400 text-slate-900 shadow'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <FileImage className="w-4 h-4 shrink-0" />
              <span>Dokumentasi Galeri ({gallery.length})</span>
            </button>

            {/* Seragam */}
            <button
              onClick={() => setDashboardTab('uniforms')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm lg:text-xs font-bold transition-all cursor-pointer ${
                dashboardTab === 'uniforms'
                  ? 'bg-amber-400 text-slate-900 shadow'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <Calendar className="w-4 h-4 shrink-0" />
              <span>Jadwal Seragam ({uniforms.length})</span>
            </button>

            {/* Pengumuman Kelas */}
            <button
              onClick={() => setDashboardTab('class-roster')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm lg:text-xs font-bold transition-all cursor-pointer ${
                dashboardTab === 'class-roster'
                  ? 'bg-amber-400 text-slate-900 shadow'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>Pengumuman Kelas ({classRoster.length})</span>
            </button>

            {/* Grup: Keuangan */}
            {canAccessFinance && (
              <span className="text-[11px] lg:text-[9px] font-extrabold uppercase tracking-widest text-slate-600 px-3 pt-3 pb-1 block">Keuangan</span>
            )}

            {/* Kas OSIS */}
            {canAccessFinance && (
              <button
                onClick={() => { setDashboardTab('cash'); setSearchQuery(''); }}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm lg:text-xs font-bold transition-all cursor-pointer ${
                  dashboardTab === 'cash'
                    ? 'bg-amber-400 text-slate-900 shadow'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <TrendingUp className="w-4 h-4 shrink-0" />
                <span>Transaksi Kas OSIS</span>
              </button>
            )}

            {/* Denda Pelanggaran */}
            {canAccessFinance && (
              <button
                onClick={() => { setDashboardTab('fines'); setSearchQuery(''); }}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm lg:text-xs font-bold transition-all cursor-pointer ${
                  dashboardTab === 'fines'
                    ? 'bg-amber-400 text-slate-900 shadow'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Kas Denda Siswa</span>
              </button>
            )}

            {/* Grup: Administrasi Sistem */}
            {!isGuruPiket && isManagerial && (
              <span className="text-[11px] lg:text-[9px] font-extrabold uppercase tracking-widest text-slate-600 px-3 pt-3 pb-1 block">Administrasi Sistem</span>
            )}

            {/* Activity Logs (Super Admin & Managerial only) */}
            {!isGuruPiket && isManagerial && (
              <button
                onClick={() => setDashboardTab('logs')}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm lg:text-xs font-bold transition-all cursor-pointer ${
                  dashboardTab === 'logs'
                    ? 'bg-amber-400 text-slate-900 shadow'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <FileText className="w-4 h-4 shrink-0" />
                <span>Log Aktivitas Sistem</span>
              </button>
            )}

            {/* Users (Super Admin only) */}
            {!isGuruPiket && isSuperAdmin && (
              <button
                onClick={() => setDashboardTab('users')}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm lg:text-xs font-bold transition-all cursor-pointer ${
                  dashboardTab === 'users'
                    ? 'bg-amber-400 text-slate-900 shadow'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <User className="w-4 h-4 shrink-0" />
                <span>Pengguna & Hak Akses ({profiles.length})</span>
              </button>
            )}

            {/* Settings (Super Admin only) */}
            {!isGuruPiket && isSuperAdmin && (
              <button
                onClick={() => setDashboardTab('settings')}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm lg:text-xs font-bold transition-all cursor-pointer ${
                  dashboardTab === 'settings'
                    ? 'bg-amber-400 text-slate-900 shadow'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <Settings className="w-4 h-4 shrink-0" />
                <span>Pengaturan Portal</span>
              </button>
            )}

            {/* Grup: Alat & Lainnya */}
            <span className="text-[11px] lg:text-[9px] font-extrabold uppercase tracking-widest text-slate-600 px-3 pt-3 pb-1 block">Alat & Lainnya</span>

            {/* Rekap Kunjungan (Super Admin & Managerial Sekolah) */}
            {(isSuperAdmin || currentUser.role === 'Managerial Sekolah' || isGuruPiket || isGuru) && (
              <button
                onClick={() => setDashboardTab('kunjungan')}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm lg:text-xs font-bold transition-all cursor-pointer ${
                  dashboardTab === 'kunjungan'
                    ? 'bg-amber-400 text-slate-900 shadow'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <Globe className="w-4 h-4 shrink-0" />
                <span>Rekap Kunjungan</span>
              </button>
            )}

            {/* Drive Link Converter (available to all logged-in roles) */}
            <button
              onClick={() => setDashboardTab('drive-converter')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm lg:text-xs font-bold transition-all cursor-pointer ${
                dashboardTab === 'drive-converter'
                  ? 'bg-amber-400 text-slate-900 shadow'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <Link2 className="w-4 h-4 shrink-0" />
              <span>Konversi Link Drive</span>
            </button>

            {/* Generator Modul Ajar (tool eksternal untuk guru — disembunyikan dari Manajerial OSIS) */}
            {!isManagerialOsis && (
              <a
                href="https://smptamhar.com/modul-ajar/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm lg:text-xs font-bold transition-all cursor-pointer text-slate-400 hover:bg-slate-900 hover:text-white"
              >
                <FileText className="w-4 h-4 shrink-0" />
                <span className="flex-grow">Generator Modul Ajar</span>
                <ArrowUpRight className="w-3.5 h-3.5 shrink-0 opacity-60" />
              </a>
            )}

            {/* Generator Soal (tool eksternal untuk guru — disembunyikan dari Manajerial OSIS) */}
            {!isManagerialOsis && (
              <a
                href="https://soalcerdas.ai.studio"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm lg:text-xs font-bold transition-all cursor-pointer text-slate-400 hover:bg-slate-900 hover:text-white"
              >
                <HelpCircle className="w-4 h-4 shrink-0" />
                <span className="flex-grow">Generator Soal</span>
                <ArrowUpRight className="w-3.5 h-3.5 shrink-0 opacity-60" />
              </a>
            )}

            <div className="pt-4 border-t border-slate-800 mt-4 space-y-3 px-2">
              <button
                onClick={onLogout}
                className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-extrabold text-rose-400 hover:bg-rose-950/20 transition-colors cursor-pointer text-left border border-transparent hover:border-rose-900/30"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span>Keluar ERP</span>
              </button>
            </div>
            </div>
          </div>

          {/* Right Panel Main Workspace */}
          <div className="lg:col-span-9 space-y-6">
            
            {/* 1. VIEW TAB: RINGKASAN OVERVIEW */}
            {dashboardTab === 'overview' && (
              <div className="space-y-6">

                {/* Saran/Reminder Super Admin — cuma tampil kalau ada yang perlu ditindaklanjuti */}
                {isSuperAdmin && superAdminReminders.length > 0 && (
                  <div className="bg-amber-400/10 border border-amber-400/40 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center space-x-2 text-amber-400">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-xs font-black uppercase tracking-widest">Saran untuk Super Admin</span>
                    </div>
                    <ul className="space-y-2">
                      {superAdminReminders.map((r, i) => (
                        <li key={i}>
                          <button
                            type="button"
                            onClick={() => setDashboardTab(r.tab)}
                            className="w-full text-left text-xs text-amber-100 bg-slate-900/40 hover:bg-slate-900/70 border border-amber-400/20 rounded-xl px-4 py-2.5 cursor-pointer transition-colors"
                          >
                            {r.text}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Statistics Cards */}
                <div
                  className={`grid grid-cols-1 sm:grid-cols-2 ${
                    canAccessFinance && canAccessTeacherData
                      ? 'lg:grid-cols-4'
                      : canAccessFinance || canAccessTeacherData
                        ? 'lg:grid-cols-3'
                        : 'lg:grid-cols-2'
                  } gap-6`}
                >
                  {/* Guru */}
                  {canAccessTeacherData && (
                    <div className="bg-[#0b1d33] border border-slate-800 p-5 rounded-2xl flex items-center space-x-4">
                      <div className="p-3 bg-amber-400/10 text-amber-300 rounded-xl">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Dewan Guru</span>
                        <p className="text-xl font-black text-white mt-0.5">{teachers.length} Guru</p>
                      </div>
                    </div>
                  )}

                  {/* Artikel */}
                  <div className="bg-[#0b1d33] border border-slate-800 p-5 rounded-2xl flex items-center space-x-4">
                    <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Kabar Sekolah</span>
                      <p className="text-xl font-black text-white mt-0.5">{articles.length} Rilis</p>
                    </div>
                  </div>

                  {/* Saldo Kas */}
                  {canAccessFinance && (
                    <div className="bg-[#0b1d33] border border-slate-800 p-5 rounded-2xl flex items-center space-x-4">
                      <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center min-w-[44px] min-h-[44px]">
                        <span className="text-sm font-black font-sans select-none tracking-tight">Rp</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Saldo Kas OSIS</span>
                        <p className="text-lg font-black text-white mt-0.5">Rp {currentCashBalance.toLocaleString()}</p>
                      </div>
                    </div>
                  )}

                  {/* PPDB Status */}
                  <div className="bg-[#0b1d33] border border-slate-800 p-5 rounded-2xl flex items-center space-x-4">
                    <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">PPDB Online</span>
                      <p className="text-xl font-black text-white mt-0.5 uppercase tracking-wide">
                        {settings.ppdbStatus === 'Buka' ? 'DIBUKA' : 'DITUTUP'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Kehadiran Murid Hari Ini per Kelas — tampil untuk SEMUA akun
                    yang login (bukan cuma yang bisa akses menu Absensi Murid),
                    tapi cuma informasi lihat-saja: tombol scan/edit absensi
                    tetap dikunci di canAccessMurid, tidak diberikan di sini. */}
                <div className="bg-[#0b1d33] border border-slate-800 rounded-2xl p-6">
                  <div className="flex items-start gap-3 mb-5 pb-5 border-b border-slate-800">
                    <div className="w-8 shrink-0" />
                    <div className="flex-1 text-center">
                      <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Kehadiran Murid Hari Ini per Kelas</h3>
                      <p className="text-xl sm:text-2xl font-black text-amber-400 mt-2">{todayLongDate}</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRefreshAttendanceOverview}
                      disabled={attendanceOverviewRefreshing}
                      title="Refresh data kehadiran"
                      className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-900 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 ${attendanceOverviewRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                  </div>

                  {attendanceByClass.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-4">Belum ada data siswa.</p>
                  ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                      {attendanceByClass.map(({ className, total, hadirCount, students: classStudents }) => {
                        const pct = total > 0 ? Math.round((hadirCount / total) * 100) : 0;
                        return (
                          <div key={className} className="bg-slate-900/50 border border-slate-800/40 rounded-xl p-4">
                            <div className="flex items-center justify-between gap-3 mb-2">
                              <span className="text-xs font-black text-white uppercase tracking-wider">{className}</span>
                              <span className="text-sm font-black text-white shrink-0">
                                {hadirCount}<span className="text-slate-500 font-bold text-xs">/{total} Hadir</span>
                              </span>
                            </div>
                            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-1000 ${pct === 100 ? 'bg-emerald-500' : pct > 0 ? 'bg-amber-400' : 'bg-slate-700'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-[9px] text-slate-500 font-bold mt-1 block">{pct}% Hadir</span>

                            <div className="mt-3 pt-3 border-t border-slate-800/60 max-h-72 overflow-y-auto space-y-1.5">
                              {classStudents.length === 0 ? (
                                <p className="text-[10px] text-slate-500 italic">Belum ada data murid di kelas ini.</p>
                              ) : (
                                classStudents.map((st, idx) => (
                                  <div key={`${st.name}-${idx}`} className="flex items-center justify-between gap-2 text-[11px]">
                                    <span className="text-slate-200 font-semibold flex items-center gap-1.5 min-w-0">
                                      <span className="w-4 h-4 rounded-full bg-slate-800 text-slate-400 text-[8px] font-black flex items-center justify-center shrink-0">
                                        {idx + 1}
                                      </span>
                                      <span className="truncate">{st.name}</span>
                                    </span>
                                    <span className="flex items-center gap-2 shrink-0">
                                      {st.status === 'Hadir' && (
                                        <span className="text-slate-500 font-mono text-[10px]">{formatCheckInTime(st.checkInAt)}</span>
                                      )}
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                          st.status === 'Hadir'
                                            ? 'bg-emerald-500/15 text-emerald-400'
                                            : st.status === 'Alpa'
                                              ? 'bg-rose-500/15 text-rose-400'
                                              : st.status === 'Tanpa Ket.'
                                                ? 'bg-slate-700/60 text-slate-400'
                                                : 'bg-amber-500/15 text-amber-400'
                                        }`}
                                      >
                                        {st.status}
                                      </span>
                                    </span>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {canAccessMurid && (
                    <div className="text-center mt-5 pt-5 border-t border-slate-800">
                      <button
                        onClick={() => setDashboardTab('murid-attendance')}
                        className="text-[10px] text-amber-400 hover:underline font-bold cursor-pointer"
                      >
                        Buka Menu Absensi Murid (Scan/Manual) →
                      </button>
                    </div>
                  )}
                </div>

                {/* Simulated Chart visualization with custom CSS bars */}
                {canAccessFinance && (
                  <div className="bg-[#0b1d33] border border-slate-800 rounded-2xl p-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                      <div>
                        <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Visualisasi Grafik Keuangan OSIS</h3>
                        <p className="text-[11px] text-slate-400">Rasio perbandingan Iuran masuk vs Pengeluaran Kegiatan</p>
                      </div>
                      <span className="text-xs font-bold text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-lg">Real-Time Sync</span>
                    </div>

                    <div className="space-y-4">
                      {/* Bar 1: Total Masuk */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-slate-300">Total Kas Iuran Masuk</span>
                          <span className="text-emerald-400">Rp {totalCashIn.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-slate-900 h-3.5 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full transition-all duration-1000"
                            style={{ width: totalCashIn > 0 ? '100%' : '0%' }}
                          />
                        </div>
                      </div>

                      {/* Bar 2: Total Keluar */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-slate-300">Total Pengeluaran Kas</span>
                          <span className="text-amber-400">Rp {totalCashOut.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-slate-900 h-3.5 rounded-full overflow-hidden">
                          <div
                            className="bg-amber-400 h-full transition-all duration-1000"
                            style={{ width: totalCashIn > 0 ? `${(totalCashOut / totalCashIn) * 100}%` : '0%' }}
                          />
                        </div>
                      </div>

                      {/* Bar 3: Denda Unpaid */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-slate-300">Tunggakan Kas Denda Pelanggaran (Belum Lunas)</span>
                          <span className="text-rose-400">Rp {totalFinesUnpaid.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-slate-900 h-3.5 rounded-full overflow-hidden">
                          <div
                            className="bg-rose-500 h-full transition-all duration-1000"
                            style={{
                              width: totalFinesUnpaid === 0
                                ? '0%'
                                : (totalCashIn > 0 ? `${Math.min((totalFinesUnpaid / totalCashIn) * 100, 100)}%` : '100%')
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Recent Activities & Transactions Tables */}
                <div className={`grid grid-cols-1 ${canAccessFinance ? 'lg:grid-cols-2' : 'lg:grid-cols-1'} gap-6 text-left`}>
                  
                  {/* Recent Cash logs */}
                  {canAccessFinance && (
                    <div className="bg-[#0b1d33] border border-slate-800 rounded-2xl p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-extrabold uppercase text-white tracking-widest">Transaksi Kas Terbaru</h4>
                        <button
                          onClick={() => setDashboardTab('cash')}
                          className="text-[10px] text-amber-400 hover:underline font-bold"
                        >
                          Lihat Semua
                        </button>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-slate-300">
                          <thead>
                            <tr className="border-b border-slate-800 text-slate-500 font-bold">
                              <th className="pb-2 text-left">Deskripsi</th>
                              <th className="pb-2 text-center">Tipe</th>
                              <th className="pb-2 text-right">Jumlah</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800">
                            {cashTransactions.slice(0, 4).map((t) => (
                              <tr key={t.id} className="hover:bg-slate-900/40">
                                <td className="py-2.5 truncate max-w-[150px]">{t.description}</td>
                                <td className="py-2.5 text-center">
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-black ${
                                    t.type === 'Masuk' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-400/10 text-amber-400'
                                  }`}>
                                    {t.type}
                                  </span>
                                </td>
                                <td className="py-2.5 text-right font-bold text-white">Rp {t.amount.toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Recent Activity logs */}
                  <div className="bg-[#0b1d33] border border-slate-800 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-extrabold uppercase text-white tracking-widest">Log Aktivitas Terbaru</h4>
                      {isManagerial && (
                        <button
                          onClick={() => setDashboardTab('logs')}
                          className="text-[10px] text-amber-400 hover:underline font-bold"
                        >
                          Selengkapnya
                        </button>
                      )}
                    </div>

                    <div className="space-y-2.5">
                      {logs.slice(0, 4).map((log) => (
                        <div key={log.id} className="text-xs flex items-start justify-between border-b border-slate-800/40 pb-2">
                          <div>
                            <p className="font-bold text-white leading-tight">{log.details}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">{log.user} • {log.role}</p>
                          </div>
                          <span className="text-[9px] text-slate-500 font-mono shrink-0 ml-4">{log.timestamp.substring(11)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Section: Informasi Kunjungan & Geografis Portal (Web Traffic & Geolocation) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                  
                  {/* Card 1: Statistik Kunjungan & Sistem */}
                  <div className="bg-[#0b1d33] border border-slate-800 rounded-2xl p-5 space-y-5">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center">
                          <Globe className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-extrabold uppercase text-white tracking-widest">Akses & Kunjungan Portal</h4>
                          <p className="text-[10px] text-slate-400">Statistik lalu lintas & perangkat pengguna</p>
                        </div>
                      </div>
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Kunjungan Hari Ini */}
                      <div className="bg-slate-900/50 border border-slate-800/40 p-3.5 rounded-xl">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Kunjungan Hari Ini</span>
                        <p className="text-lg font-black text-white mt-1">{(visitsByDay[todayVisitKey] ?? 0).toLocaleString()} <span className="text-[10px] text-emerald-400 font-normal">Hits</span></p>
                      </div>

                      {/* Pengguna Aktif — real-time, lihat src/lib/presence.ts */}
                      <div className="bg-slate-900/50 border border-slate-800/40 p-3.5 rounded-xl">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Online Saat Ini</span>
                        <p className="text-lg font-black text-white mt-1">{onlineNow} <span className="text-[10px] text-emerald-400 font-normal">Orang</span></p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDashboardTab('kunjungan')}
                      className="w-full text-center text-[10px] font-bold text-amber-400 hover:underline cursor-pointer"
                    >
                      Lihat Rekap Kunjungan Harian →
                    </button>

                    {/* Metadata detail list */}
                    <div className="space-y-3 pt-1">
                      <div className="flex items-center justify-between text-xs border-b border-slate-800/40 pb-2">
                        <span className="text-slate-400 flex items-center space-x-2">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>Durasi Sesi</span>
                        </span>
                        <span className="text-white font-mono font-bold">
                          {Math.floor(sessionTime / 60)}m {sessionTime % 60}s
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs border-b border-slate-800/40 pb-2">
                        <span className="text-slate-400 flex items-center space-x-2">
                          <Activity className="w-3.5 h-3.5 text-slate-500" />
                          <span>Sistem Operasi / Browser</span>
                        </span>
                        <span className="text-white font-medium text-right max-w-[180px] truncate" title={navigator.userAgent}>
                          {navigator.userAgent.includes('Windows') ? 'Windows' : navigator.userAgent.includes('Mac') ? 'macOS' : navigator.userAgent.includes('Linux') ? 'Linux' : 'Mobile / OS'}
                          {' • '}
                          {navigator.userAgent.includes('Chrome') ? 'Chrome' : navigator.userAgent.includes('Safari') ? 'Safari' : navigator.userAgent.includes('Firefox') ? 'Firefox' : 'Browser'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs pb-1">
                        <span className="text-slate-400 flex items-center space-x-2">
                          <Wifi className="w-3.5 h-3.5 text-slate-500" />
                          <span>Status Jaringan & ISP</span>
                        </span>
                        <span className="text-emerald-400 font-bold flex items-center space-x-1.5 text-right">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          <span>Online • {networkInfo?.isp || 'Telkom Indonesia'}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Lokasi Geografis & Radius Sekolah */}
                  <div className="bg-[#0b1d33] border border-slate-800 rounded-2xl p-5 space-y-5">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 bg-amber-400/10 text-amber-400 rounded-xl flex items-center justify-center">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-extrabold uppercase text-white tracking-widest">Informasi Lokasi & Presensi GPS</h4>
                          <p className="text-[10px] text-slate-400">Verifikasi radius koordinat presensi siswa</p>
                        </div>
                      </div>
                      <span className="text-[9px] font-black text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded uppercase tracking-wider">
                        {loadingGeo ? 'Mencari...' : userLocation.source}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Lokasi Anda */}
                      <div className="bg-slate-900/50 border border-slate-800/40 p-3.5 rounded-xl">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Latitude & Longitude</span>
                        <p className="text-xs font-mono font-bold text-white mt-1.5 truncate">
                          {userLocation.latitude.toFixed(5)}, {userLocation.longitude.toFixed(5)}
                        </p>
                      </div>

                      {/* Jarak ke Sekolah */}
                      <div className="bg-slate-900/50 border border-slate-800/40 p-3.5 rounded-xl">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Jarak ke Sekolah</span>
                        <p className="text-lg font-black text-amber-400 mt-1">
                          {userLocation.distanceToSchool !== null ? `${userLocation.distanceToSchool} km` : '0 km'}
                        </p>
                      </div>
                    </div>

                    {/* Metadata Location detail list */}
                    <div className="space-y-3 pt-1">
                      <div className="flex items-center justify-between text-xs border-b border-slate-800/40 pb-2">
                        <span className="text-slate-400">Sekolah Pusat</span>
                        <span className="text-white font-bold text-right">SMP Taman Harapan Bekasi</span>
                      </div>

                      <div className="flex items-center justify-between text-xs border-b border-slate-800/40 pb-2">
                        <span className="text-slate-400">Alamat Deteksi IP</span>
                        <span className="text-white font-bold text-right">
                          {networkInfo ? `${networkInfo.city}, ${networkInfo.country}` : 'Bekasi, Indonesia'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs pb-1">
                        <span className="text-slate-400">IP Public Terdeteksi</span>
                        <span className="text-slate-300 font-mono text-right">{networkInfo?.ip || 'Detecting...'}</span>
                      </div>
                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* 2. VIEW TAB: ARTIKEL & KEGIATAN CRUD */}
            {dashboardTab === 'articles' && (
              <div className="space-y-6">
                
                {/* Header Action bar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#0b1d33] border border-slate-800 p-5 rounded-2xl">
                  <div>
                    <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Manajemen Berita & Artikel</h3>
                    <p className="text-xs text-slate-400">Total {articles.length} rilis berita terdaftar.</p>
                  </div>

                  <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
                    <button
                      onClick={() => openAddModal('article')}
                      className="flex items-center space-x-1.5 bg-amber-400 hover:bg-amber-300 text-slate-900 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Tulis Artikel Baru</span>
                    </button>
                  </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#0b1d33] border border-slate-800 p-4 rounded-xl">
                  <div className="flex flex-wrap gap-1.5">
                    {['All', 'Berita', 'Kegiatan', 'Prestasi', 'OSIS'].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setFilterCategory(cat)}
                        className={`px-3.5 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                          filterCategory === cat 
                            ? 'bg-amber-400 text-slate-950' 
                            : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    autoComplete="off"
                    placeholder="Cari artikel..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400 w-full sm:w-56"
                  />
                </div>

                {isManagerial ? (
                  <>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                      <GripVertical className="w-3.5 h-3.5" />
                      Tahan ikon di kiri lalu geser naik/turun untuk mengubah urutan tampil di landing page.
                      {(filterCategory !== 'All' || searchQuery.trim()) && (
                        <span className="text-amber-500/80"> (filter aktif: hanya item yang tampil yang digeser relatif)</span>
                      )}
                    </p>
                    <Reorder.Group
                      as="div"
                      axis="y"
                      values={filteredArticles}
                      onReorder={handleArticlesReorder}
                      className="flex flex-col gap-2"
                    >
                      {filteredArticles.map((art) => (
                        <Reorder.Item
                          key={art.id}
                          value={art}
                          className="relative bg-[#0b1d33] border border-slate-800 rounded-xl overflow-hidden flex items-center gap-3 p-3 cursor-grab active:cursor-grabbing active:z-10 active:shadow-2xl active:shadow-black/50 text-left"
                        >
                          <GripVertical className="w-4 h-4 text-slate-500 shrink-0" />
                          <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-x-4 gap-y-1 items-center">
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white truncate">{art.title}</p>
                              <p className="text-[10px] text-slate-500 sm:hidden">{art.author} · {art.date}</p>
                            </div>
                            <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-[10px] text-slate-300 w-fit">
                              {art.category}
                            </span>
                            <span className="hidden sm:inline text-[11px] text-slate-400 truncate max-w-[8rem]">{art.author}</span>
                            <span className="hidden sm:inline text-[11px] text-slate-500 whitespace-nowrap">{art.date}</span>
                          </div>
                          <div className="shrink-0 flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditModal('article', art)}
                              className="p-1.5 hover:bg-slate-800 rounded-lg text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                              title="Edit"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteItem('article', art.id)}
                              className="p-1.5 hover:bg-slate-800 rounded-lg text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                              title="Hapus"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </Reorder.Item>
                      ))}
                    </Reorder.Group>
                    {filteredArticles.length === 0 && (
                      <p className="text-center text-xs text-slate-500 py-8">Tidak ada artikel yang cocok dengan filter.</p>
                    )}
                  </>
                ) : (
                  <div className="bg-[#0b1d33] border border-slate-800 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-slate-300 text-left">
                        <thead>
                          <tr className="bg-slate-900/60 border-b border-slate-800 text-slate-400 font-bold">
                            <th className="p-4">Judul Artikel</th>
                            <th className="p-4">Kategori</th>
                            <th className="p-4">Penulis</th>
                            <th className="p-4">Tanggal</th>
                            <th className="p-4">Views</th>
                            <th className="p-4 text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {filteredArticles.map((art) => (
                            <tr key={art.id} className="hover:bg-slate-900/20">
                              <td className="p-4 font-bold text-white truncate max-w-[220px]">{art.title}</td>
                              <td className="p-4">
                                <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-[10px]">
                                  {art.category}
                                </span>
                              </td>
                              <td className="p-4">{art.author}</td>
                              <td className="p-4">{art.date}</td>
                              <td className="p-4">{art.viewsCount} x</td>
                              <td className="p-4 text-right space-x-2 shrink-0">
                                <button
                                  onClick={() => openEditModal('article', art)}
                                  className="p-1.5 hover:bg-slate-800 rounded-lg text-amber-400 hover:text-amber-300 transition-colors cursor-pointer inline-block"
                                  title="Edit"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* 3. VIEW TAB: DOKUMENTASI GALERI */}
            {dashboardTab === 'gallery' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between bg-[#0b1d33] border border-slate-800 p-5 rounded-2xl">
                  <div>
                    <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Galeri Foto & Video Kegiatan</h3>
                    <p className="text-xs text-slate-400">Total {gallery.length} item dokumentasi terdaftar.</p>
                  </div>
                  {isManagerial && (
                    <button
                      onClick={() => openAddModal('gallery')}
                      className="flex items-center space-x-1.5 bg-amber-400 hover:bg-amber-300 text-slate-900 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Tambah Media</span>
                    </button>
                  )}
                </div>

                {isManagerial ? (
                  <>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                      <GripVertical className="w-3.5 h-3.5" />
                      Tahan ikon di kiri lalu geser naik/turun untuk mengubah urutan tampil di landing page.
                    </p>
                    <Reorder.Group
                      as="div"
                      axis="y"
                      values={gallery}
                      onReorder={handleGalleryReorder}
                      className="flex flex-col gap-3"
                    >
                      {gallery.map((g) => (
                        <Reorder.Item
                          key={g.id}
                          value={g}
                          className="relative bg-[#0b1d33] border border-slate-800 rounded-2xl overflow-hidden flex items-center gap-4 p-3 cursor-grab active:cursor-grabbing active:z-10 active:shadow-2xl active:shadow-black/50"
                        >
                          <GripVertical className="w-4 h-4 text-slate-500 shrink-0" />
                          <div className="relative w-20 h-16 sm:w-28 sm:h-20 shrink-0 rounded-lg overflow-hidden bg-slate-900">
                            <img src={g.url} alt={g.caption} className="w-full h-full object-cover pointer-events-none" referrerPolicy="no-referrer" />
                            <span className="absolute top-1 left-1 bg-slate-900/80 backdrop-blur-md text-white px-1.5 py-0.5 rounded text-[8px] font-bold uppercase">
                              {g.type}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-[10px] text-amber-400 uppercase font-black tracking-wider block">{g.album}</span>
                            <p className="text-xs text-white font-bold leading-snug truncate">{g.caption}</p>
                          </div>
                          <div className="shrink-0 flex items-center gap-3">
                            <button onClick={() => openEditModal('gallery', g)} className="text-xs text-amber-400 hover:underline">Edit</button>
                            <button onClick={() => handleDeleteItem('gallery', g.id)} className="text-xs text-rose-400 hover:underline">Hapus</button>
                          </div>
                        </Reorder.Item>
                      ))}
                    </Reorder.Group>
                  </>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {gallery.map((g) => (
                      <div key={g.id} className="bg-[#0b1d33] border border-slate-800 rounded-2xl overflow-hidden text-left flex flex-col justify-between">
                        <div className="relative aspect-[4/3] bg-slate-900">
                          <img src={g.url} alt={g.caption} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          <span className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md text-white px-2 py-0.5 rounded text-[9px] font-bold uppercase">
                            {g.type}
                          </span>
                        </div>
                        <div className="p-4 space-y-2">
                          <span className="text-[10px] text-amber-400 uppercase font-black tracking-wider block">{g.album}</span>
                          <p className="text-xs text-white font-bold leading-snug line-clamp-2">{g.caption}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 4. VIEW TAB: DATA DEWAN GURU */}
            {dashboardTab === 'teachers' && canAccessTeacherData && (
              <div className="space-y-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#0b1d33] border border-slate-800 p-5 rounded-2xl">
                  <div>
                    <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Data Pengajar & Komite</h3>
                    <p className="text-xs text-slate-400">Total {teachers.length} personil terdaftar.</p>
                  </div>
                  {isSuperAdmin && (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={downloadTeacherTemplate}
                        className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>Unduh Template Excel</span>
                      </button>
                      <label className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer">
                        <FileText className="w-4 h-4" />
                        <span>{teacherImportBusy ? 'Mengimpor...' : 'Import dari Excel'}</span>
                        <input
                          type="file"
                          accept=".csv,text/csv"
                          className="hidden"
                          disabled={teacherImportBusy}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void handleTeacherFileImport(file);
                            e.target.value = '';
                          }}
                        />
                      </label>
                      <button
                        onClick={() => openAddModal('teacher')}
                        className="flex items-center space-x-1.5 bg-amber-400 hover:bg-amber-300 text-slate-900 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Tambah Guru</span>
                      </button>
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-slate-500 -mt-2">
                  Import dari Excel mencocokkan baris lewat "Kode Mengajar" dulu (lalu nama) — kalau cocok dengan guru yang sudah ada, datanya DITIMPA, bukan jadi duplikat.
                </p>

                {teacherImportErrors.length > 0 && (
                  <div className="bg-rose-950/30 border border-rose-800/60 rounded-2xl p-4 space-y-2">
                    <p className="text-xs font-bold text-rose-300">{teacherImportErrors.length} baris dilewati saat import (tidak valid):</p>
                    <ul className="text-[11px] text-rose-300/80 space-y-0.5 max-h-40 overflow-y-auto list-disc list-inside">
                      {teacherImportErrors.map((err, i) => <li key={i}>{err}</li>)}
                    </ul>
                    <button
                      type="button"
                      onClick={() => setTeacherImportErrors([])}
                      className="text-[10px] text-rose-400 hover:underline cursor-pointer"
                    >
                      Tutup
                    </button>
                  </div>
                )}

                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    autoComplete="off"
                    value={teacherSearchQuery}
                    onChange={(e) => setTeacherSearchQuery(e.target.value)}
                    placeholder="Cari nama / mapel / jabatan..."
                    className="w-full bg-[#0b1d33] border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                {teachers.length > 0 && filteredTeachers.length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-6">Tidak ada guru yang cocok dengan pencarian.</p>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                  {filteredTeachers.map((t) => (
                    <div key={t.id} className="bg-[#0b1d33] border border-slate-800 p-4 rounded-xl text-center space-y-2 relative">
                      {t.code && (
                        <span className="absolute top-2 right-2 bg-slate-900 border border-slate-700 text-amber-400 text-[9px] font-black px-1.5 py-0.5 rounded-md font-mono">
                          #{t.code}
                        </span>
                      )}
                      <div className="w-20 h-20 rounded-full overflow-hidden mx-auto bg-slate-900">
                        <img src={t.image} alt={t.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div>
                        <span className="text-[8px] bg-amber-400/10 text-amber-300 px-1.5 py-0.5 rounded font-black uppercase">
                          {t.position}
                        </span>
                        <h4 className="text-xs font-bold text-white mt-2 truncate">{t.name}</h4>
                        <p className="text-[10px] text-slate-400 truncate">{t.subject}</p>
                      </div>

                      {isSuperAdmin && (
                        <div className="pt-2 flex justify-center space-x-3 text-[10px]">
                          <button onClick={() => openEditModal('teacher', t)} className="text-amber-400 hover:underline">Edit</button>
                          <button onClick={() => handleDeleteItem('teacher', t.id)} className="text-rose-400 hover:underline">Hapus</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* VIEW TAB: DATA GURU (Jadwal Mengajar KBM T1 2026/2027) — diresolusi
                dari kode guru di dokumen resmi ke nama asli, ditampilkan per hari.
                Read-only untuk sekarang: jadwal berubah per semester lewat dokumen
                sekolah, bukan sesuatu yang diedit harian di dashboard. */}
            {dashboardTab === 'data-guru' && (() => {
              const activeDay = teachingSchedule.find((d) => d.day === jadwalDayFilter);
              const classColumns = SCHEDULE_CLASS_COLUMNS;
              const revealedName = revealedTeacherCode
                ? Array.from(teacherCodeByName.entries()).find(([, code]) => code === revealedTeacherCode)?.[0]
                : null;

              return (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-[#0b1d33] border border-slate-800 p-5 rounded-2xl">
                    <div>
                      <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Jadwal Mengajar (KBM)</h3>
                      <p className="text-xs text-slate-400 mt-1">
                        {scheduleEditMode
                          ? 'Mode edit aktif — klik "Ubah" atau "Hapus" pada baris jam, atau "Tambah Slot" untuk jam baru.'
                          : <>Setiap sel menampilkan <span className="text-amber-400 font-bold">kode guru</span> — ketuk/klik kodenya untuk melihat nama lengkap.</>}
                      </p>
                    </div>
                    {isSuperAdmin && (
                      <button
                        type="button"
                        onClick={() => setScheduleEditMode((v) => !v)}
                        className={`shrink-0 flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                          scheduleEditMode
                            ? 'bg-rose-600 hover:bg-rose-500 text-white'
                            : 'bg-amber-400 hover:bg-amber-300 text-slate-900'
                        }`}
                      >
                        <Edit3 className="w-4 h-4" />
                        <span>{scheduleEditMode ? 'Selesai Edit' : 'Mode Edit'}</span>
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800 w-fit">
                    {(['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'] as const).map((day) => (
                      <button
                        key={day}
                        onClick={() => { setJadwalDayFilter(day); setRevealedTeacherCode(null); }}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          jadwalDayFilter === day
                            ? 'bg-amber-400 text-slate-950 shadow font-black'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>

                  {/* Panel nama guru — sticky biar tetap kelihatan sambil scroll tabel lebar di HP */}
                  {!scheduleEditMode && (
                    <div className="sticky top-2 z-10 bg-slate-900 border border-amber-400/40 rounded-2xl px-4 py-3 flex items-center justify-between gap-3 shadow-lg">
                      {revealedName ? (
                        <>
                          <span className="text-xs sm:text-sm text-white font-bold break-words">
                            Kode <span className="text-amber-400">{revealedTeacherCode}</span> = {revealedName}
                          </span>
                          <button
                            type="button"
                            onClick={() => setRevealedTeacherCode(null)}
                            className="text-slate-400 hover:text-white shrink-0 cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-slate-400">Ketuk salah satu kode guru di tabel untuk lihat nama lengkapnya di sini.</span>
                      )}
                    </div>
                  )}

                  {activeDay ? (
                    <div className="bg-[#0b1d33] border border-slate-800 rounded-2xl overflow-hidden">
                      <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        {scheduleEditMode ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 shrink-0">Guru Piket hari {activeDay.day}:</span>
                            <select
                              value={activeDay.piketTeacher}
                              onChange={(e) => handleUpdatePiketTeacher(activeDay.day, e.target.value)}
                              className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                            >
                              {SCHEDULE_TEACHER_OPTIONS.map((name) => (
                                <option key={name} value={name}>{name}</option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">
                            Guru Piket hari {activeDay.day}: <span className="text-white font-bold">{activeDay.piketTeacher}</span>
                          </span>
                        )}
                        {scheduleEditMode && (
                          <button
                            type="button"
                            onClick={openAddSlotModal}
                            className="flex items-center space-x-1.5 bg-amber-400 hover:bg-amber-300 text-slate-900 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer self-start sm:self-auto"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Tambah Slot</span>
                          </button>
                        )}
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-[11px] sm:text-xs text-left">
                          <thead>
                            <tr className="bg-slate-900/60 border-b border-slate-800 text-slate-400 font-bold">
                              <th className="p-2 sm:p-3 whitespace-nowrap">Waktu</th>
                              {classColumns.map((c) => (
                                <th key={c} className="p-2 sm:p-3 text-center whitespace-nowrap">{c}</th>
                              ))}
                              {scheduleEditMode && (
                                <th className="p-2 sm:p-3 text-center whitespace-nowrap">Aksi</th>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {activeDay.slots.map((slot, i) => (
                              slot.activity ? (
                                <tr key={i} className="border-t border-slate-800/80 bg-slate-900/30">
                                  <td className="p-2 sm:p-3 text-slate-500 font-mono whitespace-nowrap">{slot.time}</td>
                                  <td colSpan={classColumns.length} className="p-2 sm:p-3 text-amber-300 italic text-center">
                                    {slot.activity}
                                  </td>
                                  {scheduleEditMode && (
                                    <td className="p-2 sm:p-3 text-center whitespace-nowrap">
                                      <div className="flex items-center justify-center gap-2">
                                        <button type="button" onClick={() => openEditSlotModal(i, slot)} className="text-amber-400 hover:underline cursor-pointer">Ubah</button>
                                        <button type="button" onClick={() => setDeleteSlotConfirm({ day: activeDay.day, index: i })} className="text-rose-400 hover:underline cursor-pointer">Hapus</button>
                                      </div>
                                    </td>
                                  )}
                                </tr>
                              ) : (
                                <tr key={i} className="border-t border-slate-800/80 hover:bg-slate-800/30">
                                  <td className="p-2 sm:p-3 text-slate-400 font-mono whitespace-nowrap">{slot.time}</td>
                                  {classColumns.map((c) => {
                                    const name = slot.classes?.[c];
                                    if (scheduleEditMode) {
                                      return (
                                        <td key={c} className="p-2 sm:p-3 text-center text-slate-300 whitespace-nowrap">
                                          {name && name !== '-' ? name : <span className="text-slate-600">-</span>}
                                        </td>
                                      );
                                    }
                                    const code = name ? teacherCodeByName.get(name) : undefined;
                                    if (!code) {
                                      return (
                                        <td key={c} className="p-2 sm:p-3 text-center text-slate-600">-</td>
                                      );
                                    }
                                    const isActive = revealedTeacherCode === code;
                                    return (
                                      <td key={c} className="p-1 sm:p-1.5 text-center">
                                        <button
                                          type="button"
                                          onClick={() => setRevealedTeacherCode(isActive ? null : code)}
                                          className={`w-full min-w-[2rem] px-1.5 py-1 rounded-lg font-mono font-bold transition-colors cursor-pointer ${
                                            isActive
                                              ? 'bg-amber-400 text-slate-950'
                                              : 'bg-slate-900 text-slate-200 hover:bg-slate-800 border border-slate-800'
                                          }`}
                                        >
                                          {code}
                                        </button>
                                      </td>
                                    );
                                  })}
                                  {scheduleEditMode && (
                                    <td className="p-2 sm:p-3 text-center whitespace-nowrap">
                                      <div className="flex items-center justify-center gap-2">
                                        <button type="button" onClick={() => openEditSlotModal(i, slot)} className="text-amber-400 hover:underline cursor-pointer">Ubah</button>
                                        <button type="button" onClick={() => setDeleteSlotConfirm({ day: activeDay.day, index: i })} className="text-rose-400 hover:underline cursor-pointer">Hapus</button>
                                      </div>
                                    </td>
                                  )}
                                </tr>
                              )
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="p-10 text-center text-slate-500 text-xs bg-[#0b1d33] border border-slate-800 rounded-2xl">
                      Jadwal untuk hari ini belum tersedia.
                    </div>
                  )}

                  {/* Modal Tambah/Ubah Slot Jadwal */}
                  <AnimatePresence>
                    {scheduleModalOpen && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
                        <motion.div
                          initial={{ scale: 0.95, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.95, opacity: 0 }}
                          className="bg-[#0b1d33] border border-slate-800 rounded-3xl p-6 sm:p-8 w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl text-left relative"
                        >
                          <button
                            onClick={() => setScheduleModalOpen(false)}
                            className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <X className="w-5 h-5" />
                          </button>
                          <h3 className="text-sm font-extrabold text-white uppercase tracking-wider mb-5">
                            {scheduleModalSlotIndex === null ? 'Tambah' : 'Ubah'} Slot Jadwal — {jadwalDayFilter}
                          </h3>

                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Kode Periode</label>
                                <input
                                  type="text" value={scheduleSlotPeriod} onChange={(e) => setScheduleSlotPeriod(e.target.value)}
                                  placeholder="e.g. 5, dhuha, rest1"
                                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Waktu</label>
                                <input
                                  type="text" value={scheduleSlotTime} onChange={(e) => setScheduleSlotTime(e.target.value)}
                                  placeholder="e.g. 10.45 - 11.20"
                                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Jenis Slot</label>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => setScheduleSlotType('kelas')}
                                  className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer ${scheduleSlotType === 'kelas' ? 'bg-amber-400 text-slate-900' : 'bg-slate-900 text-slate-400 border border-slate-800'}`}
                                >
                                  Jam Pelajaran (per kelas)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setScheduleSlotType('kegiatan')}
                                  className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer ${scheduleSlotType === 'kegiatan' ? 'bg-amber-400 text-slate-900' : 'bg-slate-900 text-slate-400 border border-slate-800'}`}
                                >
                                  Kegiatan Bersama
                                </button>
                              </div>
                            </div>

                            {scheduleSlotType === 'kegiatan' ? (
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Keterangan Kegiatan</label>
                                <input
                                  type="text" value={scheduleSlotActivity} onChange={(e) => setScheduleSlotActivity(e.target.value)}
                                  placeholder="e.g. Sholat Dhuha"
                                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                                />
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Guru per Kelas</label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                  {SCHEDULE_CLASS_COLUMNS.map((c) => (
                                    <div key={c} className="space-y-1">
                                      <label className="text-[10px] text-slate-500">{c}</label>
                                      <select
                                        value={scheduleSlotClasses[c] ?? '-'}
                                        onChange={(e) => setScheduleSlotClasses((prev) => ({ ...prev, [c]: e.target.value }))}
                                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-[11px] text-white focus:outline-none focus:border-amber-400"
                                      >
                                        <option value="-">- (tidak ada)</option>
                                        {SCHEDULE_TEACHER_OPTIONS.map((name) => (
                                          <option key={name} value={name}>{name}</option>
                                        ))}
                                      </select>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="pt-2 flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setScheduleModalOpen(false)}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
                              >
                                Batal
                              </button>
                              <button
                                type="button"
                                onClick={handleSaveSlot}
                                className="bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold px-5 py-2 rounded-xl text-xs cursor-pointer"
                              >
                                Simpan
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      </div>
                    )}
                  </AnimatePresence>

                  {/* Konfirmasi Hapus Slot */}
                  <AnimatePresence>
                    {deleteSlotConfirm && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
                        <motion.div
                          initial={{ scale: 0.95, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.95, opacity: 0 }}
                          className="bg-[#0b1d33] border border-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl text-left"
                        >
                          <h3 className="text-sm font-extrabold text-white mb-2">Hapus slot jadwal ini?</h3>
                          <p className="text-xs text-slate-400 mb-5">Aksi ini tidak bisa dibatalkan.</p>
                          <div className="flex justify-end gap-2">
                            <button onClick={() => setDeleteSlotConfirm(null)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white cursor-pointer">Batal</button>
                            <button onClick={confirmDeleteSlot} className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-4 py-2 rounded-xl text-xs cursor-pointer">Hapus</button>
                          </div>
                        </motion.div>
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })()}

            {/* VIEW TAB: PENGUMUMAN KELAS (halaman publik nama & gender murid per kelas) */}
            {dashboardTab === 'class-roster' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between bg-[#0b1d33] border border-slate-800 p-5 rounded-2xl">
                  <div>
                    <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Pengumuman Kelas</h3>
                    <p className="text-xs text-slate-400">
                      Halaman publik (tanpa login) berisi nama kelas, nama lengkap & jenis kelamin murid. {classRoster.length} dari {CLASS_ROSTER_OPTIONS.length} kelas sudah diisi.
                    </p>
                  </div>
                  {isManagerial && classRoster.length < CLASS_ROSTER_OPTIONS.length && (
                    <button
                      onClick={() => openAddModal('classRoster')}
                      className="flex items-center space-x-1.5 bg-amber-400 hover:bg-amber-300 text-slate-900 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Tambah Kelas</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {CLASS_ROSTER_OPTIONS.map((cls) => {
                    const entry = classRoster.find((c) => c.className === cls);
                    return (
                      <div key={cls} className="bg-[#0b1d33] border border-slate-800 rounded-2xl p-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-lg font-black text-white">{cls}</h4>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">
                            {entry ? `${entry.students.length} murid` : 'Belum diisi'}
                          </span>
                        </div>
                        {isManagerial && (
                          <div className="flex space-x-3 text-[11px] pt-2 border-t border-slate-800">
                            {entry ? (
                              <>
                                <button onClick={() => openEditModal('classRoster', entry)} className="text-amber-400 hover:underline cursor-pointer">Edit</button>
                                <button onClick={() => handleDeleteItem('classRoster', entry.id)} className="text-rose-400 hover:underline cursor-pointer">Hapus</button>
                              </>
                            ) : (
                              <button
                                onClick={() => { setCrClassName(cls); setCrStudentsText(''); setModalType('classRoster'); setModalMode('add'); setEditId(null); setIsModalOpen(true); }}
                                className="text-amber-400 hover:underline cursor-pointer"
                              >
                                Isi Data
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* VIEW TAB: DATA MURID (kelola nama/kelas/NIS + import massal Excel/CSV) */}
            {dashboardTab === 'students' && canViewMurid && (
              <div className="space-y-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#0b1d33] border border-slate-800 p-5 rounded-2xl">
                  <div>
                    <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Data Murid</h3>
                    <p className="text-xs text-slate-400">Total {students.length} murid terdaftar. Barcode absensi otomatis pakai NIS — cetak kartu di menu "Cetak Kartu Barcode".</p>
                  </div>
                  {canManageMurid && (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={downloadStudentTemplate}
                        className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>Unduh Template Excel</span>
                      </button>
                      <label className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer">
                        <FileText className="w-4 h-4" />
                        <span>{studentImportBusy ? 'Mengimpor...' : 'Import dari Excel'}</span>
                        <input
                          type="file"
                          accept=".csv,text/csv"
                          className="hidden"
                          disabled={studentImportBusy}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void handleStudentFileImport(file);
                            e.target.value = '';
                          }}
                        />
                      </label>
                      <button
                        onClick={() => openAddModal('student')}
                        className="flex items-center space-x-1.5 bg-amber-400 hover:bg-amber-300 text-slate-900 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Tambah Murid</span>
                      </button>
                    </div>
                  )}
                </div>

                {canManageMurid && (
                  <p className="text-[11px] text-slate-500 -mt-2">
                    Format template CSV dibuka langsung di Excel — isi barisnya, simpan (tetap format CSV), lalu upload lewat "Import dari Excel". Kolom NIS otomatis jadi barcode absensi murid, tidak perlu diisi terpisah.
                  </p>
                )}

                {canManageMurid && selectedStudentIds.size > 0 && (
                  <div className="flex items-center justify-between bg-rose-950/20 border border-rose-800/50 rounded-2xl px-5 py-3">
                    <span className="text-xs font-bold text-rose-300">{selectedStudentIds.size} murid terpilih</span>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedStudentIds(new Set())}
                        className="text-[11px] text-slate-400 hover:text-white cursor-pointer"
                      >
                        Batalkan Pilihan
                      </button>
                      <button
                        type="button"
                        onClick={() => setBulkDeleteConfirm({ isOpen: true, mode: 'selected' })}
                        className="flex items-center space-x-1.5 bg-rose-600 hover:bg-rose-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus Terpilih ({selectedStudentIds.size})</span>
                      </button>
                    </div>
                  </div>
                )}

                {studentImportErrors.length > 0 && (
                  <div className="bg-rose-950/30 border border-rose-800/60 rounded-2xl p-4 space-y-2">
                    <p className="text-xs font-bold text-rose-300">{studentImportErrors.length} baris dilewati saat import (tidak valid):</p>
                    <ul className="text-[11px] text-rose-300/80 space-y-0.5 max-h-40 overflow-y-auto list-disc list-inside">
                      {studentImportErrors.map((err, i) => <li key={i}>{err}</li>)}
                    </ul>
                    <button
                      type="button"
                      onClick={() => setStudentImportErrors([])}
                      className="text-[10px] text-rose-400 hover:underline cursor-pointer"
                    >
                      Tutup
                    </button>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-grow">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      autoComplete="off"
                      value={studentSearchQuery}
                      onChange={(e) => setStudentSearchQuery(e.target.value)}
                      placeholder="Cari nama / NIS / NISN..."
                      className="w-full bg-[#0b1d33] border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <select
                    value={studentClassFilter}
                    onChange={(e) => { setStudentClassFilter(e.target.value); setSelectedStudentIds(new Set()); }}
                    className="bg-[#0b1d33] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-amber-400"
                  >
                    <option value="all">Semua Kelas</option>
                    {Array.from(new Set(students.map((s) => s.className))).sort().map((cls) => (
                      <option key={cls} value={cls}>{cls}</option>
                    ))}
                  </select>
                  {canManageMurid && studentClassFilter !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setBulkDeleteConfirm({ isOpen: true, mode: 'class' })}
                      className="flex items-center space-x-1.5 bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-800/60 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Kelas Ini</span>
                    </button>
                  )}
                </div>

                <div className="bg-[#0b1d33] border border-slate-800 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-slate-300 text-left">
                      <thead>
                        <tr className="bg-slate-900/60 border-b border-slate-800 text-slate-400 font-bold">
                          {canManageMurid && (
                            <th className="p-4 w-8">
                              <input
                                type="checkbox"
                                className="accent-amber-400 cursor-pointer"
                                checked={filteredStudents.length > 0 && filteredStudents.every((s) => selectedStudentIds.has(s.id))}
                                onChange={(e) => {
                                  setSelectedStudentIds(
                                    e.target.checked ? new Set(filteredStudents.map((s) => s.id)) : new Set()
                                  );
                                }}
                              />
                            </th>
                          )}
                          <th className="p-4">Nama Lengkap</th>
                          <th className="p-4">NIS</th>
                          <th className="p-4">NISN</th>
                          <th className="p-4">Kelas</th>
                          <th className="p-4">JK</th>
                          <th className="p-4">Tahun Ajaran</th>
                          <th className="p-4">Status</th>
                          {canManageMurid && (
                            <th className="p-4 text-right">Aksi</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {filteredStudents.map((s) => (
                          <tr key={s.id} className="hover:bg-slate-900/20">
                            {canManageMurid && (
                              <td className="p-4">
                                <input
                                  type="checkbox"
                                  className="accent-amber-400 cursor-pointer"
                                  checked={selectedStudentIds.has(s.id)}
                                  onChange={() => toggleSelectStudent(s.id)}
                                />
                              </td>
                            )}
                            <td className="p-4 font-bold text-white">{s.name}</td>
                            <td className="p-4 font-mono">{s.nis}</td>
                            <td className="p-4 font-mono text-slate-400">{s.nisn}</td>
                            <td className="p-4">{s.className}</td>
                            <td className="p-4">{s.gender}</td>
                            <td className="p-4">{s.schoolYear}</td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${s.active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-900 text-slate-500'}`}>
                                {s.active ? 'Aktif' : 'Nonaktif'}
                              </span>
                            </td>
                            {canManageMurid && (
                              <td className="p-4 text-right whitespace-nowrap space-x-3">
                                <button onClick={() => openEditModal('student', s)} className="text-amber-400 hover:underline cursor-pointer">Edit</button>
                                <button onClick={() => handleDeleteItem('student', s.id)} className="text-rose-400 hover:underline cursor-pointer">Hapus</button>
                              </td>
                            )}
                          </tr>
                        ))}
                        {filteredStudents.length === 0 && (
                          <tr>
                            <td colSpan={canManageMurid ? 9 : 7} className="p-8 text-center text-slate-500">
                              {students.length === 0
                                ? canManageMurid
                                  ? 'Belum ada data murid. Klik "Tambah Murid" atau import dari Excel untuk mulai.'
                                  : 'Belum ada data murid.'
                                : 'Tidak ada murid yang cocok dengan pencarian/filter ini.'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 5. VIEW TAB: JADWAL SERAGAM */}
            {dashboardTab === 'uniforms' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between bg-[#0b1d33] border border-slate-800 p-5 rounded-2xl">
                  <div>
                    <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Jadwal & Aturan Seragam Siswa</h3>
                    <p className="text-xs text-slate-400">Ketentuan pakaian harian sekolah. Total {uniforms.length} item.</p>
                  </div>
                  {isSuperAdmin && (
                    <button
                      onClick={() => openAddModal('uniform')}
                      className="flex items-center space-x-1.5 bg-amber-400 hover:bg-amber-300 text-slate-900 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Tambah Aturan Seragam</span>
                    </button>
                  )}
                </div>

                {isManagerial ? (
                  <>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                      <GripVertical className="w-3.5 h-3.5" />
                      Tahan ikon di kiri lalu geser naik/turun untuk mengubah urutan tampil di landing page.
                    </p>
                    <Reorder.Group
                      as="div"
                      axis="y"
                      values={uniforms}
                      onReorder={handleUniformsReorder}
                      className="flex flex-col gap-3"
                    >
                      {uniforms.map((un) => (
                        <Reorder.Item
                          key={un.id}
                          value={un}
                          className="relative bg-[#0b1d33] border border-slate-800 rounded-xl overflow-hidden flex items-center gap-4 p-4 cursor-grab active:cursor-grabbing active:z-10 active:shadow-2xl active:shadow-black/50 text-left"
                        >
                          <GripVertical className="w-4 h-4 text-slate-500 shrink-0" />
                          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-slate-900 shrink-0">
                            <img src={un.image} alt={un.name} className="w-full h-full object-cover pointer-events-none" referrerPolicy="no-referrer" />
                          </div>
                          <div className="flex-1 min-w-0 space-y-1">
                            <span className="text-[9px] bg-amber-400 text-slate-950 px-2 py-0.5 rounded font-black uppercase inline-block">
                              {un.days}
                            </span>
                            <h4 className="text-xs font-bold text-white truncate">{un.name}</h4>
                            <p className="text-[11px] text-slate-400 leading-relaxed font-sans line-clamp-2">{un.description}</p>
                          </div>
                          {isSuperAdmin && (
                            <div className="shrink-0 flex items-center gap-3">
                              <button type="button" onClick={() => openEditModal('uniform', un)} className="text-xs text-amber-400 hover:underline">Edit</button>
                              <button type="button" onClick={() => handleDeleteItem('uniform', un.id)} className="text-xs text-rose-400 hover:underline">Hapus</button>
                            </div>
                          )}
                        </Reorder.Item>
                      ))}
                    </Reorder.Group>
                  </>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {uniforms.map((un) => (
                      <div key={un.id} className="bg-[#0b1d33] border border-slate-800 rounded-xl p-5 flex space-x-4 items-start text-left">
                        <div className="w-20 h-20 rounded-lg overflow-hidden bg-slate-900 shrink-0">
                          <img src={un.image} alt={un.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                        <div className="space-y-1.5 flex-grow">
                          <span className="text-[9px] bg-amber-400 text-slate-950 px-2 py-0.5 rounded font-black uppercase">
                            {un.days}
                          </span>
                          <h4 className="text-xs font-bold text-white mt-1">{un.name}</h4>
                          <p className="text-[11px] text-slate-400 leading-relaxed font-sans">{un.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 6. VIEW TAB: TRANSAKSI KAS OSIS (FULL CRUD + FILTER) */}
            {dashboardTab === 'cash' && (
              <div className="space-y-6">
                
                {/* Header widget */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 bg-[#0b1d33] border border-slate-800 p-6 rounded-2xl text-left">
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Kas Masuk</p>
                    <h3 className="text-xl font-black text-emerald-400 font-display">Rp {totalCashIn.toLocaleString()}</h3>
                  </div>
                  <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-slate-800 pt-3 sm:pt-0 sm:pl-6">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Kas Keluar</p>
                    <h3 className="text-xl font-black text-amber-400 font-display">Rp {totalCashOut.toLocaleString()}</h3>
                  </div>
                  <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-slate-800 pt-3 sm:pt-0 sm:pl-6 bg-slate-900/40 p-3 rounded-xl border border-slate-800/60">
                    <p className="text-[10px] text-amber-400 font-extrabold uppercase tracking-widest">Saldo Akhir Kas OSIS</p>
                    <h3 className="text-xl font-black text-white font-display">Rp {currentCashBalance.toLocaleString()}</h3>
                  </div>
                </div>

                {/* Main Action Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-[#0b1d33] border border-slate-800 p-4 rounded-xl">
                  {/* Search filter input */}
                  <div className="relative flex-grow">
                    <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      autoComplete="off"
                      placeholder="Cari transaksi kas..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 w-full"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2 shrink-0">
                    <button
                      onClick={() => handleExportStatement('Kas OSIS')}
                      className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-amber-400" />
                      <span>Ekspor Excel</span>
                    </button>
                    {isManagerial && (
                      <button
                        onClick={() => openAddModal('cash')}
                        className="flex items-center space-x-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Catat Transaksi</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Cash List Table */}
                <div className="bg-[#0b1d33] border border-slate-800 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-slate-300 text-left">
                      <thead>
                        <tr className="bg-slate-900/60 border-b border-slate-800 text-slate-400 font-bold">
                          <th className="p-4">Tanggal</th>
                          <th className="p-4">Tipe</th>
                          <th className="p-4">Kategori</th>
                          <th className="p-4">Deskripsi</th>
                          <th className="p-4">Petugas</th>
                          <th className="p-4 text-right">Jumlah</th>
                          {isManagerial && <th className="p-4 text-right">Aksi</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {filteredCash.map((t) => (
                          <tr key={t.id} className="hover:bg-slate-900/20">
                            <td className="p-4">{t.date}</td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                t.type === 'Masuk' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-400/10 text-amber-400'
                              }`}>
                                {t.type}
                              </span>
                            </td>
                            <td className="p-4">{t.category}</td>
                            <td className="p-4 truncate max-w-[180px]">{t.description}</td>
                            <td className="p-4 text-slate-400">{t.author}</td>
                            <td className={`p-4 text-right font-bold text-white`}>
                              {t.type === 'Masuk' ? '+' : '-'} Rp {t.amount.toLocaleString()}
                            </td>
                            {isManagerial && (
                              <td className="p-4 text-right space-x-2 shrink-0">
                                <button onClick={() => openEditModal('cash', t)} className="text-amber-400 hover:underline">Edit</button>
                                <button onClick={() => handleDeleteItem('cash', t.id)} className="text-rose-400 hover:underline">Hapus</button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            {/* 7. VIEW TAB: KAS DENDA SISWA */}
            {dashboardTab === 'fines' && (
              <div className="space-y-6">
                
                {/* Header widgets */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-[#0b1d33] border border-slate-800 p-6 rounded-2xl text-left">
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Kas Denda Lunas (Terkumpul)</p>
                    <h3 className="text-xl font-black text-emerald-400 font-display">Rp {totalFinesCollected.toLocaleString()}</h3>
                  </div>
                  <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-slate-800 pt-3 sm:pt-0 sm:pl-6">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Kas Denda Belum Lunas (Tunggakan)</p>
                    <h3 className="text-xl font-black text-rose-400 font-display">Rp {totalFinesUnpaid.toLocaleString()}</h3>
                  </div>
                </div>

                {/* Action Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-[#0b1d33] border border-slate-800 p-4 rounded-xl">
                  {/* Search input */}
                  <div className="relative flex-grow">
                    <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      autoComplete="off"
                      placeholder="Cari pelanggar atau denda..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 w-full"
                    />
                  </div>

                  <div className="flex space-x-2 shrink-0">
                    <button
                      onClick={() => handleExportStatement('Denda Pelanggaran')}
                      className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-amber-400" />
                      <span>Ekspor Excel</span>
                    </button>
                    {isManagerial && (
                      <button
                        onClick={() => openAddModal('fine')}
                        className="flex items-center space-x-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Catat Denda Pelanggaran</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Fines Table */}
                <div className="bg-[#0b1d33] border border-slate-800 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-slate-300 text-left">
                      <thead>
                        <tr className="bg-slate-900/60 border-b border-slate-800 text-slate-400 font-bold">
                          <th className="p-4">Tanggal</th>
                          <th className="p-4">Nama Pelanggar</th>
                          <th className="p-4">Jenis Pelanggaran</th>
                          <th className="p-4">Deskripsi</th>
                          <th className="p-4 text-center">Status Bayar</th>
                          <th className="p-4 text-right">Jumlah Denda</th>
                          {isManagerial && <th className="p-4 text-right">Aksi</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {filteredFines.map((f) => {
                          const isPaid = f.status === 'Lunas';
                          return (
                            <tr key={f.id} className="hover:bg-slate-900/20">
                              <td className="p-4">{f.date}</td>
                              <td className="p-4 font-bold text-white">{f.violator}</td>
                              <td className="p-4">{f.category}</td>
                              <td className="p-4 text-slate-400 truncate max-w-[150px]">{f.description}</td>
                              <td className="p-4 text-center">
                                <button
                                  onClick={() => isManagerial && handleToggleFinePaid(f)}
                                  disabled={!isManagerial}
                                  className={`px-3 py-1 rounded-full text-[9px] font-black uppercase transition-colors ${
                                    isPaid 
                                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' 
                                      : 'bg-rose-500/15 text-rose-400 border border-rose-500/25 hover:bg-rose-500/25'
                                  } ${isManagerial ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                                  title={isManagerial ? "Klik untuk merubah status bayar" : ""}
                                >
                                  {isPaid ? 'Lunas' : 'Belum Lunas'}
                                </button>
                              </td>
                              <td className="p-4 text-right font-bold text-white">Rp {f.amount.toLocaleString()}</td>
                              {isManagerial && (
                                <td className="p-4 text-right space-x-2 shrink-0">
                                  <button onClick={() => openEditModal('fine', f)} className="text-amber-400 hover:underline">Edit</button>
                                  <button onClick={() => handleDeleteItem('fine', f.id)} className="text-rose-400 hover:underline">Hapus</button>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            {/* 8. VIEW TAB: LOG AKTIVITAS (Super/Managerial only) */}
            {dashboardTab === 'logs' && isManagerial && (
              <div className="space-y-6">
                <div className="flex items-center justify-between bg-[#0b1d33] border border-slate-800 p-5 rounded-2xl">
                  <div>
                    <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Log Audit Aktivitas Sistem ERP</h3>
                    <p className="text-xs text-slate-400">Arsip pencatatan mutasi data, login, dan aksi operator ERP.</p>
                  </div>
                  <button
                    onClick={() => handleExportStatement('Log Aktivitas')}
                    className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-amber-400" />
                    <span>Unduh Log (Excel)</span>
                  </button>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    autoComplete="off"
                    value={logSearchQuery}
                    onChange={(e) => setLogSearchQuery(e.target.value)}
                    placeholder="Cari pengguna / peran / aksi / keterangan..."
                    className="w-full bg-[#0b1d33] border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="bg-[#0b1d33] border border-slate-800 rounded-2xl overflow-hidden text-left">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-slate-300">
                      <thead>
                        <tr className="bg-slate-900/60 border-b border-slate-800 text-slate-400 font-bold">
                          <th className="p-4">Stempel Waktu</th>
                          <th className="p-4">Pengguna</th>
                          <th className="p-4">Peran Hak Akses</th>
                          <th className="p-4">Aksi</th>
                          <th className="p-4">Keterangan Rinci</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80 font-mono text-[11px]">
                        {filteredLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-900/30">
                            <td className="p-4 text-slate-500 whitespace-nowrap">{log.timestamp}</td>
                            <td className="p-4 font-bold text-white">{log.user}</td>
                            <td className="p-4">
                              <span className="text-[10px] text-amber-400">{log.role}</span>
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                log.action === 'Login' ? 'bg-emerald-500/10 text-emerald-400' :
                                log.action === 'Tambah' ? 'bg-blue-500/10 text-blue-400' :
                                log.action === 'Hapus' ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-800 text-slate-300'
                              }`}>
                                {log.action}
                              </span>
                            </td>
                            <td className="p-4 text-slate-300 font-sans">{log.details}</td>
                          </tr>
                        ))}
                        {logs.length > 0 && filteredLogs.length === 0 && (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-slate-500 font-sans">
                              Tidak ada log yang cocok dengan pencarian.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 9. VIEW TAB: DAFTAR PENGGUNA (Super Admin only) */}
            {dashboardTab === 'users' && isSuperAdmin && (
              <div className="space-y-6">
                <div className="flex items-center justify-between bg-[#0b1d33] border border-slate-800 p-5 rounded-2xl gap-4">
                  <div>
                    <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Akun Pengguna ERP OSIS</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Daftar personil pengurus & admin dengan akses ke sistem ERP.
                      {profiles.length === 0 && (
                        <>
                          {' '}Belum ada akun — klik "Tambah Akun" untuk membuat yang pertama.
                        </>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => openAddModal('user')}
                    className="flex items-center space-x-1.5 bg-amber-400 hover:bg-amber-300 text-slate-900 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Akun</span>
                  </button>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    autoComplete="off"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="Cari nama / email / peran..."
                    className="w-full bg-[#0b1d33] border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="bg-[#0b1d33] border border-slate-800 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-slate-300 text-left">
                      <thead>
                        <tr className="bg-slate-900/60 border-b border-slate-800 text-slate-400 font-bold">
                          <th className="p-4">Nama Lengkap</th>
                          <th className="p-4">ID Pengguna (Email Login)</th>
                          <th className="p-4">Hak Akses Peran</th>
                          <th className="p-4">Status</th>
                          <th className="p-4">Ganti Sandi Pertama</th>
                          <th className="p-4 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {filteredProfiles.map((u) => (
                          <tr key={u.id} className="hover:bg-slate-900/20">
                            <td className="p-4 font-bold text-white">{u.name}</td>
                            <td className="p-4 font-mono">{u.email}</td>
                            <td className="p-4">
                              <span className="text-amber-400 font-bold">{u.role}</span>
                            </td>
                            <td className="p-4">
                              <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded text-[10px] font-bold">
                                {u.status}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${u.mustChangePassword ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-900 text-slate-500'}`}>
                                {u.mustChangePassword ? 'YA (Wajib)' : 'TIDAK'}
                              </span>
                            </td>
                            <td className="p-4 text-right whitespace-nowrap space-x-3">
                              <button onClick={() => openEditModal('user', u)} className="text-amber-400 hover:underline cursor-pointer">Edit</button>
                              <button
                                onClick={() => { setResetPwdTarget(u); setResetPwdValue(''); }}
                                className="text-blue-400 hover:underline cursor-pointer"
                              >
                                Reset Sandi
                              </button>
                            </td>
                          </tr>
                        ))}
                        {profiles.length === 0 && (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-slate-500">
                              Belum ada akun. Klik "Tambah Akun" untuk membuat yang pertama.
                            </td>
                          </tr>
                        )}
                        {profiles.length > 0 && filteredProfiles.length === 0 && (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-slate-500">
                              Tidak ada akun yang cocok dengan pencarian.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 10. VIEW TAB: PENGATURAN PORTAL (Super Admin only) */}
            {dashboardTab === 'settings' && isSuperAdmin && (
              <div className="bg-[#0b1d33] border border-slate-800 rounded-2xl p-6 sm:p-8">
                <div className="border-b border-slate-800 pb-4 mb-6">
                  <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Konfigurasi & Informasi Portal Sekolah</h3>
                  <p className="text-xs text-slate-400">Ubah detail alamat sekolah, kontak fungsionaris, maps, dan kontrol status PPDB gelombang reguler.</p>
                </div>

                <form onSubmit={handleSaveSettings} className="space-y-6 text-left">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* School name */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Nama Instansi Sekolah</label>
                      <input
                        type="text"
                        required
                        value={setSchoolName}
                        onChange={(e) => setSetSchoolName(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 font-bold"
                      />
                    </div>

                    {/* Slogan */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Slogan Utama Resmi</label>
                      <input
                        type="text"
                        required
                        value={setSlogan}
                        onChange={(e) => setSetSlogan(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 font-bold"
                      />
                    </div>

                    {/* Address */}
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Alamat Lengkap Sekolah</label>
                      <input
                        type="text"
                        required
                        value={setAddress}
                        onChange={(e) => setSetAddress(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 font-medium"
                      />
                    </div>

                    {/* Website Resmi */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Website Resmi Tamhar</label>
                      <input
                        type="text"
                        required
                        value={setWebsite}
                        onChange={(e) => setSetWebsite(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                      />
                    </div>

                    {/* Phone */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Nomor Telepon Kantor</label>
                      <input
                        type="text"
                        required
                        value={setPhone}
                        onChange={(e) => setSetPhone(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 font-medium"
                      />
                    </div>

                    {/* Whatsapp */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">WhatsApp Hotline PPDB</label>
                      <input
                        type="text"
                        required
                        value={setWhatsapp}
                        onChange={(e) => setSetWhatsapp(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 font-medium"
                      />
                    </div>

                    {/* Instagram */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Instagram (link atau @handle)</label>
                      <input
                        type="text"
                        value={setInstagram}
                        onChange={(e) => setSetInstagram(e.target.value)}
                        placeholder="e.g. https://www.instagram.com/smp_tamanharapan1/"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                      />
                    </div>

                    {/* PPDB Status Toggle */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Status PPDB Online</label>
                      <select
                        value={setPpdbStatus}
                        onChange={(e) => setSetPpdbStatus(e.target.value as 'Buka' | 'Tutup')}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-amber-400 font-bold"
                      >
                        <option value="Buka">BUKA (Penerimaan Aktif)</option>
                        <option value="Tutup">TUTUP (Registrasi Istirahat)</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800 flex justify-end">
                    <button
                      type="submit"
                      className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-xs cursor-pointer transition-colors"
                    >
                      Simpan Konfigurasi Portal
                    </button>
                  </div>
                </form>

                <div className="border-t border-slate-800 my-8" />

                <div className="border-b border-slate-800 pb-4 mb-6">
                  <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center space-x-2">
                    <Key className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Ubah Kata Sandi Akun Super Admin</span>
                  </h3>
                  <p className="text-xs text-slate-400">Amankan portal ERP Anda dengan merubah kata sandi secara berkala.</p>
                </div>

                <form onSubmit={handleSaveSuperAdminPassword} className="space-y-6 text-left">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Old Password */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Kata Sandi Lama</label>
                      <input
                        type="password"
                        required
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    {/* New Password */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Kata Sandi Baru</label>
                      <input
                        type="password"
                        required
                        value={newAdminPassword}
                        onChange={(e) => setNewAdminPassword(e.target.value)}
                        placeholder="Min. 8 karakter, ada huruf besar & angka"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    {/* Confirm New Password */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Konfirmasi Kata Sandi Baru</label>
                      <input
                        type="password"
                        required
                        value={confirmAdminPassword}
                        onChange={(e) => setConfirmAdminPassword(e.target.value)}
                        placeholder="Ulangi kata sandi baru"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800 flex justify-end">
                    <button
                      type="submit"
                      className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-xs cursor-pointer transition-colors"
                    >
                      Perbarui Kata Sandi Super Admin
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Kontrol Informasi Portal Orang Tua — checklist tampil/sembunyi
                per bagian, tersimpan di settings.parentPortalVisibility.
                Langsung tersimpan begitu dicentang/hilangkan (tidak perlu
                tombol Simpan terpisah) — untuk jaga-jaga kalau sewaktu-waktu
                ada informasi yang perlu buru-buru disembunyikan dari orang
                tua tanpa perlu ubah kode. */}
            {dashboardTab === 'settings' && isSuperAdmin && (
              <div className="bg-[#0b1d33] border border-slate-800 rounded-2xl p-6 sm:p-8 mt-6">
                <div className="border-b border-slate-800 pb-4 mb-6">
                  <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Kontrol Informasi Portal Orang Tua</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Pilih bagian yang boleh tampil di Portal Orang Tua. Langsung aktif begitu dicentang/hilangkan — untuk jaga-jaga kalau sewaktu-waktu ada informasi yang perlu disembunyikan.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(
                    [
                      { key: 'waliKelas', label: 'Kartu Wali Kelas' },
                      { key: 'attendanceRecap', label: 'Rekap Kehadiran Murid' },
                      { key: 'calendar', label: 'Kalender Kehadiran' },
                      { key: 'schedule', label: 'Jadwal Mata Pelajaran' },
                      { key: 'teacherAttendance', label: 'Status Kehadiran Guru (di Jadwal)' },
                      { key: 'uniforms', label: 'Informasi Seragam' },
                    ] as { key: keyof NonNullable<SystemSettings['parentPortalVisibility']>; label: string }[]
                  ).map(({ key, label }) => {
                    const checked = settings.parentPortalVisibility?.[key] ?? true;
                    return (
                      <label
                        key={key}
                        className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-slate-300 cursor-pointer hover:border-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const nextChecked = e.target.checked;
                            setSettings((prev) => ({
                              ...prev,
                              parentPortalVisibility: {
                                waliKelas: prev.parentPortalVisibility?.waliKelas ?? true,
                                attendanceRecap: prev.parentPortalVisibility?.attendanceRecap ?? true,
                                calendar: prev.parentPortalVisibility?.calendar ?? true,
                                schedule: prev.parentPortalVisibility?.schedule ?? true,
                                teacherAttendance: prev.parentPortalVisibility?.teacherAttendance ?? true,
                                uniforms: prev.parentPortalVisibility?.uniforms ?? true,
                                [key]: nextChecked,
                              },
                            }));
                          }}
                          className="w-4 h-4 rounded accent-amber-400 cursor-pointer"
                        />
                        {label}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Backup & Ekspor Seluruh Data — manual, sekali klik oleh Super Admin.
                Sengaja TIDAK otomatis/terjadwal: data murid & guru ada di dalamnya,
                jadi harus selalu ada manusia yang sadar & memilih kapan data ini
                keluar dari sistem, ke mana pun tujuannya (Drive, laptop, dst). */}
            {dashboardTab === 'settings' && isSuperAdmin && (
              <div className="bg-[#0b1d33] border border-slate-800 rounded-2xl p-6 sm:p-8 mt-6">
                <div className="border-b border-slate-800 pb-4 mb-6">
                  <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Backup & Ekspor Seluruh Data</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Unduh satu file JSON berisi seluruh data portal (murid, guru, absensi, artikel, kas, dst) sebagai cadangan. Simpan sendiri ke Drive/laptop kapan pun kamu mau — proses ini manual, tidak berjalan otomatis.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const backup = {
                      exportedAt: new Date().toISOString(),
                      articles,
                      gallery,
                      teachers,
                      uniforms,
                      cashTransactions,
                      fineTransactions,
                      notifications,
                      logs,
                      settings,
                      attendance,
                      students,
                      studentAttendance,
                      visitsByDay,
                      classRoster,
                      teachingSchedule,
                      teacherAttendanceLog,
                    };
                    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `Backup_Portal_SMPTAMHAR_${todayDateKey()}.json`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);

                    setSettings((prev) => ({ ...prev, lastBackupExportedAt: new Date().toISOString() }));
                    addActivityLog(currentUser.name, currentUser.role, 'Export', 'Mengunduh backup seluruh data portal (JSON)');
                    triggerDashAlert('success', 'Backup seluruh data berhasil diunduh!');
                  }}
                  className="flex items-center space-x-1.5 bg-amber-400 hover:bg-amber-300 text-slate-900 px-5 py-2.5 rounded-xl text-xs font-bold cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh Backup Semua Data (JSON)</span>
                </button>
              </div>
            )}

            {dashboardTab === 'settings' && isSuperAdmin && (
              <div className="bg-[#0b1d33] border border-slate-800 rounded-2xl p-6 sm:p-8 mt-6">
                <div className="border-b border-slate-800 pb-4 mb-6 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-400" />
                  <div>
                    <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">PIN Keamanan Eksekusi</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Kode 4-6 digit terpisah dari password, wajib dimasukkan sebelum aksi hapus massal data murid (banyak murid sekaligus / 1 kelas penuh). Lapisan tambahan — bukan pengganti password. Hanya Super Admin yang bisa mengatur/mengganti.
                    </p>
                    {execPinIsSet !== null && (
                      <p className={`text-[10px] font-black uppercase tracking-wide mt-2 ${execPinIsSet ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {execPinIsSet ? 'Status: PIN sudah aktif' : 'Status: PIN belum diatur — aksi hapus massal masih terbuka tanpa PIN'}
                      </p>
                    )}
                  </div>
                </div>
                <form onSubmit={handleSetExecutionPin} className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">{execPinIsSet ? 'PIN Baru' : 'Atur PIN'}</label>
                    <input
                      type="password" inputMode="numeric" maxLength={6} value={execPinNew}
                      onChange={(e) => setExecPinNew(e.target.value.replace(/\D/g, ''))}
                      placeholder="4-6 digit angka"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Konfirmasi PIN</label>
                    <input
                      type="password" inputMode="numeric" maxLength={6} value={execPinConfirm}
                      onChange={(e) => setExecPinConfirm(e.target.value.replace(/\D/g, ''))}
                      placeholder="Ulangi PIN"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={execPinSubmitting}
                    className="sm:col-span-2 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-900 px-5 py-2.5 rounded-xl text-xs font-bold cursor-pointer w-fit"
                  >
                    {execPinSubmitting ? 'Menyimpan...' : execPinIsSet ? 'Ganti PIN' : 'Simpan PIN'}
                  </button>
                </form>
              </div>
            )}

            {/* SCANNER — satu-satunya titik akses kiosk scan (guru & murid
                sekaligus) + cetak kartu QR, supaya tidak berulang/tersebar
                di tab "Absensi Guru Piket" dan "Absensi Murid (Scan)". */}
            {dashboardTab === 'scanner' && canAccessMurid && (
              <div className="bg-[#0b1d33] border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
                <div>
                  <div className="flex items-center space-x-2.5 text-amber-400 mb-2">
                    <ScanLine className="w-5 h-5" />
                    <span className="text-xs font-bold uppercase tracking-widest bg-amber-400/10 px-2.5 py-1 rounded-full">Satu Titik Akses</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Scanner Absensi Guru & Murid</h2>
                  <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                    Satu kiosk untuk scan kartu QR guru maupun murid — kode discan otomatis dikenali miliknya siapa, tidak perlu buka layar terpisah. Cetak kartu QR guru/murid juga dari sini.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <a
                    href={`${window.location.origin}${window.location.pathname}#absen-scan`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-amber-400 text-slate-950 font-bold text-sm hover:bg-amber-300 transition-colors"
                  >
                    <ScanLine className="w-4 h-4" />
                    Buka Kiosk Scan (Guru & Murid)
                    <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                  </a>
                  <a
                    href={`${window.location.origin}${window.location.pathname}#kartu-barcode-murid`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold text-sm hover:bg-slate-800 transition-colors"
                  >
                    <Printer className="w-4 h-4" />
                    Cetak Kartu QR Murid
                    <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                  </a>
                  <a
                    href={`${window.location.origin}${window.location.pathname}#kartu-barcode-guru`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold text-sm hover:bg-slate-800 transition-colors"
                  >
                    <Printer className="w-4 h-4" />
                    Cetak Kartu QR Guru
                    <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                  </a>
                </div>

                <p className="text-xs text-slate-500">
                  Pasang tablet/PC di pintu gerbang dengan scanner USB atau kamera HP — buka link kiosk di atas. Hasil scan langsung masuk ke "Absensi Guru Piket" dan "Absensi Murid (Scan)".
                </p>
              </div>
            )}

            {/* Absensi Murid — scanner USB + input manual */}
            {dashboardTab === 'murid-attendance' && canAccessMurid && (
              <StudentMuridAttendancePanel
                students={students}
                records={studentAttendance}
                onRecordsChange={setStudentAttendance}
                currentUser={currentUser}
                portalReady={portalReady}
                supabaseOn={supabaseOn}
              />
            )}

            {/* VIEW TAB: REKAP ABSENSI MURID (total per bulan, bisa rentang bulan, ekspor CSV per bulan) */}
            {dashboardTab === 'rekap-absensi-murid' && canAccessMurid && (
              <div className="space-y-6">
                <div className="bg-[#0b1d33] border border-slate-800 p-5 sm:p-6 rounded-2xl">
                  <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Rekap Absensi Murid</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Total kehadiran murid dihitung per bulan. Pilih satu bulan (isi Dari & Sampai sama), atau rentang beberapa bulan sekaligus.
                  </p>
                </div>

                <div className="bg-[#0b1d33] border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-end gap-4">
                  <div className="flex flex-col sm:flex-row gap-4 flex-1">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase block">Dari Bulan</label>
                      <input
                        type="month"
                        value={rekapMuridFromMonth}
                        onChange={(e) => setRekapMuridFromMonth(e.target.value)}
                        className="w-full sm:w-auto bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase block">Sampai Bulan</label>
                      <input
                        type="month"
                        value={rekapMuridToMonth}
                        onChange={(e) => setRekapMuridToMonth(e.target.value)}
                        className="w-full sm:w-auto bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase block">Kelas</label>
                      <select
                        value={rekapMuridClassFilter}
                        onChange={(e) => setRekapMuridClassFilter(e.target.value)}
                        className="w-full sm:w-auto bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-amber-400"
                      >
                        <option value="all">Semua Kelas</option>
                        {rekapMuridClassOptions.map((cls) => (
                          <option key={cls} value={cls}>{cls}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportRekapMurid}
                    className="flex items-center justify-center space-x-1.5 bg-amber-400 hover:bg-amber-300 text-slate-900 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    <span>Ekspor CSV</span>
                  </button>
                </div>

                {rekapMuridMonthKeys.length === 0 ? (
                  <div className="p-10 text-center text-slate-500 text-xs bg-[#0b1d33] border border-slate-800 rounded-2xl">
                    Rentang bulan tidak valid — pastikan "Dari Bulan" tidak melewati "Sampai Bulan".
                  </div>
                ) : (
                  rekapMuridMonthKeys.map((monthKey) => {
                    const rows = buildRekapMuridRowsForMonth(monthKey);
                    return (
                      <div key={monthKey} className="bg-[#0b1d33] border border-slate-800 rounded-2xl overflow-hidden">
                        <div className="p-4 border-b border-slate-800">
                          <h4 className="text-sm font-black text-amber-400 uppercase tracking-wide">{formatMonthLabel(monthKey)}</h4>
                          <p className="text-[10px] text-slate-500 mt-0.5">{rows.length} murid</p>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs text-left">
                            <thead>
                              <tr className="bg-slate-900/60 border-b border-slate-800 text-slate-400 font-bold">
                                <th className="p-3 whitespace-nowrap">Nama Murid</th>
                                <th className="p-3 whitespace-nowrap">Kelas</th>
                                <th className="p-3 text-center whitespace-nowrap">Hadir</th>
                                <th className="p-3 text-center whitespace-nowrap">Izin</th>
                                <th className="p-3 text-center whitespace-nowrap">Sakit</th>
                                <th className="p-3 text-center whitespace-nowrap">Alpa</th>
                                <th className="p-3 text-center whitespace-nowrap">Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                              {rows.map((r) => (
                                <tr key={r.id} className="hover:bg-slate-900/30">
                                  <td className="p-3 font-semibold text-white whitespace-nowrap">{r.name}</td>
                                  <td className="p-3 text-slate-300 whitespace-nowrap">{r.className}</td>
                                  <td className="p-3 text-center text-emerald-400 font-bold">{r.Hadir}</td>
                                  <td className="p-3 text-center text-amber-300 font-bold">{r.Izin}</td>
                                  <td className="p-3 text-center text-blue-300 font-bold">{r.Sakit}</td>
                                  <td className="p-3 text-center text-rose-400 font-bold">{r.Alpa}</td>
                                  <td className="p-3 text-center text-white font-black">{r.total}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {rows.length === 0 && (
                          <div className="p-8 text-center text-slate-500 text-xs">
                            Tidak ada murid untuk ditampilkan pada bulan ini.
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Rekap Kunjungan — hitungan real per hari (dari increment_daily_visit) */}
            {dashboardTab === 'kunjungan' && (isSuperAdmin || currentUser.role === 'Managerial Sekolah' || isGuruPiket || isGuru) && (
              <div className="space-y-6">
                <div className="bg-[#0b1d33] border border-slate-800 p-5 rounded-2xl flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Rekap Kunjungan Landing Page</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Jumlah orang yang membuka halaman utama portal, dihitung per tanggal. Online Saat Ini: <span className="text-emerald-400 font-bold">{onlineNow} orang</span> (real-time).
                    </p>
                  </div>
                </div>

                <div className="bg-[#0b1d33] border border-slate-800 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-slate-300 text-left">
                      <thead>
                        <tr className="bg-slate-900/60 border-b border-slate-800 text-slate-400 font-bold">
                          <th className="p-4">Tanggal</th>
                          <th className="p-4 text-right">Jumlah Kunjungan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {Object.entries(visitsByDay)
                          .sort(([a], [b]) => b.localeCompare(a))
                          .map(([day, count]) => (
                            <tr key={day} className={`hover:bg-slate-900/20 ${day === todayVisitKey ? 'bg-amber-400/5' : ''}`}>
                              <td className="p-4 font-bold text-white">
                                {day}
                                {day === todayVisitKey && (
                                  <span className="ml-2 text-[9px] font-black text-amber-400 uppercase">Hari Ini</span>
                                )}
                              </td>
                              <td className="p-4 text-right font-mono">{count.toLocaleString()}</td>
                            </tr>
                          ))}
                        {Object.keys(visitsByDay).length === 0 && (
                          <tr>
                            <td colSpan={2} className="p-8 text-center text-slate-500">
                              Belum ada data kunjungan.
                            </td>
                          </tr>
                        )}
                      </tbody>
                      {Object.keys(visitsByDay).length > 0 && (
                        <tfoot>
                          <tr className="border-t border-slate-800 bg-slate-900/40">
                            <td className="p-4 font-bold text-white">Total Semua Hari</td>
                            <td className="p-4 text-right font-mono font-bold text-amber-400">
                              {Object.values(visitsByDay).reduce((sum, n) => sum + n, 0).toLocaleString()}
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 11. VIEW TAB: ABSENSI GURU PIKET (Senin - Jumat) */}
            {dashboardTab === 'piket' && canAccessAttendance && (isSuperAdmin || currentUser.role === 'Managerial Sekolah' || isGuruPiket || isGuru) && (
              <div className="space-y-6">
                
                {/* Header card */}
                <div className="bg-[#0b1d33] border border-slate-800 rounded-2xl p-6 sm:p-8 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                    <CheckCircle2 className="w-40 h-40 text-amber-400" />
                  </div>
                  <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                      <div className="flex items-center space-x-2.5 text-amber-400 mb-2">
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="text-xs font-bold uppercase tracking-widest bg-amber-400/10 px-2.5 py-1 rounded-full">Modul Guru Piket</span>
                      </div>
                      <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Pencatatan Absensi Dewan Guru</h2>
                      <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                        Kelola absensi harian bapak & ibu guru SMP Taman Harapan Bekasi untuk periode Senin s.d. Jumat secara digital, real-time, dan terintegrasi.
                      </p>
                    </div>

                    {/* Hari, Tanggal, Waktu Sekarang — update tiap detik */}
                    <div className="flex items-center gap-3 bg-slate-900/80 border border-slate-800 rounded-2xl px-5 py-3 shrink-0 self-start lg:self-auto">
                      <Clock className="w-5 h-5 text-amber-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-bold text-white leading-tight break-words">{pikietClockDateLabel}</p>
                        <p className="text-lg sm:text-xl font-black text-amber-400 font-mono tracking-wider leading-tight">{pikietClockTimeLabel}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pemilih tanggal & Aksi */}
                <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between bg-[#0b1d33] border border-slate-800 p-4 rounded-2xl">
                  {/* Date picker */}
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      type="date"
                      value={pikietSelectedDate}
                      max={todayDateKey()}
                      onChange={(e) => setPikietSelectedDate(e.target.value || todayDateKey())}
                      className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-bold"
                    />
                    {!pikietIsToday && (
                      <button
                        type="button"
                        onClick={() => setPikietSelectedDate(todayDateKey())}
                        className="text-xs font-bold text-amber-400 hover:underline cursor-pointer"
                      >
                        ← Kembali ke Hari Ini
                      </button>
                    )}
                    <span className="text-xs text-slate-500">
                      {isSchoolDay
                        ? <>Hari <span className="text-slate-300 font-semibold">{attendanceDayFilter}</span></>
                        : <span className="text-rose-400 font-semibold">{attendanceDayFilter} — tidak ada KBM</span>}
                    </span>
                  </div>

                  {/* Quick actions — cetak kartu & buka kiosk scan sudah
                      dipindah ke menu "SCANNER" (satu titik akses gabungan
                      guru+murid), jadi tidak diulang di sini lagi. */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => {
                        // Mark all as present for selected date (hanya guru yang terjadwal mengajar hari ini)
                        teachersForAttendanceDay.forEach(t => setTeacherStatusOnSelectedDate(t, 'Hadir'));
                        addActivityLog(currentUser.name, currentUser.role, 'Edit', `Menandai semua guru HADIR pada tanggal ${pikietSelectedDate}`);
                        triggerDashAlert('success', `Semua guru berhasil ditandai HADIR untuk tanggal ${pikietSelectedDate}.`);
                      }}
                      disabled={!isSchoolDay}
                      className="px-3 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-bold text-slate-300 transition-colors flex items-center space-x-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <span>Set Semua Hadir</span>
                    </button>
                    <button
                      onClick={async () => {
                        // Clear attendance for selected date (hanya guru yang terjadwal mengajar hari ini)
                        if (portalReady && supabaseOn) {
                          await deleteTeacherAttendanceForDate(pikietSelectedDate);
                        }
                        setTeacherAttendanceLog((prev) => prev.filter((r) => r.date !== pikietSelectedDate));
                        addActivityLog(currentUser.name, currentUser.role, 'Edit', `Mengosongkan absensi tanggal ${pikietSelectedDate}`);
                        triggerDashAlert('success', `Data absensi tanggal ${pikietSelectedDate} berhasil dikosongkan.`);
                      }}
                      className="px-3 py-2 bg-slate-900 border border-slate-800 hover:border-rose-900 hover:bg-rose-950/20 rounded-xl text-xs font-bold text-rose-400 transition-colors flex items-center space-x-1.5 cursor-pointer"
                    >
                      <span>Kosongkan Hari Ini</span>
                    </button>
                    <button
                      onClick={() => {
                        const rows = teachersForAttendanceDay.map(t => {
                          const status = teacherStatusOnSelectedDate(t.id) || 'Belum Absen';
                          return `${t.name},${t.subject},${status}`;
                        }).join('\n');
                        const blob = new Blob([`Nama Guru,Mata Pelajaran,Status Absen (${pikietSelectedDate})\n${rows}`], { type: 'text/csv' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `Absensi_Guru_${pikietSelectedDate}_SMP_Tamhar.csv`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);

                        addActivityLog(currentUser.name, currentUser.role, 'Export', `Mengekspor berkas absensi tanggal ${pikietSelectedDate}`);
                        triggerDashAlert('success', `Laporan Absensi Guru tanggal ${pikietSelectedDate} berhasil diproduksi! 📥`);
                      }}
                      className="px-3 py-2 bg-amber-400 hover:bg-amber-300 rounded-xl text-xs font-bold text-slate-950 transition-colors flex items-center space-x-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Ekspor Absen</span>
                    </button>
                  </div>
                </div>

                {/* Daily stats summary banner */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {/* Hadir count */}
                  <div className="bg-[#0b1d33] border border-slate-800 p-4 rounded-xl text-left">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-sans">Total Hadir</span>
                    <p className="text-xl font-black text-emerald-400 mt-1">
                      {teachersForAttendanceDay.filter(t => teacherStatusOnSelectedDate(t.id) === 'Hadir').length} Guru
                    </p>
                  </div>
                  {/* Izin count */}
                  <div className="bg-[#0b1d33] border border-slate-800 p-4 rounded-xl text-left">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-sans">Total Izin</span>
                    <p className="text-xl font-black text-amber-400 mt-1">
                      {teachersForAttendanceDay.filter(t => teacherStatusOnSelectedDate(t.id) === 'Izin').length} Guru
                    </p>
                  </div>
                  {/* Sakit count */}
                  <div className="bg-[#0b1d33] border border-slate-800 p-4 rounded-xl text-left">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-sans">Total Sakit</span>
                    <p className="text-xl font-black text-blue-400 mt-1">
                      {teachersForAttendanceDay.filter(t => teacherStatusOnSelectedDate(t.id) === 'Sakit').length} Guru
                    </p>
                  </div>
                  {/* Alpa count */}
                  <div className="bg-[#0b1d33] border border-slate-800 p-4 rounded-xl text-left">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-sans">Total Alpa</span>
                    <p className="text-xl font-black text-rose-400 mt-1">
                      {teachersForAttendanceDay.filter(t => teacherStatusOnSelectedDate(t.id) === 'Alpa').length} Guru
                    </p>
                  </div>
                </div>

                {/* Teachers attendance roster list */}
                <div className="bg-[#0b1d33] border border-slate-800 rounded-2xl overflow-hidden">
                  <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="text-left">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">Daftar Guru</h3>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Tandai kehadiran bapak/ibu guru untuk tanggal {pikietSelectedDate} dengan cepat — hanya menampilkan {teachersForAttendanceDay.length} guru yang terjadwal mengajar hari {attendanceDayFilter} (sinkron dengan menu Jadwal Mengajar).
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-900/50">
                          <th className="p-4 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Nama Guru</th>
                          <th className="p-4 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Mata Pelajaran</th>
                          <th className="p-4 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider text-center">Status Absensi ({pikietSelectedDate})</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850">
                        {teachersForAttendanceDay.map((t) => {
                          const currentStatus = teacherStatusOnSelectedDate(t.id);
                          return (
                            <tr key={t.id} className="hover:bg-slate-900/30 transition-colors">
                              <td className="p-4">
                                <div className="flex items-center space-x-3 text-left">
                                  <img
                                    src={t.image}
                                    alt={t.name}
                                    referrerPolicy="no-referrer"
                                    className="w-8 h-8 rounded-full border border-slate-800 object-cover"
                                  />
                                  <div>
                                    <p className="text-xs font-bold text-white">{t.name}</p>
                                    <p className="text-[10px] text-slate-500">{t.position}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4 text-xs font-medium text-slate-300">
                                {t.subject}
                              </td>
                              <td className="p-4">
                                <div className="flex items-center justify-center gap-1.5">
                                  {(['Hadir', 'Izin', 'Sakit', 'Alpa'] as const).map((status) => {
                                    let activeStyle = '';
                                    if (status === 'Hadir') activeStyle = 'bg-emerald-400/10 text-emerald-400 border-emerald-400';
                                    else if (status === 'Izin') activeStyle = 'bg-amber-400/10 text-amber-400 border-amber-400';
                                    else if (status === 'Sakit') activeStyle = 'bg-blue-400/10 text-blue-400 border-blue-400';
                                    else if (status === 'Alpa') activeStyle = 'bg-rose-400/10 text-rose-400 border-rose-400';

                                    const isActive = currentStatus === status;

                                    return (
                                      <button
                                        key={status}
                                        onClick={() => {
                                          setTeacherStatusOnSelectedDate(t, status);
                                          addActivityLog(currentUser.name, currentUser.role, 'Edit', `Mengabsen ${t.name} sebagai [${status}] untuk tanggal ${pikietSelectedDate}`);
                                        }}
                                        className={`px-3 py-1 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                                          isActive
                                            ? `${activeStyle} shadow-sm font-black`
                                            : 'border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700 bg-transparent'
                                        }`}
                                      >
                                        {status}
                                      </button>
                                    );
                                  })}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {teachersForAttendanceDay.length === 0 && (
                    <div className="p-10 text-center text-slate-500 text-xs">
                      Tidak ada guru yang terjadwal mengajar hari {attendanceDayFilter}.
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* 12. VIEW TAB: REKAP ABSENSI BULANAN (rangkuman Senin-Jumat semua guru) */}
            {dashboardTab === 'attendance-recap' && canAccessAttendance && (isSuperAdmin || currentUser.role === 'Managerial Sekolah' || isGuruPiket || isGuru) && (
              <div className="space-y-6">

                {/* Header card */}
                <div className="bg-[#0b1d33] border border-slate-800 p-5 sm:p-6 rounded-2xl">
                  <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Rekap Absensi Guru</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Total kehadiran guru dihitung per bulan, dari histori absensi tanggal asli (bukan lagi snapshot nama hari). Pilih satu bulan (isi Dari & Sampai sama), atau rentang beberapa bulan sekaligus.
                  </p>
                </div>

                <div className="bg-[#0b1d33] border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-end gap-4">
                  <div className="flex flex-col sm:flex-row gap-4 flex-1">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase block">Dari Bulan</label>
                      <input
                        type="month"
                        value={rekapGuruFromMonth}
                        onChange={(e) => setRekapGuruFromMonth(e.target.value)}
                        className="w-full sm:w-auto bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase block">Sampai Bulan</label>
                      <input
                        type="month"
                        value={rekapGuruToMonth}
                        onChange={(e) => setRekapGuruToMonth(e.target.value)}
                        className="w-full sm:w-auto bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportRekapGuru}
                    className="flex items-center justify-center space-x-1.5 bg-amber-400 hover:bg-amber-300 text-slate-900 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    <span>Ekspor CSV</span>
                  </button>
                </div>

                {rekapGuruMonthKeys.length === 0 ? (
                  <div className="p-10 text-center text-slate-500 text-xs bg-[#0b1d33] border border-slate-800 rounded-2xl">
                    Rentang bulan tidak valid — pastikan "Dari Bulan" tidak melewati "Sampai Bulan".
                  </div>
                ) : (
                  rekapGuruMonthKeys.map((monthKey) => {
                    const rows = buildRekapGuruRowsForMonth(monthKey);
                    return (
                      <div key={monthKey} className="bg-[#0b1d33] border border-slate-800 rounded-2xl overflow-hidden">
                        <div className="p-4 border-b border-slate-800">
                          <h4 className="text-sm font-black text-amber-400 uppercase tracking-wide">{formatMonthLabel(monthKey)}</h4>
                          <p className="text-[10px] text-slate-500 mt-0.5">{rows.length} guru</p>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs text-left">
                            <thead>
                              <tr className="bg-slate-900/60 border-b border-slate-800 text-slate-400 font-bold">
                                <th className="p-3 whitespace-nowrap">Nama Guru</th>
                                <th className="p-3 whitespace-nowrap">Mata Pelajaran</th>
                                <th className="p-3 text-center whitespace-nowrap">Hadir</th>
                                <th className="p-3 text-center whitespace-nowrap">Izin</th>
                                <th className="p-3 text-center whitespace-nowrap">Sakit</th>
                                <th className="p-3 text-center whitespace-nowrap">Alpa</th>
                                <th className="p-3 text-center whitespace-nowrap">Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                              {rows.map((r) => (
                                <tr key={r.id} className="hover:bg-slate-900/30">
                                  <td className="p-3 font-semibold text-white whitespace-nowrap">{r.name}</td>
                                  <td className="p-3 text-slate-300 whitespace-nowrap">{r.subject}</td>
                                  <td className="p-3 text-center text-emerald-400 font-bold">{r.Hadir}</td>
                                  <td className="p-3 text-center text-amber-300 font-bold">{r.Izin}</td>
                                  <td className="p-3 text-center text-blue-300 font-bold">{r.Sakit}</td>
                                  <td className="p-3 text-center text-rose-400 font-bold">{r.Alpa}</td>
                                  <td className="p-3 text-center text-white font-black">{r.total}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {rows.length === 0 && (
                          <div className="p-8 text-center text-slate-500 text-xs">
                            Tidak ada data guru untuk ditampilkan pada bulan ini.
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* 13. VIEW TAB: KONVERSI LINK GOOGLE DRIVE */}
            {dashboardTab === 'drive-converter' && (
              <DriveLinkConverter />
            )}

          </div>

        </div>
      </div>

      {/* POPUP PENGINGAT SUPER ADMIN — muncul otomatis tiap dashboard dibuka */}
      <AnimatePresence>
        {isSuperAdmin && reminderPopupOpen && superAdminReminders.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-[#0b1d33] border border-amber-400/40 rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl text-left relative overflow-hidden text-slate-100"
            >
              <button
                onClick={() => setReminderPopupOpen(false)}
                className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center space-x-2 text-amber-400 mb-4">
                <div className="bg-amber-400/10 w-10 h-10 rounded-2xl flex items-center justify-center border border-amber-400/20">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <span className="text-xs font-black uppercase tracking-widest">Saran untuk Super Admin</span>
              </div>

              <ul className="space-y-2 mb-2">
                {superAdminReminders.map((r, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => {
                        setDashboardTab(r.tab);
                        setReminderPopupOpen(false);
                      }}
                      className="w-full text-left text-xs text-amber-100 bg-slate-900/40 hover:bg-slate-900/70 border border-amber-400/20 rounded-xl px-4 py-2.5 cursor-pointer transition-colors"
                    >
                      {r.text}
                    </button>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => setReminderPopupOpen(false)}
                className="w-full mt-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2.5 rounded-xl text-xs tracking-wide cursor-pointer transition-colors"
              >
                Tutup, Ingatkan Lagi Nanti
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DYNAMIC FORM MODAL DIALOG */}
      <AnimatePresence>
        {isModalOpen && modalType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0b1d33] border border-slate-800 rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl text-left relative overflow-hidden text-slate-100"
            >
              {/* Close icon */}
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider mb-5">
                {modalMode === 'add' ? 'Tambah Data' : 'Ubah Data'} {modalType.toUpperCase()}
              </h3>

              <form onSubmit={handleFormSubmit} className="space-y-4">
                
                {/* 1. ARTICLE INPUTS */}
                {modalType === 'article' && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Judul Berita</label>
                      <input 
                        type="text" required value={artTitle} onChange={(e) => setArtTitle(e.target.value)}
                        placeholder="e.g. Kegiatan Upacara Bendera HUT RI ke-81"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Kategori</label>
                        <select 
                          value={artCategory} onChange={(e) => setArtCategory(e.target.value as any)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-400"
                        >
                          <option value="Berita">Berita</option>
                          <option value="Kegiatan">Kegiatan</option>
                          <option value="Prestasi">Prestasi</option>
                          <option value="OSIS">OSIS</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">URL Ilustrasi Gambar</label>
                        <input 
                          type="text" value={artImage} onChange={(e) => setArtImage(normalizeImageUrl(e.target.value))}
                          placeholder="e.g. https://images.unsplash.com/... atau link share Google Drive"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Ringkasan Singkat (Excerpt)</label>
                      <input 
                        type="text" required value={artExcerpt} onChange={(e) => setArtExcerpt(e.target.value)}
                        placeholder="Keterangan singkat satu kalimat untuk card list..."
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Konten Lengkap Berita</label>
                      <textarea 
                        required value={artContent} onChange={(e) => setArtContent(e.target.value)} rows={4}
                        placeholder="Tuliskan detail berita sekolah secara menyeluruh di sini..."
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>
                )}

                {/* 2. GALLERY INPUTS */}
                {modalType === 'gallery' && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Nama Album Kegiatan</label>
                      <input 
                        type="text" required value={galAlbum} onChange={(e) => setGalAlbum(e.target.value)}
                        placeholder="e.g. LDKS Angkatan 2026"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Tipe Media</label>
                        <select 
                          value={galType} onChange={(e) => setGalType(e.target.value as any)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-400"
                        >
                          <option value="Photo">Foto Dokumentasi</option>
                          <option value="Video">Video Dokumentasi</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">URL Media</label>
                        <input 
                          type="text" required value={galUrl} onChange={(e) => setGalUrl(normalizeImageUrl(e.target.value))}
                          placeholder="e.g. https://images.unsplash.com/... atau link share Google Drive"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Deskripsi Media / Caption</label>
                      <input 
                        type="text" required value={galCaption} onChange={(e) => setGalCaption(e.target.value)}
                        placeholder="e.g. Pelatihan materi kepemimpinan OSIS di aula utama"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>
                )}

                {/* 3. TEACHER INPUTS */}
                {modalType === 'teacher' && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Nama Lengkap Guru (Gelar)</label>
                      <input 
                        type="text" required value={teachName} onChange={(e) => setTeachName(e.target.value)}
                        placeholder="e.g. Tristian Novansyah, S.Kom"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Mata Pelajaran Utama</label>
                        <input
                          type="text" required value={teachSubject} onChange={(e) => setTeachSubject(e.target.value)}
                          placeholder="e.g. Bahasa Indonesia / Matematika / IPA"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Kode Mengajar</label>
                        <input
                          type="number" min={1} value={teachCode} onChange={(e) => setTeachCode(e.target.value)}
                          placeholder="e.g. 15"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                        />
                        <p className="text-[10px] text-slate-500">Dipakai di tabel Jadwal Mengajar — kosongkan kalau belum punya kode.</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Jabatan Struktural</label>
                        <input 
                          type="text" required value={teachPosition} onChange={(e) => setTeachPosition(e.target.value)}
                          placeholder="e.g. Kepala Sekolah / Pembina OSIS / Guru"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">URL Pas Foto Guru</label>
                        <input
                          type="text" value={teachImage} onChange={(e) => setTeachImage(normalizeImageUrl(e.target.value))}
                          placeholder="e.g. https://images.unsplash.com/... atau link share Google Drive"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Wali Kelas</label>
                      <select
                        value={teachWaliKelas}
                        onChange={(e) => setTeachWaliKelas(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-400"
                      >
                        <option value="-">-</option>
                        {CLASS_ROSTER_OPTIONS.map((cls) => (
                          <option key={cls} value={cls}>{cls}</option>
                        ))}
                      </select>
                      <p className="text-[10px] text-slate-500">Dipakai kartu "Wali Kelas" di dashboard Orang Tua — pilih "-" kalau guru ini bukan wali kelas.</p>
                    </div>
                  </div>
                )}

                {/* 3b. STUDENT (MURID) INPUTS */}
                {modalType === 'student' && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Nama Lengkap Murid</label>
                      <input
                        type="text" required value={studName} onChange={(e) => setStudName(e.target.value)}
                        placeholder="e.g. Naufal Rafa Argani Wibowo"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">NIS</label>
                        <input
                          type="text" required value={studNis}
                          readOnly={modalMode === 'edit'}
                          onChange={(e) => setStudNis(e.target.value)}
                          placeholder="e.g. 10234"
                          className={`w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs font-mono focus:outline-none focus:border-amber-400 ${modalMode === 'edit' ? 'text-slate-500 cursor-not-allowed' : 'text-white'}`}
                        />
                        {modalMode === 'edit' && (
                          <p className="text-[10px] text-slate-500">NIS = barcode absensi, tidak bisa diganti di sini.</p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">NISN</label>
                        <input
                          type="text" value={studNisn} onChange={(e) => setStudNisn(e.target.value)}
                          placeholder="e.g. 0012345678"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Kelas</label>
                        <input
                          type="text" required value={studClassName} onChange={(e) => setStudClassName(e.target.value)}
                          placeholder="e.g. VII.1"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Jenis Kelamin</label>
                        <select
                          value={studGender} onChange={(e) => setStudGender(e.target.value as 'L' | 'P')}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-400"
                        >
                          <option value="L">L (Laki-laki)</option>
                          <option value="P">P (Perempuan)</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Tahun Ajaran</label>
                        <input
                          type="text" value={studSchoolYear} onChange={(e) => setStudSchoolYear(e.target.value)}
                          placeholder="e.g. 2025/2026"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>
                      <div className="flex items-center space-x-2 pt-5">
                        <input
                          type="checkbox" id="stud-active-chk" checked={studActive} onChange={(e) => setStudActive(e.target.checked)}
                          className="accent-amber-400 text-slate-900 rounded focus:ring-0 cursor-pointer"
                        />
                        <label htmlFor="stud-active-chk" className="text-[10px] font-bold text-slate-300 cursor-pointer select-none">Murid Aktif</label>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3c. PENGUMUMAN KELAS (CLASS ROSTER) INPUTS */}
                {modalType === 'classRoster' && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Kelas</label>
                      {modalMode === 'add' ? (
                        <select
                          value={crClassName} onChange={(e) => setCrClassName(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-400"
                        >
                          {CLASS_ROSTER_OPTIONS.filter((cls) => !classRoster.some((c) => c.className === cls)).map((cls) => (
                            <option key={cls} value={cls}>{cls}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text" readOnly value={crClassName}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-500 cursor-not-allowed"
                        />
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Daftar Murid (satu nama per baris)</label>
                      <textarea
                        required value={crStudentsText} onChange={(e) => setCrStudentsText(e.target.value)} rows={10}
                        placeholder={'Alvan Refi Saputra - L\nAura Sinar Septiansyah - P\n...'}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                      />
                      <p className="text-[10px] text-slate-500">Format tiap baris: Nama Lengkap - L atau Nama Lengkap - P.</p>
                    </div>
                  </div>
                )}

                {/* 4. UNIFORM INPUTS */}
                {modalType === 'uniform' && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Nama Jenis Seragam</label>
                      <input 
                        type="text" required value={uniName} onChange={(e) => setUniName(e.target.value)}
                        placeholder="e.g. Seragam Biru Putih Lengkap Atribut"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Hari Penggunaan</label>
                        <input 
                          type="text" required value={uniDays} onChange={(e) => setUniDays(e.target.value)}
                          placeholder="e.g. Senin & Selasa"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">URL Foto Sampel</label>
                        <input 
                          type="text" value={uniImage} onChange={(e) => setUniImage(normalizeImageUrl(e.target.value))}
                          placeholder="e.g. https://images.unsplash.com/... atau link share Google Drive"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Keterangan / Detil Atribut</label>
                      <textarea 
                        required value={uniDesc} onChange={(e) => setUniDesc(e.target.value)} rows={2}
                        placeholder="Spesifikasi kaos kaki, ikat pinggang berlambang, topi, dasi sekolah..."
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>
                )}

                {/* 5. CASH TRANSACTION INPUTS */}
                {modalType === 'cash' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Tipe Arus Kas</label>
                        <select 
                          value={cashType} onChange={(e) => setCashType(e.target.value as any)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-400"
                        >
                          <option value="Masuk">Masuk (Pendapatan)</option>
                          <option value="Keluar">Keluar (Pengeluaran)</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Jumlah Transaksi (Rupiah)</label>
                        <input 
                          type="number" required value={cashAmount || ''} onChange={(e) => setCashAmount(Number(e.target.value))}
                          placeholder="e.g. 50000"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Kategori Keuangan</label>
                      <select 
                        value={cashCategory} onChange={(e) => setCashCategory(e.target.value as any)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-400"
                      >
                        <option value="Iuran Bulanan">Iuran Bulanan</option>
                        <option value="Konsumsi">Konsumsi</option>
                        <option value="Dokumentasi">Dokumentasi</option>
                        <option value="Sponsorship">Sponsorship</option>
                        <option value="Lain-lain">Lain-lain</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Keterangan / Deskripsi Transaksi</label>
                      <input 
                        type="text" required value={cashDesc} onChange={(e) => setCashDesc(e.target.value)}
                        placeholder="e.g. Uang iuran kas mingguan pengurus OSIS kelas 7 & 8"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>
                )}

                {/* 6. FINE TRANSACTION INPUTS */}
                {modalType === 'fine' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Nama Siswa Pelanggar</label>
                        <input 
                          type="text" required value={fineViolator} onChange={(e) => setFineViolator(e.target.value)}
                          placeholder="e.g. Bobby Iskandar"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Nominal Denda (Rupiah)</label>
                        <input 
                          type="number" required value={fineAmount || ''} onChange={(e) => setFineAmount(Number(e.target.value))}
                          placeholder="e.g. 10000"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Kategori Pelanggaran</label>
                        <select 
                          value={fineCategory} onChange={(e) => setFineCategory(e.target.value as any)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-400"
                        >
                          <option value="Keterlambatan">Keterlambatan</option>
                          <option value="Atribut Tidak Lengkap">Atribut Tidak Lengkap</option>
                          <option value="Kebersihan">Kebersihan</option>
                          <option value="Pengeluaran Kegiatan">Pengeluaran Kegiatan</option>
                          <option value="Lain-lain">Lain-lain</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Status Awal</label>
                        <select 
                          value={fineStatus} onChange={(e) => setFineStatus(e.target.value as any)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-400"
                        >
                          <option value="Belum Lunas">Belum Lunas</option>
                          <option value="Lunas">Lunas</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Deskripsi Pelanggaran / Kronologi</label>
                      <input 
                        type="text" required value={fineDesc} onChange={(e) => setFineDesc(e.target.value)}
                        placeholder="e.g. Datang terlambat lebih dari 15 menit ke upacara hari senin"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>
                )}

                {/* 7. USER MANAGEMENT INPUTS */}
                {modalType === 'user' && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Nama Lengkap Anggota ERP</label>
                      <input 
                        type="text" required value={usrName} onChange={(e) => setUsrName(e.target.value)}
                        placeholder="e.g. Aditya Pratama"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    {modalMode === 'add' ? (
                      <>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">ID Pengguna / Username</label>
                          <input
                            type="text" required value={usrEmail} onChange={(e) => setUsrEmail(e.target.value)}
                            placeholder="e.g. bendahara.osis"
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                          />
                          <p className="text-[10px] text-amber-400">Cukup ID pendek (mis. "farhan") — domain login ditambahkan otomatis.</p>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Kata Sandi Awal</label>
                          <input
                            type="text" value={usrPassword} onChange={(e) => setUsrPassword(e.target.value)}
                            placeholder="Min. 8 karakter, huruf besar & angka (kosongkan = default)"
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                          />
                        </div>
                      </>
                    ) : (
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">ID Pengguna / Email Login</label>
                        <input
                          type="text" readOnly value={usrEmail}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-400 font-mono cursor-not-allowed"
                        />
                        <p className="text-[10px] text-slate-500">Email/ID login tidak bisa diganti di sini.</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Hak Akses Peran (Role)</label>
                        <select 
                          value={usrRole} onChange={(e) => setUsrRole(e.target.value as any)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-400"
                        >
                          <option value="Normal User">Normal User (Siswa/Kontributor)</option>
                          <option value="Managerial OSIS">Managerial OSIS (Pengurus Inti OSIS)</option>
                          <option value="Managerial Sekolah">Managerial Sekolah (Staf/Pimpinan)</option>
                          <option value="Guru Piket">Guru Piket (Guru Penjaga/Piket)</option>
                          <option value="Guru">Guru (Tenaga Pengajar)</option>
                          <option value="Super Admin">Super Admin (Guru Pembina)</option>
                          <option value="Orang Tua">Orang Tua (Portal Pantau Anak)</option>
                        </select>
                      </div>
                      <div className="flex items-center space-x-2 pt-5">
                        <input
                          type="checkbox" id="pwd-change-chk" checked={usrMustChangePwd} onChange={(e) => setUsrMustChangePwd(e.target.checked)}
                          className="accent-amber-400 text-slate-900 rounded focus:ring-0 cursor-pointer"
                        />
                        <label htmlFor="pwd-change-chk" className="text-[10px] font-bold text-slate-300 cursor-pointer select-none">Wajib Ganti Sandi di Login Awal</label>
                      </div>
                    </div>
                    {usrRole === 'Orang Tua' && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Anak (Murid yang Dihubungkan)</label>
                        <select
                          required
                          value={usrLinkedStudentId}
                          onChange={(e) => setUsrLinkedStudentId(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-400"
                        >
                          <option value="">— Pilih murid —</option>
                          {[...students]
                            .sort((a, b) => a.className.localeCompare(b.className) || a.name.localeCompare(b.name))
                            .map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.className} — {s.name} ({s.nis})
                              </option>
                            ))}
                        </select>
                        <p className="text-[10px] text-amber-400">1 akun Orang Tua = 1 anak. Kakak-adik satu sekolah dibuatkan akun terpisah.</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-4 border-t border-slate-800 flex justify-end space-x-3 text-xs font-bold">
                  <button
                    type="button" onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-amber-400 hover:bg-amber-350 text-slate-950 rounded-xl cursor-pointer"
                  >
                    Simpan Perubahan
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}

        {deleteConfirm.isOpen && deleteConfirm.type && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0b1d33] border border-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl text-left relative overflow-hidden text-slate-100 space-y-4"
            >
              <div className="flex items-center space-x-3 text-rose-400">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <h4 className="font-extrabold text-sm uppercase tracking-wider text-white">Konfirmasi Hapus</h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                Apakah Anda yakin ingin menghapus data <span className="text-amber-400 font-bold uppercase">{deleteConfirm.type === 'fine' ? 'denda' : deleteConfirm.type === 'cash' ? 'kas' : deleteConfirm.type === 'teacher' ? 'guru' : deleteConfirm.type === 'uniform' ? 'seragam' : deleteConfirm.type === 'gallery' ? 'galeri' : deleteConfirm.type === 'student' ? 'murid' : 'artikel'}</span> ini? Tindakan ini bersifat permanen dan tidak dapat dibatalkan.
              </p>
              <div className="flex justify-end space-x-2 pt-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setDeleteConfirm({ isOpen: false, type: null, id: null })}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl cursor-pointer"
                >
                  Ya, Hapus
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Konfirmasi Hapus Massal Data Murid (terpilih / per kelas) — tahap 2:
            wajib masukkan PIN Keamanan Eksekusi sebelum benar-benar jalan. */}
        {bulkDeleteConfirm.isOpen && bulkDeleteConfirm.mode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0b1d33] border border-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl text-left relative overflow-hidden text-slate-100 space-y-4"
            >
              {!execPinPromptOpen ? (
                <>
                  <div className="flex items-center space-x-3 text-rose-400">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <h4 className="font-extrabold text-sm uppercase tracking-wider text-white">Konfirmasi Hapus Massal</h4>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    {bulkDeleteConfirm.mode === 'class' ? (
                      <>
                        Yakin hapus <span className="text-amber-400 font-bold">SEMUA murid</span> di kelas{' '}
                        <span className="text-amber-400 font-bold uppercase">{studentClassFilter}</span>{' '}
                        ({students.filter((s) => s.className === studentClassFilter).length} murid)? Tindakan ini permanen dan tidak dapat dibatalkan.
                      </>
                    ) : (
                      <>
                        Yakin hapus <span className="text-amber-400 font-bold">{selectedStudentIds.size} murid terpilih</span>? Tindakan ini permanen dan tidak dapat dibatalkan.
                      </>
                    )}
                  </p>
                  <div className="flex justify-end space-x-2 pt-2 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setBulkDeleteConfirm({ isOpen: false, mode: null })}
                      disabled={bulkDeleteBusy}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl cursor-pointer disabled:opacity-50"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={() => { setExecPinPromptOpen(true); setExecPinPromptValue(''); setExecPinPromptError(''); }}
                      disabled={bulkDeleteBusy}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl cursor-pointer disabled:opacity-50"
                    >
                      Ya, Hapus
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center space-x-3 text-amber-400">
                    <Shield className="w-5 h-5 shrink-0" />
                    <h4 className="font-extrabold text-sm uppercase tracking-wider text-white">Masukkan PIN Keamanan</h4>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    Aksi hapus massal butuh PIN keamanan eksekusi (diatur Super Admin lewat tab Pengaturan), terpisah dari password login.
                  </p>
                  <input
                    type="password" inputMode="numeric" maxLength={6} autoFocus
                    value={execPinPromptValue}
                    onChange={(e) => setExecPinPromptValue(e.target.value.replace(/\D/g, ''))}
                    placeholder="PIN 4-6 digit"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white font-mono tracking-widest text-center focus:outline-none focus:border-amber-400"
                  />
                  {execPinPromptError && (
                    <p className="text-[11px] text-rose-400 font-bold">{execPinPromptError}</p>
                  )}
                  <div className="flex justify-end space-x-2 pt-2 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setExecPinPromptOpen(false)}
                      disabled={bulkDeleteBusy || execPinPromptSubmitting}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl cursor-pointer disabled:opacity-50"
                    >
                      Kembali
                    </button>
                    <button
                      type="button"
                      onClick={handleVerifyPinAndBulkDelete}
                      disabled={bulkDeleteBusy || execPinPromptSubmitting}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl cursor-pointer disabled:opacity-50"
                    >
                      {bulkDeleteBusy ? 'Menghapus...' : execPinPromptSubmitting ? 'Memeriksa...' : 'Verifikasi & Hapus'}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}

        {/* Reset Sandi Akun Lain — Super Admin only */}
        {isSuperAdmin && resetPwdTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0b1d33] border border-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl text-left relative overflow-hidden text-slate-100 space-y-5"
            >
              <div>
                <h4 className="font-extrabold text-sm uppercase tracking-wider text-white">Reset Sandi Akun</h4>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  Atur ulang kata sandi untuk <span className="text-white font-bold">{resetPwdTarget.name}</span>{' '}
                  <span className="font-mono text-slate-500">({resetPwdTarget.email})</span>. Akun ini akan wajib ganti sandi lagi saat login berikutnya.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Kata Sandi Baru</label>
                <input
                  type="text"
                  value={resetPwdValue}
                  onChange={(e) => setResetPwdValue(e.target.value)}
                  placeholder="Min. 8 karakter, ada huruf besar & angka"
                  autoFocus
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 font-bold"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-1 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => { setResetPwdTarget(null); setResetPwdValue(''); }}
                  disabled={resetPwdSubmitting}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl cursor-pointer disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleResetUserPassword}
                  disabled={resetPwdSubmitting}
                  className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl cursor-pointer disabled:opacity-50"
                >
                  {resetPwdSubmitting ? 'Menyimpan...' : 'Simpan Sandi Baru'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
