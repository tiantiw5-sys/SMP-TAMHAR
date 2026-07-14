/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, Suspense, lazy } from 'react';
import { 
  ArrowRight, Check, Star, BookOpen, Heart, 
  Sparkles, Mail, Lock, X, CheckCircle2, ChevronRight, 
  Eye, Calendar, Users, Award, Shield, FileText, Download, Bell, 
  LayoutDashboard, LogOut, Compass, MapPin, Phone, Globe, Play,
  Send, User, LockKeyhole, FileImage, Shirt
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  TESTIMONIALS, INITIAL_VISION_MISSION
} from './data';
import {
  Article, GalleryItem, Teacher, Uniform, CashTransaction,
  FineTransaction, NotificationItem, ActivityLog, SystemSettings, User as UserType,
  Student, StudentAttendanceRecord, ClassRosterEntry, TeachingScheduleDay,
  TeacherAttendanceRecord,
} from './types';
import Navbar from './components/Navbar';
import SchoolLogo from './components/SchoolLogo';
import Hero from './components/Hero';
import FeaturesBar from './components/FeaturesBar';
import GallerySlideshow from './components/GallerySlideshow';
import { SchoolOrgChartFull, OsisOrgChartFull } from './components/OrgStructureCharts';
import { SEJARAH_IMAGE_URL, PPDB_FLOW_IMAGE_URL, PPDB_FORM_URL } from './orgStructure';
import CourseCard from './components/CourseCard';
// Code-split lewat React.lazy — komponen ADMIN/berat ini cuma dipakai staf
// yang sudah login (atau lewat link khusus), jadi TIDAK perlu ikut ke-download
// oleh pengunjung publik landing page (mengurangi ukuran bundle awal &
// egress). Sengaja TIDAK termasuk UnifiedAttendanceKiosk/MuridAttendanceGate
// (jalur kiosk scan absensi guru+murid di gerbang sekolah) — itu harus tetap
// selalu ikut ke-load & precache PWA seperti sebelumnya, tidak boleh ada
// jeda loading tambahan di sana.
const StudentDashboard = lazy(() => import('./components/StudentDashboard'));
const ParentDashboard = lazy(() => import('./components/ParentDashboard'));
const StudentBarcodeCards = lazy(() => import('./components/StudentBarcodeCards'));
const TeacherBarcodeCards = lazy(() => import('./components/TeacherBarcodeCards'));
const ClassAnnouncements = lazy(() => import('./components/ClassAnnouncements'));
const SubjectSchedule = lazy(() => import('./components/SubjectSchedule'));
const AnnotationMode = lazy(() => import('./components/AnnotationMode'));
import UnifiedAttendanceKiosk from './components/UnifiedAttendanceKiosk';
import MuridAttendanceGate from './components/MuridAttendanceGate';
import { formatWhatsAppUrl, validatePasswordStrength } from './auth';
import { NAV_ITEMS } from './constants';
import { isSupabaseEnabled, getSupabase } from './lib/supabase';
import { signInStaff } from './lib/staffAuth';
import { canAccessMuridAttendance } from './lib/roleAccess';
import {
  loadPortalDataFromLocalStorage,
  loadPortalDataFromSupabase,
  cachePortalDataToLocalStorage,
  schedulePortalSave,
  flushPendingSaves,
  appendActivityLog,
  mergeActivityLog,
  mergeById,
  removeById,
  incrementDailyVisit,
  mapRowToPortalSlice,
  type AttendanceMap,
  type AnnotationItem,
  type PortalCollectionKey,
  type VisitsByDay,
  type PortalData,
} from './lib/portalDb';
import { useLandingPagePresence } from './lib/presence';
import { useIdleTimeout } from './lib/idleTimeout';
import { todayDateKey, mergeAttendanceRecord } from './lib/studentAttendance';
import { mergeTeacherAttendanceRecord } from './lib/teacherAttendance';

// Fallback Suspense generik buat komponen yang di-lazy-load (lihat React.lazy
// di atas) — cuma muncul sekejap saat chunk-nya baru pertama kali diunduh
// browser, sesudahnya browser sudah nge-cache chunk itu jadi tidak muncul lagi.
function RouteLoadingFallback() {
  return (
    <div className="min-h-screen bg-[#070f1e] flex flex-col items-center justify-center text-slate-100 font-sans">
      <div className="w-12 h-12 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-sm font-semibold text-slate-300">Memuat...</p>
    </div>
  );
}

// Saves one collection to Supabase in isolation, skipping the pass right after
// initial hydration. Kept per-collection (rather than one effect for everything)
// so that a change in one collection (or the visit counter ticking up on every
// page load) never re-writes — and potentially clobbers with a stale in-memory
// copy — collections nobody actually touched in this tab.
function usePortalSync(key: PortalCollectionKey, value: unknown, ready: boolean, enabled: boolean) {
  const hasHydratedRef = React.useRef(false);
  useEffect(() => {
    if (!ready) return;
    if (!hasHydratedRef.current) {
      hasHydratedRef.current = true;
      return;
    }
    if (enabled) {
      schedulePortalSave(key, value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, enabled, value]);
}

// Looks up the role/name/status for a logged-in Supabase Auth user from the
// `profiles` table (the auth session itself only carries id/email — the RLS
// policies need a real table to check roles against, see supabase/schema.sql).
async function fetchProfile(authUser: { id: string; email?: string | null }): Promise<UserType | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, role, status, must_change_password, linked_student_id')
    .eq('id', authUser.id)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    name: data.name || authUser.email || 'Pengguna',
    email: authUser.email ?? '',
    role: data.role as UserType['role'],
    status: data.status as UserType['status'],
    mustChangePassword: data.must_change_password,
    linkedStudentId: data.linked_student_id ?? undefined,
  };
}

// Field "Instagram" di Pengaturan Portal boleh diisi admin sebagai handle
// biasa ("@smp_tamanharapan1") ATAU link lengkap — supaya tetap bisa diklik
// dengan benar di footer, keduanya diterima di sini.
function resolveInstagramUrl(value: string): string {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const handle = trimmed.replace(/^@/, '');
  return `https://www.instagram.com/${handle}/`;
}

// Untuk TAMPILAN saja — biar footer nunjukin "@handle" yang rapi, bukan URL
// penuh yang panjang, apapun format aslinya (handle polos atau link lengkap).
function instagramHandle(value: string): string {
  const trimmed = value.trim();
  const match = trimmed.match(/instagram\.com\/([^/?]+)/i);
  const handle = match ? match[1] : trimmed.replace(/^@/, '');
  return `@${handle}`;
}

export default function App() {
  const supabaseOn = isSupabaseEnabled();
  // Authentication states — backed by real Supabase Auth sessions (see the
  // effect below), not a hand-rolled password check anymore.
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(supabaseOn);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'ppdb_interest'>('login');
  
  // Login input states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // PPDB Interest Form states
  const [ppdbStudentName, setPpdbStudentName] = useState('');
  const [ppdbParentPhone, setPpdbParentPhone] = useState('');
  const [ppdbGrade, setPpdbGrade] = useState('7');

  // Password change modal state for first login
  const [isPasswordChangeModalOpen, setIsPasswordChangeModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordChangeUser, setPasswordChangeUser] = useState<UserType | null>(null);

  // Navigation active state
  const [activeTab, setActiveTab] = useState('home');
  const [isDashboardOpen, setIsDashboardOpen] = useState(() => {
    return localStorage.getItem('smptamhar_isDashboardOpen') === 'true';
  });

  const [isPortalLoading, setIsPortalLoading] = useState(supabaseOn);
  const [portalReady, setPortalReady] = useState(!supabaseOn);
  // Skips the very first save-sync pass right after data hydrates from Supabase —
  // without this, every browser tab echoes back the snapshot it just read, and two
  // tabs open around the same time can clobber each other's real edits with stale data.
  const hasHydratedRef = React.useRef(false);
  const [visitIncremented, setVisitIncremented] = useState(false);

  const initialPortalData = loadPortalDataFromLocalStorage();

  // School portal state — disinkronkan ke Supabase (atau localStorage jika env kosong)
  const [articles, setArticles] = useState<Article[]>(initialPortalData.articles);
  const [gallery, setGallery] = useState<GalleryItem[]>(initialPortalData.gallery);
  const [teachers, setTeachers] = useState<Teacher[]>(initialPortalData.teachers);
  const [uniforms, setUniforms] = useState<Uniform[]>(initialPortalData.uniforms);
  const [cashTransactions, setCashTransactions] = useState<CashTransaction[]>(initialPortalData.cashTransactions);
  const [fineTransactions, setFineTransactions] = useState<FineTransaction[]>(initialPortalData.fineTransactions);
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialPortalData.notifications);
  const [logs, setLogs] = useState<ActivityLog[]>(initialPortalData.logs);
  const [settings, setSettings] = useState<SystemSettings>(initialPortalData.settings);
  const [attendance, setAttendance] = useState<AttendanceMap>(initialPortalData.attendance);
  const [students, setStudents] = useState<Student[]>(initialPortalData.students);
  const [studentAttendance, setStudentAttendance] = useState<StudentAttendanceRecord[]>(
    initialPortalData.studentAttendance
  );
  const [visitsByDay, setVisitsByDay] = useState<VisitsByDay>(initialPortalData.visitsByDay);
  // Hitungan real-time "online sekarang" di landing page (Supabase Realtime
  // Presence) — cuma pengunjung yang BELUM login yang ikut dihitung; staf
  // yang sedang login ke dashboard cuma mengintip angkanya, tidak ikut kehitung.
  const onlineNow = useLandingPagePresence(!isLoggedIn);
  const [annotations, setAnnotations] = useState<AnnotationItem[]>(initialPortalData.annotations);
  const [classRoster, setClassRoster] = useState<ClassRosterEntry[]>(initialPortalData.classRoster);
  const [teachingSchedule, setTeachingSchedule] = useState<TeachingScheduleDay[]>(initialPortalData.teachingSchedule);
  const [teacherAttendanceLog, setTeacherAttendanceLog] = useState<TeacherAttendanceRecord[]>(initialPortalData.teacherAttendanceLog);

  // #absen-murid dan #absen-guru (kiosk terpisah) sudah digabung jadi 1
  // kiosk universal di #absen-scan (lihat UnifiedAttendanceKiosk) — 1 alat
  // scan di gerbang cukup untuk guru & murid sekaligus, kodenya dicocokkan
  // otomatis ke koleksi yang cocok.
  const [unifiedScanOpen, setUnifiedScanOpen] = useState(
    () => window.location.hash === '#absen-scan'
  );
  const [barcodeCardsOpen, setBarcodeCardsOpen] = useState(
    () => window.location.hash === '#kartu-barcode-murid'
  );
  const [barcodeCardsGuruOpen, setBarcodeCardsGuruOpen] = useState(
    () => window.location.hash === '#kartu-barcode-guru'
  );
  const [pengumumanKelasOpen, setPengumumanKelasOpen] = useState(
    () => window.location.hash === '#pengumuman-kelas'
  );
  const [pelajaranOpen, setPelajaranOpen] = useState(
    () => window.location.hash === '#pelajaran'
  );
  const [barcodeClassFilter, setBarcodeClassFilter] = useState(() => {
    const kelas = new URLSearchParams(window.location.search).get('kelas');
    return kelas && kelas !== 'all' ? kelas : 'all';
  });

  // Active document download simulation target
  const [activeStructureTab, setActiveStructureTab] = useState<'school' | 'osis'>('school');

  // Search query on Landing Page for articles/teachers
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArticleCategory, setSelectedArticleCategory] = useState('All');

  // Notifications alerts
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);
  const [muridGateError, setMuridGateError] = useState<string | null>(null);

  // isLoggedIn sengaja jadi dependency di bawah: koleksi sensitif (students,
  // studentAttendance, cash, fines, logs) dikunci RLS khusus akun yang sudah
  // login. Fetch pertama saat aplikasi baru dibuka kadang selesai LEBIH DULU
  // daripada proses pulihkan sesi login (race condition antar dua proses
  // yang jalan bersamaan) — kalau efek ini cuma jalan sekali saat mount,
  // koleksi sensitif itu bisa nyangkut kosong/pakai data contoh sampai
  // halaman di-refresh manual. Dengan isLoggedIn di sini, begitu status
  // login berubah (baru saja login ATAU sesi lama berhasil dipulihkan),
  // seluruh data diambil ulang otomatis tanpa perlu refresh manual.
  useEffect(() => {
    if (!supabaseOn) {
      setPortalReady(true);
      setIsPortalLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      const data = await loadPortalDataFromSupabase({ isLoggedIn });
      if (cancelled) return;

      setArticles(data.articles);
      setGallery(data.gallery);
      setTeachers(data.teachers);
      setUniforms(data.uniforms);
      setCashTransactions(data.cashTransactions);
      setFineTransactions(data.fineTransactions);
      setNotifications(data.notifications);
      setLogs(data.logs);
      setSettings(data.settings);
      setAttendance(data.attendance);
      setStudents(data.students);
      setStudentAttendance(data.studentAttendance);
      setVisitsByDay(data.visitsByDay);
      setAnnotations(data.annotations);
      setClassRoster(data.classRoster);
      setTeachingSchedule(data.teachingSchedule);
      setTeacherAttendanceLog(data.teacherAttendanceLog);
      setPortalReady(true);
      setIsPortalLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [supabaseOn, isLoggedIn]);

  // Sinkronisasi real-time lintas sesi — kalau akun LAIN (di tab/perangkat
  // lain) menambah/mengubah/menghapus data apa pun (kas, denda, artikel,
  // absensi, dst), tab ini langsung ikut update tanpa perlu refresh manual.
  // Pakai Supabase Realtime (Postgres Changes) — bukan polling, jadi hemat.
  useEffect(() => {
    if (!portalReady || !supabaseOn) return;
    const supabase = getSupabase();
    if (!supabase) return;

    // Baris yang sama (mis. "studentAttendance") bisa ter-UPDATE berkali-kali
    // dalam hitungan detik saat banyak murid scan barcode beruntun — event
    // Postgres Realtime untuk update-update itu tidak dijamin sampai ke
    // browser dengan urutan yang sama persis (bisa kepentok/reorder di
    // jaringan). Tanpa penjaga ini, event LAMA yang telat sampai bisa
    // menimpa state yang sudah lebih baru dengan data basi — gejalanya persis
    // "kadang cuma 1 kelas yang kehadirannya kebaca" dan baru benar lagi
    // setelah di-refresh (refresh = ambil ulang data asli, bukan lewat
    // urutan event yang mungkin acak). Solusinya: setiap baris punya kolom
    // updated_at yang di-set server tiap kali ditulis — event dengan
    // updated_at LEBIH LAMA dari yang terakhir kita terapkan, diabaikan saja.
    const lastAppliedUpdatedAt = new Map<PortalCollectionKey, string>();

    const applyRealtimeUpdate = (key: PortalCollectionKey, payload: unknown) => {
      const scratch = {} as PortalData;
      mapRowToPortalSlice(key, payload, scratch);
      switch (key) {
        case 'articles': setArticles(scratch.articles); break;
        case 'gallery': setGallery(scratch.gallery); break;
        case 'teachers': setTeachers(scratch.teachers); break;
        case 'uniforms': setUniforms(scratch.uniforms); break;
        case 'notifications': setNotifications(scratch.notifications); break;
        case 'settings': setSettings(scratch.settings); break;
        case 'attendance': setAttendance(scratch.attendance); break;
        case 'students': setStudents(scratch.students); break;
        case 'visits': setVisitsByDay(scratch.visitsByDay); break;
        case 'annotations': setAnnotations(scratch.annotations); break;
        case 'classRoster': setClassRoster(scratch.classRoster); break;
        case 'teachingSchedule': setTeachingSchedule(scratch.teachingSchedule); break;
      }
    };

    const channel = supabase
      .channel('portal-collections-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'portal_collections' },
        (payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => {
          const row = (payload.new?.collection_key ? payload.new : payload.old) as
            | { collection_key?: PortalCollectionKey; payload?: unknown; updated_at?: string }
            | undefined;
          const key = row?.collection_key;
          if (!key) return;

          const incomingUpdatedAt = row?.updated_at;
          if (incomingUpdatedAt) {
            const lastAppliedAt = lastAppliedUpdatedAt.get(key);
            if (lastAppliedAt && incomingUpdatedAt <= lastAppliedAt) {
              return; // Event basi/telat — sudah ada yang lebih baru diterapkan.
            }
            lastAppliedUpdatedAt.set(key, incomingUpdatedAt);
          }

          applyRealtimeUpdate(key, payload.eventType === 'DELETE' ? undefined : (payload.new as any)?.payload);
        }
      )
      // student_attendance sekarang tabel normal (1 baris = 1 catatan absensi),
      // bukan lagi ikut blob portal_collections di atas — jadi Realtime-nya
      // cuma kirim BARIS yang berubah, bukan seluruh riwayat absensi. State
      // di-update inkremental (tambah/ganti/hapus 1 item), bukan full replace.
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'student_attendance' },
        (payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => {
          if (payload.eventType === 'DELETE') {
            const oldId = payload.old?.id as string | undefined;
            if (!oldId) return;
            setStudentAttendance((prev) => prev.filter((r) => r.id !== oldId));
            return;
          }

          const row = payload.new as {
            id: string;
            student_id: string;
            student_name: string;
            class_name: string;
            date: string;
            status: StudentAttendanceRecord['status'];
            check_in_at: string | null;
            source: StudentAttendanceRecord['source'];
            recorded_by: string | null;
            note: string | null;
          };
          const record: StudentAttendanceRecord = {
            id: row.id,
            studentId: row.student_id,
            studentName: row.student_name,
            className: row.class_name,
            date: row.date,
            status: row.status,
            checkInAt: row.check_in_at ?? undefined,
            source: row.source,
            recordedBy: row.recorded_by ?? undefined,
            note: row.note ?? undefined,
          };
          setStudentAttendance((prev) => mergeAttendanceRecord(prev, record));
        }
      )
      // teacher_attendance sama juga — tabel normal (1 baris = 1 catatan
      // absensi guru), bukan lagi ikut blob portal_collections. Ditambahkan
      // belakangan seiring fitur scan barcode QR guru (lihat
      // migrate_teacher_attendance_table.sql).
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teacher_attendance' },
        (payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => {
          if (payload.eventType === 'DELETE') {
            const oldId = payload.old?.id as string | undefined;
            if (!oldId) return;
            setTeacherAttendanceLog((prev) => prev.filter((r) => r.id !== oldId));
            return;
          }

          const row = payload.new as {
            id: string;
            teacher_id: string;
            teacher_name: string;
            date: string;
            status: TeacherAttendanceRecord['status'];
            recorded_by: string | null;
          };
          const record: TeacherAttendanceRecord = {
            id: row.id,
            teacherId: row.teacher_id,
            teacherName: row.teacher_name,
            date: row.date,
            status: row.status,
            recordedBy: row.recorded_by ?? undefined,
          };
          setTeacherAttendanceLog((prev) => mergeTeacherAttendanceRecord(prev, record));
        }
      )
      // logs juga sudah pindah ke tabel normal (activity_logs) — Realtime-nya
      // cuma kirim SATU baris baru per INSERT, bukan seluruh riwayat log.
      // mergeActivityLog menjaga supaya echo dari aksi milik sesi ini sendiri
      // (yang sudah ditambahkan optimistik di addActivityLog) tidak dobel.
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_logs' },
        (payload: { new: Record<string, unknown> }) => {
          const row = payload.new as {
            id: string;
            user_name: string;
            role: string;
            action: ActivityLog['action'];
            details: string;
            client_timestamp: string;
          };
          const record: ActivityLog = {
            id: row.id,
            user: row.user_name,
            role: row.role,
            action: row.action,
            details: row.details,
            timestamp: row.client_timestamp,
          };
          setLogs((prev) => mergeActivityLog(prev, record));
        }
      )
      // cash/fines sama juga — tabel normal (cash_transactions,
      // fine_transactions, lihat migrate_cash_fines_tables.sql). Beda dengan
      // logs, transaksi ini BISA diedit/dihapus, jadi dengarkan ketiga event
      // dan pakai mergeById/removeById (bukan cuma prepend seperti logs).
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cash_transactions' },
        (payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => {
          if (payload.eventType === 'DELETE') {
            const oldId = payload.old?.id as string | undefined;
            if (!oldId) return;
            setCashTransactions((prev) => removeById(prev, oldId));
            return;
          }
          const row = payload.new as {
            id: string;
            type: CashTransaction['type'];
            amount: number;
            description: string;
            category: CashTransaction['category'];
            txn_date: string;
            author: string;
          };
          const record: CashTransaction = {
            id: row.id,
            type: row.type,
            amount: Number(row.amount),
            description: row.description,
            category: row.category,
            date: row.txn_date,
            author: row.author,
          };
          setCashTransactions((prev) => mergeById(prev, record));
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fine_transactions' },
        (payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => {
          if (payload.eventType === 'DELETE') {
            const oldId = payload.old?.id as string | undefined;
            if (!oldId) return;
            setFineTransactions((prev) => removeById(prev, oldId));
            return;
          }
          const row = payload.new as {
            id: string;
            type: FineTransaction['type'];
            amount: number;
            description: string;
            violator: string | null;
            category: FineTransaction['category'];
            txn_date: string;
            author: string;
            status: FineTransaction['status'];
          };
          const record: FineTransaction = {
            id: row.id,
            type: row.type,
            amount: Number(row.amount),
            description: row.description,
            violator: row.violator ?? undefined,
            category: row.category,
            date: row.txn_date,
            author: row.author,
            status: row.status,
          };
          setFineTransactions((prev) => mergeById(prev, record));
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [portalReady, supabaseOn]);

  useEffect(() => {
    localStorage.setItem('smptamhar_isDashboardOpen', isDashboardOpen ? 'true' : 'false');
  }, [isDashboardOpen]);

  // Restore/track the Supabase Auth session. Supabase persists the session
  // itself (its own localStorage keys) — this just mirrors it into
  // isLoggedIn/currentUser by looking up the matching `profiles` row.
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setIsAuthLoading(false);
      return;
    }

    let cancelled = false;

    const applySession = async (sessionUser: { id: string; email?: string | null } | null) => {
      if (!sessionUser) {
        if (!cancelled) {
          setIsLoggedIn(false);
          setCurrentUser(null);
        }
        return;
      }
      const profile = await fetchProfile(sessionUser);
      if (cancelled) return;
      setIsLoggedIn(Boolean(profile));
      setCurrentUser(profile);
    };

    supabase.auth.getSession().then(({ data }) => {
      void applySession(data.session?.user ?? null).then(() => {
        if (!cancelled) setIsAuthLoading(false);
      });
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      void applySession(session?.user ?? null);
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, [supabaseOn]);

  useEffect(() => {
    if (!portalReady || visitIncremented) return;
    setVisitIncremented(true);
    if (supabaseOn) {
      // Naik di server dalam satu transaksi atomik (lihat increment_daily_visit
      // di schema.sql) — bukan baca-lalu-tulis-balik dari browser, yang bisa
      // kehilangan hitungan kalau banyak pengunjung landing page hampir
      // bersamaan.
      void incrementDailyVisit().then((saved) => {
        if (saved) setVisitsByDay(saved);
      });
    } else {
      const todayKey = todayDateKey();
      setVisitsByDay((prev) => ({ ...prev, [todayKey]: (prev[todayKey] ?? 0) + 1 }));
    }
  }, [portalReady, visitIncremented, supabaseOn]);

  useEffect(() => {
    if (!portalReady) return;

    // The pass that fires right as data finishes loading is just an echo of what
    // was read — skip it so this tab doesn't re-write (and potentially clobber)
    // data another tab may have changed a moment earlier.
    if (!hasHydratedRef.current) {
      hasHydratedRef.current = true;
      return;
    }

    const portalData = {
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
      annotations,
      classRoster,
      teachingSchedule,
      teacherAttendanceLog,
    };

    cachePortalDataToLocalStorage(portalData);
  }, [
    portalReady,
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
    annotations,
    classRoster,
    teachingSchedule,
    teacherAttendanceLog,
  ]);

  // articles/gallery/teachers/uniforms/cash/fines/studentAttendance/students
  // TIDAK lagi disinkron lewat efek generik ini — semuanya sudah ditulis lewat
  // RPC atomik (appendToCollection/updateCollectionItem/deleteCollectionItem)
  // langsung di titik aksinya. Kalau efek ini tetap aktif untuk koleksi itu,
  // setiap kali state berubah (termasuk gara-gara hasil RPC di atas) efek ini
  // akan menjadwalkan penulisan ULANG seluruh array 800ms kemudian — menimpa
  // balik perubahan dari tab/klien lain yang masuk di jendela waktu itu,
  // meniadakan proteksi atomik yang baru saja diberikan. ('students' dan
  // 'logs' sudah dipindah ke atomik — 'students' saat menu "Data Murid"
  // dibuat, 'logs' sekarang malah punya tabel sendiri (activity_logs, lihat
  // migrate_activity_logs_table.sql) jadi dua-duanya wajib TIDAK ada di
  // sini.) 'teacherAttendanceLog' juga sudah pindah ke tabel sendiri
  // (teacher_attendance, lihat migrate_teacher_attendance_table.sql) —
  // ditulis lewat upsertTeacherAttendance/deleteTeacherAttendanceForDate
  // langsung di titik aksinya (kiosk scan & panel manual guru piket), jadi
  // TIDAK ada di sini juga. Koleksi yang belum atomik (notifications,
  // settings, attendance harian, annotations) tetap pakai jalur ini karena
  // penulisnya masih replace-array-penuh. 'visits' TIDAK di sini — dinaikkan
  // lewat incrementDailyVisit() (atomik) di atas.
  usePortalSync('notifications', notifications, portalReady, supabaseOn);
  usePortalSync('settings', settings, portalReady, supabaseOn);
  usePortalSync('attendance', attendance, portalReady, supabaseOn);
  usePortalSync('annotations', annotations, portalReady, supabaseOn);
  usePortalSync('teachingSchedule', teachingSchedule, portalReady, supabaseOn);

  useEffect(() => {
    const syncSpecialRoutes = () => {
      const hash = window.location.hash;
      setUnifiedScanOpen(hash === '#absen-scan');
      setBarcodeCardsOpen(hash === '#kartu-barcode-murid');
      setBarcodeCardsGuruOpen(hash === '#kartu-barcode-guru');
      setPengumumanKelasOpen(hash === '#pengumuman-kelas');
      setPelajaranOpen(hash === '#pelajaran');
      const kelas = new URLSearchParams(window.location.search).get('kelas');
      setBarcodeClassFilter(kelas && kelas !== 'all' ? kelas : 'all');
    };
    syncSpecialRoutes();
    window.addEventListener('hashchange', syncSpecialRoutes);
    return () => window.removeEventListener('hashchange', syncSpecialRoutes);
  }, []);

  useEffect(() => {
    const flushOnExit = () => {
      void flushPendingSaves();
    };
    window.addEventListener('beforeunload', flushOnExit);
    return () => window.removeEventListener('beforeunload', flushOnExit);
  }, []);

  const attendanceRouteActive = unifiedScanOpen || barcodeCardsOpen || barcodeCardsGuruOpen;

  // Auto-clear alert notices after timeout
  useEffect(() => {
    if (alertMsg) {
      const timer = setTimeout(() => setAlertMsg(null), 4500);
      return () => clearTimeout(timer);
    }
  }, [alertMsg]);

  // Activity logger
  const addActivityLog = (user: string, role: string, action: 'Login' | 'Logout' | 'Tambah' | 'Edit' | 'Hapus' | 'Export', details: string) => {
    const newLog: ActivityLog = {
      id: `log-${Date.now()}`,
      user,
      role,
      action,
      details,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    setLogs(prev => mergeActivityLog(prev, newLog));
    // Ditulis lewat tabel normal activity_logs (lihat
    // migrate_activity_logs_table.sql) — INSERT satu baris, bukan lagi
    // menimpa/mengirim ulang seluruh blob 'logs' di portal_collections.
    void appendActivityLog(newLog);
  };

  // Auth Handlers
  const handleLoginClick = () => {
    setAuthMode('login');
    setIsAuthModalOpen(true);
  };

  const completeLogin = (profileUser: UserType, options?: { openDashboard?: boolean }) => {
    setIsLoggedIn(true);
    setCurrentUser(profileUser);
    setIsAuthModalOpen(false);
    if (options?.openDashboard !== false) {
      setIsDashboardOpen(true);
    }
    setLoginPassword('');
    setMuridGateError(null);
    addActivityLog(profileUser.name, profileUser.role, 'Login', 'Berhasil masuk ke portal ERP.');
    if (options?.openDashboard !== false) {
      setAlertMsg({
        type: 'success',
        text: `Selamat datang kembali, ${profileUser.name}! Membuka Dashboard ERP OSIS (${profileUser.role}).`,
      });
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const supabase = getSupabase();
    if (!supabase) {
      setAlertMsg({ type: 'error', text: 'Portal login belum terhubung ke server.' });
      return;
    }

    const signedIn = await signInStaff(supabase, loginEmail, loginPassword);
    if ('error' in signedIn) {
      setAlertMsg({ type: 'error', text: signedIn.error });
      return;
    }

    const profile = await fetchProfile(signedIn.user);
    if (!profile) {
      setAlertMsg({ type: 'error', text: 'Akun ditemukan tapi profil belum diatur. Hubungi Super Admin.' });
      await supabase.auth.signOut();
      return;
    }

    if (profile.mustChangePassword) {
      setPasswordChangeUser(profile);
      setIsAuthModalOpen(false);
      setIsPasswordChangeModalOpen(true);
      return;
    }

    completeLogin(profile);
  };

  const handleMuridGateAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMuridGateError(null);

    const supabase = getSupabase();
    if (!supabase) {
      setMuridGateError('Portal belum terhubung ke server.');
      return;
    }

    const signedIn = await signInStaff(supabase, loginEmail, loginPassword);
    if ('error' in signedIn) {
      setMuridGateError(signedIn.error);
      return;
    }

    const profile = await fetchProfile(signedIn.user);
    if (!profile) {
      setMuridGateError('Profil belum diatur. Hubungi Super Admin.');
      await supabase.auth.signOut();
      return;
    }

    if (!canAccessMuridAttendance(profile.role)) {
      setMuridGateError(`Role "${profile.role}" tidak diizinkan mengakses absensi murid.`);
      await supabase.auth.signOut();
      return;
    }

    if (profile.mustChangePassword) {
      setPasswordChangeUser(profile);
      setMuridGateError('Wajib ganti password dulu lewat portal utama sebelum membuka scanner.');
      return;
    }

    completeLogin(profile, { openDashboard: false });
  };

  const handleForgotPassword = () => {
    setAlertMsg({
      type: 'info',
      text: `Reset password hanya dapat dilakukan oleh Super Admin. Hubungi panitia via WhatsApp ${settings.whatsapp}.`,
    });
    window.open(formatWhatsAppUrl(settings.whatsapp), '_blank', 'noopener,noreferrer');
  };

  // First Password Change Submit
  const handlePasswordChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setAlertMsg({ type: 'error', text: 'Konfirmasi password baru tidak cocok!' });
      return;
    }
    const pwdError = validatePasswordStrength(newPassword);
    if (pwdError) {
      setAlertMsg({ type: 'error', text: pwdError });
      return;
    }

    const supabase = getSupabase();
    if (passwordChangeUser && supabase) {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        setAlertMsg({ type: 'error', text: 'Gagal mengganti password. Coba lagi.' });
        return;
      }
      await supabase.rpc('clear_must_change_password');

      const loggedUser: UserType = { ...passwordChangeUser, mustChangePassword: false };
      setIsPasswordChangeModalOpen(false);
      setNewPassword('');
      setConfirmPassword('');
      completeLogin(loggedUser);
      addActivityLog(loggedUser.name, loggedUser.role, 'Login', 'Ganti password pertama sukses dan masuk dashboard.');
      
      // Post notification
      const newNotif: NotificationItem = {
        id: `n-${Date.now()}`,
        type: 'Reset Password',
        title: 'Ganti Password Pertama Sukses',
        message: `Akun ${loggedUser.name} telah merubah password pertamanya dan aktif secara penuh.`,
        date: new Date().toLocaleString('id-ID'),
        read: false
      };
      setNotifications(prev => [newNotif, ...prev]);

      setAlertMsg({
        type: 'success',
        text: `Password berhasil dirubah! Selamat datang di Portal Login, ${loggedUser.name}.`
      });
    }
  };

  const handleLogout = (reason?: 'idle') => {
    if (currentUser) {
      addActivityLog(
        currentUser.name,
        currentUser.role,
        'Logout',
        reason === 'idle' ? 'Keluar otomatis (tidak ada aktivitas 10 menit).' : 'Keluar dari sesi portal ERP.'
      );
    }
    const supabase = getSupabase();
    if (supabase) {
      void supabase.auth.signOut();
    }
    setIsLoggedIn(false);
    setCurrentUser(null);
    setIsDashboardOpen(false);
    setAlertMsg(
      reason === 'idle'
        ? { type: 'info', text: 'Anda keluar otomatis karena tidak ada aktivitas selama 10 menit. Silakan login kembali.' }
        : { type: 'info', text: 'Anda telah keluar dari sistem secara aman. Terima kasih!' }
    );
  };

  // Auto-logout kalau tidak ada aktivitas (klik/ketik/scroll) selama 10 menit
  // — supaya sesi tidak tertinggal terbuka kalau komputer/HP ditinggal begitu
  // saja saat masih login (relevan untuk komputer bersama di kantor sekolah).
  // Dimatikan khusus saat layar kiosk scanner/cetak kartu barcode terbuka
  // (#absen-scan, #kartu-barcode-murid, #kartu-barcode-guru) — layar itu
  // memang sengaja dibiarkan menyala tanpa disentuh mouse/keyboard sambil
  // menunggu guru/murid scan kartu satu-satu, bukan berarti ditinggal
  // begitu saja.
  useIdleTimeout(isLoggedIn && !attendanceRouteActive, () => handleLogout('idle'), 10 * 60 * 1000);

  // PPDB Interest Submit
  const handlePpdbInterestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAlertMsg({
      type: 'success',
      text: `Pernyataan minat untuk calon siswa "${ppdbStudentName}" berhasil dikirim! Panitia PPDB akan segera menghubungi Anda ke nomor ${ppdbParentPhone}.`
    });
    setPpdbStudentName('');
    setPpdbParentPhone('');
    setIsAuthModalOpen(false);
  };

  // Filtered Landing Page articles
  const filteredArticles = articles.filter(art => {
    const matchesCategory = selectedArticleCategory === 'All' || art.category === selectedArticleCategory;
    const matchesSearch = art.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          art.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (isPortalLoading || isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#070f1e] flex flex-col items-center justify-center text-slate-100 font-sans">
        <div className="w-12 h-12 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-300">Memuat data portal...</p>
        {supabaseOn && (
          <p className="text-xs text-slate-500 mt-2">Terhubung ke Supabase</p>
        )}
      </div>
    );
  }

  if (pengumumanKelasOpen) {
    const kelasParam = new URLSearchParams(window.location.search).get('kelas') ?? undefined;
    return (
      <Suspense fallback={<RouteLoadingFallback />}>
        <ClassAnnouncements roster={classRoster} initialClass={kelasParam} />
      </Suspense>
    );
  }

  if (pelajaranOpen) {
    const kelasParam = new URLSearchParams(window.location.search).get('kelas') ?? undefined;
    return (
      <Suspense fallback={<RouteLoadingFallback />}>
        <SubjectSchedule teachers={teachers} teachingSchedule={teachingSchedule} initialClass={kelasParam} />
      </Suspense>
    );
  }

  if (attendanceRouteActive) {
    const gateVariant = unifiedScanOpen ? 'scan' : barcodeCardsGuruOpen ? 'guru' : 'murid';

    if (!isLoggedIn || !currentUser) {
      return (
        <MuridAttendanceGate
          mode="login"
          variant={gateVariant}
          onSubmit={handleMuridGateAuthSubmit}
          loginId={loginEmail}
          setLoginId={setLoginEmail}
          loginPassword={loginPassword}
          setLoginPassword={setLoginPassword}
          error={muridGateError}
        />
      );
    }

    if (!canAccessMuridAttendance(currentUser.role)) {
      return (
        <MuridAttendanceGate
          mode="denied"
          variant={gateVariant}
          user={currentUser}
          onBack={() => {
            window.location.hash = '';
          }}
        />
      );
    }

    if (unifiedScanOpen) {
      return (
        <UnifiedAttendanceKiosk
          students={students}
          studentRecords={studentAttendance}
          onStudentRecordsChange={setStudentAttendance}
          teachers={teachers}
          teacherRecords={teacherAttendanceLog}
          onTeacherRecordsChange={setTeacherAttendanceLog}
          portalReady={portalReady}
          supabaseOn={supabaseOn}
        />
      );
    }

    if (barcodeCardsGuruOpen) {
      return (
        <Suspense fallback={<RouteLoadingFallback />}>
          <TeacherBarcodeCards teachers={teachers} />
        </Suspense>
      );
    }

    return (
      <Suspense fallback={<RouteLoadingFallback />}>
        <StudentBarcodeCards students={students} classFilter={barcodeClassFilter} />
      </Suspense>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#070f1e] font-sans selection:bg-amber-400 selection:text-slate-900 text-slate-100">
      
      {/* Interactive Global Alerts */}
      <AnimatePresence>
        {alertMsg && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4"
          >
            <div className={`p-4 rounded-2xl shadow-xl border flex items-center space-x-3 text-left ${
              alertMsg.type === 'success' 
                ? 'bg-slate-900 border-amber-400 text-white shadow-amber-400/10' 
                : alertMsg.type === 'error'
                ? 'bg-slate-900 border-rose-500 text-white shadow-rose-500/10'
                : 'bg-slate-900 border-slate-700 text-slate-200'
            }`}>
              <div className={`p-1.5 rounded-lg shrink-0 ${
                alertMsg.type === 'success' ? 'bg-amber-400 text-slate-900' : 'bg-slate-800 text-amber-400'
              }`}>
                <Sparkles className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold leading-relaxed flex-grow pr-4">{alertMsg.text}</p>
              <button 
                onClick={() => setAlertMsg(null)}
                className="text-slate-400 hover:text-white shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Primary Navigation Menu */}
      <Navbar 
        isLoggedIn={isLoggedIn}
        onLogin={handleLoginClick}
        onLogout={handleLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onDashboardToggle={() => setIsDashboardOpen(!isDashboardOpen)}
        isDashboardOpen={isDashboardOpen}
        userName={currentUser ? currentUser.name : ''}
      />

      <AnimatePresence mode="wait">
        {isDashboardOpen && currentUser ? (
          
          /* VIEW 1: IMMERSIVE STUDENT/ADMIN ERP WORKSPACE PORTAL */
          <motion.div
            key="dashboard-view"
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={{ duration: 0.3 }}
          >
            <Suspense fallback={<RouteLoadingFallback />}>
            {currentUser.role === 'Orang Tua' ? (
              <ParentDashboard
                currentUser={currentUser}
                onLogout={handleLogout}
                teachingSchedule={teachingSchedule}
                uniforms={uniforms}
                settings={settings}
                teachers={teachers}
              />
            ) : (
            <StudentDashboard
              articles={articles}
              setArticles={setArticles}
              gallery={gallery}
              setGallery={setGallery}
              teachers={teachers}
              setTeachers={setTeachers}
              uniforms={uniforms}
              setUniforms={setUniforms}
              cashTransactions={cashTransactions}
              setCashTransactions={setCashTransactions}
              fineTransactions={fineTransactions}
              setFineTransactions={setFineTransactions}
              notifications={notifications}
              setNotifications={setNotifications}
              logs={logs}
              setLogs={setLogs}
              settings={settings}
              setSettings={setSettings}
              attendance={attendance}
              setAttendance={setAttendance}
              students={students}
              setStudents={setStudents}
              studentAttendance={studentAttendance}
              setStudentAttendance={setStudentAttendance}
              classRoster={classRoster}
              setClassRoster={setClassRoster}
              teachingSchedule={teachingSchedule}
              setTeachingSchedule={setTeachingSchedule}
              teacherAttendanceLog={teacherAttendanceLog}
              setTeacherAttendanceLog={setTeacherAttendanceLog}
              portalReady={portalReady}
              supabaseOn={supabaseOn}
              visitsByDay={visitsByDay}
              onlineNow={onlineNow}
              currentUser={currentUser}
              onLogout={handleLogout}
              addActivityLog={addActivityLog}
            />
            )}
            </Suspense>
          </motion.div>

        ) : (

          /* VIEW 2: PUBLIC OFFICIAL SCHOOL PORTAL LANDING PAGE */
          <motion.div
            key="landing-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-[#071324]"
          >
            {/* Hero Banner with overlap indicators */}
            <Hero
              onExploreCourses={() => {
                const coursesEl = document.getElementById('courses');
                if (coursesEl) coursesEl.scrollIntoView({ behavior: 'smooth' });
              }}
              onHowItWorks={() => {
                const profilEl = document.getElementById('profil-sekolah');
                if (profilEl) profilEl.scrollIntoView({ behavior: 'smooth' });
              }}
              onPlayDemo={() => {
                handleLoginClick();
              }}
            />

            {/* Gallery Carousel/Slideshow */}
            <GallerySlideshow items={gallery} />

            {/* Dark Blue Features Banner */}
            <FeaturesBar />

            {/* TENTANG & PROFIL SEKOLAH (Sejarah, Visi, Misi) */}
            <section id="profil-sekolah" className="py-12 bg-[#091629] border-b border-slate-800">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
                
                {/* Header */}
                <div className="text-center space-y-4 max-w-xl mx-auto">
                  <div className="inline-flex items-center space-x-1.5 text-amber-400 font-extrabold text-xs uppercase tracking-widest bg-amber-400/10 px-3.5 py-1.5 rounded-full">
                    <Shield className="w-3.5 h-3.5" />
                    <span>Profil Sekolah</span>
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                    Mengenal Kami Lebih Dekat
                  </h2>
                  <p className="text-sm text-slate-400 font-medium">
                    SMP Taman Harapan Bekasi berfokus pada pendidikan bermoral, mandiri, berkarakter, dan beriman.
                  </p>
                </div>

                {/* Profile Bento Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                  <div className="lg:col-span-8 overflow-hidden rounded-3xl border border-slate-800 bg-[#0b203a] flex items-center justify-center p-2 sm:p-4 min-h-[300px]">
                    <img
                      src={SEJARAH_IMAGE_URL}
                      alt="SMP Taman Harapan Bekasi Sejarah"
                      className="w-full h-auto max-h-[500px] object-contain rounded-2xl select-none"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  <div className="lg:col-span-4 bg-[#0e2746] border border-slate-800 p-5 sm:p-6 rounded-3xl space-y-4 text-left flex flex-col justify-between">
                    <div className="space-y-4">
                      <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-widest">Arah & Landasan</span>
                      <h3 className="text-2xl font-bold text-white tracking-tight">Visi & Misi Utama</h3>
                      <div className="p-4 bg-[#0b203a]/80 border border-slate-800 rounded-2xl">
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1 text-amber-400">Visi:</p>
                        <p className="text-sm text-white font-extrabold tracking-tight leading-relaxed">
                          "{INITIAL_VISION_MISSION.vision}"
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest text-amber-400">Misi Kami:</p>
                      <ul className="space-y-2.5 text-xs text-slate-300">
                        {INITIAL_VISION_MISSION.mission.slice(0, 4).map((m, i) => (
                          <li key={i} className="flex items-start space-x-2.5">
                            <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                            <span className="leading-relaxed">{m}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                </div>

              </div>
            </section>

            {/* UNIFORMS SECTION */}
            <section id="uniforms" className="py-24 bg-[#071324] border-b border-slate-800">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
                <div className="text-center space-y-4 max-w-xl mx-auto">
                  <div className="inline-flex items-center space-x-1.5 text-amber-400 font-extrabold text-xs uppercase tracking-widest bg-amber-400/10 px-3.5 py-1.5 rounded-full">
                    <Shirt className="w-3.5 h-3.5" />
                    <span>Katalog Pakaian</span>
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                    Koleksi Seragam Sekolah Lengkap
                  </h2>
                  <p className="text-sm text-slate-400 font-medium">
                    Ketentuan dan model pakaian seragam resmi siswa-siswi SMP Taman Harapan Bekasi.
                  </p>
                </div>

                <div className="flex flex-row overflow-x-auto gap-6 pb-4 snap-x scrollbar-thin scrollbar-thumb-amber-400/20 scrollbar-track-transparent">
                  {uniforms.map((un) => (
                    <div
                      key={un.id}
                      className="bg-[#0e223b] border border-slate-800 rounded-2xl overflow-hidden flex flex-col justify-between text-left hover:border-slate-700 transition-colors w-[260px] sm:w-[280px] lg:w-auto lg:flex-1 shrink-0 snap-start"
                    >
                      <div className="relative aspect-[4/3] bg-white shrink-0">
                        <img
                          src={un.image}
                          alt={un.name}
                          className="w-full h-full object-contain p-2"
                        />
                        <span className="absolute bottom-2 left-2 bg-amber-400 text-slate-900 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider">
                          {un.days}
                        </span>
                      </div>
                      <div className="p-4 space-y-2 flex-grow flex flex-col justify-between">
                        <div>
                          <h4 className="text-sm font-extrabold text-white leading-tight">{un.name}</h4>
                          <p className="text-[11px] text-slate-400 leading-relaxed mt-1 font-sans line-clamp-3">
                            {un.description}
                          </p>
                        </div>
                        <span className="text-[9px] text-amber-400 uppercase font-extrabold tracking-widest mt-2 block font-mono">
                          Ketentuan Umum
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* STRUKTUR ORGANISASI SEKOLAH & OSIS */}
            <section id="struktur-organisasi" className="py-24 bg-[#091629] border-b border-slate-800">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
                <div className="text-center space-y-4 max-w-xl mx-auto">
                  <div className="inline-flex items-center space-x-1.5 text-amber-400 font-extrabold text-xs uppercase tracking-widest bg-amber-400/10 px-3.5 py-1.5 rounded-full">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Struktur Organisasi</span>
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                    {activeStructureTab === 'school' ? 'Tata Kepengurusan Sekolah' : 'Tata Kepengurusan OSIS'}
                  </h2>
                  <p className="text-sm text-slate-400 font-medium">
                    {activeStructureTab === 'school'
                      ? 'Hierarki fungsionaris resmi pimpinan dan dewan pendamping sekolah SMP Taman Harapan Bekasi.'
                      : 'Bagan kepengurusan Organisasi Siswa Intra Sekolah (OSIS) SMP Taman Harapan Bekasi Periode Bhakti 2026/2027.'}
                  </p>
                </div>

                <div className="flex justify-center">
                  <div className="inline-flex bg-slate-900/85 p-1.5 rounded-2xl border border-slate-800 shadow-lg">
                    <button
                      onClick={() => setActiveStructureTab('school')}
                      className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        activeStructureTab === 'school'
                          ? 'bg-amber-400 text-slate-950 shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Fungsionaris Sekolah
                    </button>
                    <button
                      onClick={() => setActiveStructureTab('osis')}
                      className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        activeStructureTab === 'osis'
                          ? 'bg-amber-400 text-slate-950 shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Fungsionaris OSIS
                    </button>
                  </div>
                </div>

                <div className={`${activeStructureTab === 'school' ? 'max-w-4xl' : 'max-w-7xl'} mx-auto bg-[#0b203a] border border-slate-800 rounded-3xl p-6 sm:p-10 relative shadow-2xl`}>
                  {activeStructureTab === 'school' ? (
                    <SchoolOrgChartFull />
                  ) : (
                    <OsisOrgChartFull />
                  )}
                </div>
              </div>
            </section>

            {/* ARTIKEL & KEGIATAN SEKOLAH (Courses block) */}
            <section id="courses" className="py-24 bg-[#071324] border-b border-slate-800">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-12">
                
                {/* Section Header */}
                <div className="space-y-4 max-w-xl mx-auto">
                  <div className="inline-flex items-center space-x-1.5 text-amber-400 font-extrabold text-xs uppercase tracking-widest bg-amber-400/10 px-3.5 py-1.5 rounded-full">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <span>Kabar Sekolah</span>
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                    Berita & Kegiatan Terbaru
                  </h2>
                  <p className="text-sm text-slate-400 font-medium">
                    Ikuti artikel seputar program OSIS, agenda kegiatan P5, serta prestasi membanggakan SMP Taman Harapan Bekasi.
                  </p>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 max-w-3xl mx-auto bg-[#0b1d33] border border-slate-800 p-4 rounded-2xl">
                  {/* Category Pills */}
                  <div className="flex flex-wrap gap-2">
                    {['All', 'Berita', 'Kegiatan', 'Prestasi', 'OSIS'].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedArticleCategory(cat)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          selectedArticleCategory === cat 
                            ? 'bg-amber-400 text-slate-900 shadow' 
                            : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Text Search input */}
                  <div className="relative w-full sm:w-64">
                    <input
                      type="text"
                      placeholder="Cari berita..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 font-medium"
                    />
                  </div>
                </div>

                {/* Articles Grid */}
                {filteredArticles.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    {filteredArticles.map((art) => (
                      <CourseCard 
                        key={art.id}
                        course={art}
                        isLoggedIn={isLoggedIn}
                        isEnrolled={false}
                        onSelect={(id) => {
                          // Preview complete article content by toggling login
                          const matched = articles.find(a => a.id === id);
                          if (matched) {
                            setAlertMsg({
                              type: 'info',
                              text: `Membuka artikel: "${matched.title}". Portal Login untuk mengelola kontribusi penulisan.`
                            });
                          }
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-slate-500 text-sm">
                    Tidak ada berita atau artikel yang cocok dengan pencarian Anda.
                  </div>
                )}

              </div>
            </section>

            {/* GURU & STAFF PENGAJAR + VISI MISI (#about Section wrapper) */}
            <section id="about" className="py-24 bg-[#091629] border-b border-slate-800">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-16">
                
                {/* Section Header */}
                <div className="space-y-4 max-w-xl mx-auto">
                  <span className="text-xs font-bold text-amber-400 bg-amber-400/10 px-3.5 py-1.5 rounded-full uppercase tracking-widest">
                    Staf Pengajar
                  </span>
                  <h2 className="text-3xl font-black text-white tracking-tight">Dewan Guru & Pembina</h2>
                  <p className="text-sm text-slate-400 font-medium">
                    Didukung oleh pendidik profesional yang berdedikasi membangun akhlak dan mengarahkan potensi murid.
                  </p>
                </div>

                {/* Teachers Grid Layout */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 max-w-5xl mx-auto text-left">
                  {teachers.map((teach) => (
                    <div key={teach.id} className="bg-[#0b1d33] border border-slate-800 p-5 rounded-2xl hover:border-slate-700 transition-colors">
                      <div className="aspect-square rounded-xl overflow-hidden mb-4 bg-slate-900 border border-slate-800">
                        <img 
                          src={teach.image} 
                          alt={teach.name} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <span className="bg-amber-400/10 text-amber-300 text-[9px] font-extrabold uppercase px-2 py-1 rounded-md">
                        {teach.position}
                      </span>
                      <h4 className="text-sm font-extrabold text-white tracking-tight mt-2.5">{teach.name}</h4>
                      <p className="text-xs text-slate-400 font-medium">{teach.subject}</p>
                    </div>
                  ))}
                </div>

                {/* Testimonial Sub-block (What Our Students/Parents Say) —
                    disembunyikan sementara atas permintaan (bukan dihapus).
                    Ganti "false" jadi "true" di bawah kapan saja untuk
                    memunculkannya lagi, datanya (TESTIMONIALS) tetap utuh. */}
                {false && (
                  <div className="space-y-12 max-w-4xl mx-auto pt-16 border-t border-slate-800/80">
                    <h3 className="text-xl font-extrabold text-white tracking-tight">Aspirasi Wali Murid & Alumni</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                      {TESTIMONIALS.map((t, idx) => (
                        <div key={idx} className="bg-[#0b203a] border border-slate-800 p-6 rounded-3xl shadow-sm space-y-4 relative">
                          <div className="absolute top-6 right-6 text-amber-400/20 text-5xl font-serif leading-none">“</div>
                          <p className="text-xs text-slate-300 leading-relaxed italic pr-8">
                            {t.quote}
                          </p>
                          <div className="flex items-center space-x-3 pt-4 border-t border-slate-800">
                            <img
                              src={t.image}
                              alt={t.name}
                              className="w-9 h-9 rounded-full object-cover border border-slate-700"
                              referrerPolicy="no-referrer"
                            />
                            <div>
                              <p className="text-xs font-bold text-white">{t.name}</p>
                              <p className="text-[10px] text-slate-400 font-medium">{t.role}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </section>

            {/* ALUR PENDAFTARAN PPDB */}
            <section id="pricing" className="py-24 bg-[#071324] border-b border-slate-800">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-16">
                <div className="space-y-4 max-w-xl mx-auto">
                  <span className="text-xs font-bold text-amber-400 bg-amber-400/10 px-3.5 py-1.5 rounded-full uppercase tracking-widest">
                    PPDB TP 2026/2027
                  </span>
                  <h2 className="text-3xl font-black text-white tracking-tight">Alur Pendaftaran PPDB</h2>
                  <p className="text-sm text-slate-400 font-medium">
                    Ikuti langkah mudah pendaftaran calon siswa baru SMP Taman Harapan Bekasi secara online.
                  </p>
                </div>

                <div className="max-w-4xl mx-auto flex flex-col items-center gap-8">
                  <div className="w-full bg-[#0b203a] border border-slate-800 p-4 sm:p-6 rounded-3xl shadow-2xl relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-400/5 rounded-full blur-3xl pointer-events-none" />
                    <img
                      src={PPDB_FLOW_IMAGE_URL}
                      alt="Alur Pendaftaran PPDB SMP Taman Harapan"
                      className="w-full h-auto rounded-2xl object-contain shadow-inner"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  <a
                    href={PPDB_FORM_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold px-8 py-4 rounded-2xl text-sm sm:text-base tracking-wide transition-all shadow-lg hover:shadow-amber-400/20 cursor-pointer hover:scale-[1.02] active:scale-95 duration-200"
                  >
                    Daftar Formulir Online
                  </a>
                </div>
              </div>
            </section>

            {/* Bottom Call to Action banner */}
            <section className="py-24 bg-[#091629]">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div 
                  className="bg-[#0b203a] text-white rounded-[32px] p-8 sm:p-12 lg:p-16 relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-12 border border-slate-800 shadow-2xl text-left"
                  id="cta-bottom-banner"
                >
                  <div className="absolute top-0 right-0 w-96 h-96 bg-amber-400/5 rounded-full blur-3xl pointer-events-none" />
                  
                  {/* Left elements: Badge and heading */}
                  <div className="space-y-6 max-w-xl">
                    <div className="flex items-center space-x-4">
                      <div className="bg-white p-2 rounded-2xl shadow-lg shrink-0 flex items-center justify-center">
                        <SchoolLogo className="w-11 h-11" />
                      </div>
                      <div>
                        <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-none">Ayo Bergabung Bersama Kami</h3>
                        <p className="text-xs text-slate-400 font-medium mt-1">Kuota Terbatas. Wujudkan generasi cerdas Bermata Hati.</p>
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                      Jadilah bagian dari keluarga besar SMP Taman Harapan Bekasi. Di sini, kecerdasan akademis diasah seimbang dengan kematangan spiritual nurani.
                    </p>
                  </div>

                  {/* Right elements: buttons */}
                  <div className="space-y-4 shrink-0 w-full lg:w-auto text-left lg:text-right">
                    <a
                      href={PPDB_FORM_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full lg:w-auto group flex items-center justify-center space-x-2 bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold px-8 py-4 rounded-xl transition-all shadow-lg cursor-pointer text-sm"
                      id="cta-get-started-btn"
                    >
                      <span>Daftar Formulir Online</span>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </a>
                    <div className="flex items-center justify-center lg:justify-start space-x-2 text-slate-400 text-xs">
                      <Check className="w-4 h-4 text-amber-400" />
                      <span>Pelayanan Administrasi OSIS Digital</span>
                    </div>
                  </div>

                </div>
              </div>
            </section>

            {/* Corporate/School footer section */}
            <footer className="bg-[#050e1b] text-slate-400 py-16 border-t border-slate-800">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-12 gap-8 text-left">
                
                {/* Column 1: School Identity */}
                <div className="md:col-span-5 space-y-4">
                  <div className="flex items-center space-x-2.5">
                    <div className="bg-white p-1 rounded-lg flex items-center justify-center">
                      <SchoolLogo className="w-7 h-7" />
                    </div>
                    <span className="text-base font-black text-white tracking-tight">SMP TAMAN HARAPAN</span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-400 max-w-sm">
                    {settings.address}
                  </p>
                  <p className="text-[11px] font-extrabold text-amber-400 uppercase tracking-widest leading-none">
                    Slogan Resmi: "Bermata Hati"
                  </p>
                  
                  {/* Google Maps Iframe */}
                  <div className="w-full max-w-sm pt-2 space-y-1.5">
                    <iframe
                      src="https://www.google.com/maps?q=-6.1791749,106.992926&z=17&output=embed"
                      width="100%"
                      height="150"
                      style={{ border: 0 }}
                      allowFullScreen={true}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      className="rounded-xl border border-slate-800"
                    />
                    <a
                      href="https://maps.app.goo.gl/is6FyLkXnzRMfATN7"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block text-[11px] text-amber-400 hover:underline"
                    >
                      Buka di Google Maps →
                    </a>
                  </div>
                </div>

                {/* Column 2: Quick Navigation */}
                <div className="md:col-span-3 space-y-3">
                  <h4 className="text-xs font-extrabold uppercase text-white tracking-wider">Navigasi Cepat</h4>
                  <ul className="space-y-2 text-xs font-semibold">
                    {NAV_ITEMS.map((link) => (
                      <li key={link.id}>
                        <button 
                          onClick={() => {
                            const el = document.getElementById(link.id);
                            if (el) el.scrollIntoView({ behavior: 'smooth' });
                          }} 
                          className="hover:text-amber-400 transition-colors cursor-pointer text-slate-400"
                        >
                          {link.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Column 3: Contact details */}
                <div className="md:col-span-4 space-y-4">
                  <h4 className="text-xs font-extrabold uppercase text-white tracking-wider">Kontak & Hubungi Kami</h4>
                  <div className="space-y-3 text-xs text-slate-400">
                    <div className="flex items-center space-x-2">
                      <Globe className="w-4 h-4 text-amber-400 shrink-0" />
                      <a href={settings.website} target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-amber-400 transition-colors">
                        Website Resmi Tamhar
                      </a>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>{settings.phone} / WA: </span>
                      <a
                        href={formatWhatsAppUrl(settings.whatsapp)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-amber-400 hover:underline transition-colors"
                      >
                        {settings.whatsapp}
                      </a>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Globe className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Instagram: </span>
                      <a
                        href={resolveInstagramUrl(settings.instagram)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-amber-400 hover:underline transition-colors"
                      >
                        {instagramHandle(settings.instagram)}
                      </a>
                    </div>
                  </div>
                  
                  {/* Social links */}
                  <div className="pt-2 flex space-x-3">
                    <div
                      className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-amber-400/40"
                      title="Link Facebook belum diisi"
                    >
                      <span className="text-xs font-black">FB</span>
                    </div>
                    <a
                      href={resolveInstagramUrl(settings.instagram)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-amber-400 cursor-pointer hover:bg-slate-850 transition-colors"
                    >
                      <span className="text-xs font-black">IG</span>
                    </a>
                    <a
                      href="https://www.youtube.com/@smptamhar01channel"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-amber-400 cursor-pointer hover:bg-slate-850 transition-colors"
                    >
                      <span className="text-xs font-black">YT</span>
                    </a>
                  </div>
                </div>

              </div>

              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-8 border-t border-slate-800/60 text-center text-xs text-slate-500 space-y-1.5">
                <p>© 2026 SMP TAMAN HARAPAN BEKASI. Slogan Resmi: <strong>"Bermata Hati"</strong>. Hak Cipta Dilindungi.</p>
                <p className="text-[11px] text-slate-600">Dibuat oleh <span className="text-amber-400 font-semibold">Tristian Novansyah</span></p>
              </div>
            </footer>

          </motion.div>
        )}
      </AnimatePresence>

      {/* LOGIN & SIGNUP DIALOG POPUP MODAL */}
      <AnimatePresence>
        {isAuthModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-[#0b1d33] border border-slate-800 rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl text-left relative overflow-hidden text-slate-100"
              id="auth-modal"
            >
              {/* Close Button */}
              <button
                onClick={() => setIsAuthModalOpen(false)}
                className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer border border-transparent"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-6">
                
                {/* Modal Title */}
                <div className="space-y-1 text-center">
                  <div className="bg-white w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg mx-auto mb-3 p-1">
                    <SchoolLogo className="w-10 h-10" />
                  </div>
                  <h3 className="text-xl font-extrabold text-white tracking-tight">
                    {authMode === 'login' ? 'Masuk Portal Login' : 'Form Minat Pendaftaran PPDB'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {authMode === 'login' 
                      ? 'Kelola artikel, dokumentasi, kas, denda, dan data sekolah.' 
                      : 'Isi formulir online minat sekolah baru secara langsung.'}
                  </p>
                </div>

                {/* Form */}
                {authMode === 'login' ? (
                  /* LOGIN FORM */
                  <form onSubmit={handleAuthSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">ID Pengguna / Username ERP</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          required
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          placeholder="e.g. bendahara.osis atau superadmin"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-amber-400 font-medium text-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Kata Sandi</label>
                        <button type="button" onClick={handleForgotPassword} className="text-xs font-bold text-amber-400 hover:underline">Lupa Sandi?</button>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                        <input
                          type="password"
                          required
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-amber-400 font-medium text-white"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-amber-400 hover:bg-amber-350 text-slate-950 font-bold py-3.5 rounded-xl text-sm transition-all shadow-md hover:shadow-lg text-center cursor-pointer"
                    >
                      Masuk & Buka Dashboard ERP
                    </button>
                  </form>
                ) : (
                  /* PPDB ONLINE FORM IN MODAL */
                  <form onSubmit={handlePpdbInterestSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Nama Lengkap Calon Siswa</label>
                      <input
                        type="text"
                        required
                        value={ppdbStudentName}
                        onChange={(e) => setPpdbStudentName(e.target.value)}
                        placeholder="e.g. Ahmad Syuhada"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-400 font-medium text-white"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Nomor WhatsApp Wali</label>
                      <input
                        type="text"
                        required
                        value={ppdbParentPhone}
                        onChange={(e) => setPpdbParentPhone(e.target.value)}
                        placeholder="e.g. 0812XXXXXXXX"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-400 font-medium text-white"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Rencana Masuk</label>
                      <select
                        value={ppdbGrade}
                        onChange={(e) => setPpdbGrade(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-400 font-medium text-slate-300"
                      >
                        <option value="7">Kelas VII (7) SMP</option>
                        <option value="8">Pindahan Kelas VIII (8)</option>
                        <option value="9">Pindahan Kelas IX (9)</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-amber-400 hover:bg-amber-350 text-slate-950 font-bold py-3.5 rounded-xl text-sm transition-all text-center cursor-pointer"
                    >
                      Kirim Minat Sekarang
                    </button>
                  </form>
                )}

                {/* Switch Modes */}
                <div className="text-center pt-2">
                  <p className="text-xs text-slate-400 font-semibold">
                    {authMode === 'login' ? "Ingin mendaftarkan murid baru?" : 'Sudah memiliki akun?'}
                    {authMode === 'login' ? (
                      <a
                        href="https://online.tamhar.sch.id/ticket/#beli"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-amber-400 hover:underline font-bold ml-1.5 cursor-pointer"
                      >
                        PPDB Formulir Online
                      </a>
                    ) : (
                      <button
                        onClick={() => setAuthMode('login')}
                        className="text-amber-400 hover:underline font-bold ml-1.5 cursor-pointer"
                      >
                        Portal Login
                      </button>
                    )}
                  </p>
                </div>



              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FORCE CHANGE PASSWORD DIALOG MODAL */}
      <AnimatePresence>
        {isPasswordChangeModalOpen && (
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
              className="bg-[#0b1d33] border border-rose-500/40 rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl text-left relative overflow-hidden text-slate-100"
            >
              <div className="space-y-5">
                <div className="bg-rose-500/10 text-rose-400 w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg mx-auto mb-3 border border-rose-500/20">
                  <LockKeyhole className="w-6 h-6 animate-pulse" />
                </div>
                <div className="space-y-1.5 text-center">
                  <h3 className="text-lg font-extrabold text-white tracking-tight">
                    Ganti Password Pertama Anda
                  </h3>
                  <p className="text-xs text-slate-400">
                    Demi keamanan akun yang dibuat oleh Super Admin, Anda diwajibkan mengganti kata sandi default sebelum mengakses sistem ERP OSIS.
                  </p>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl space-y-1 text-xs">
                  <p className="text-slate-300 font-bold">Identitas Akun:</p>
                  <p className="text-slate-400">Nama: <span className="text-white font-extrabold">{passwordChangeUser?.name}</span></p>
                  <p className="text-slate-400">Email: <span className="text-white font-mono">{passwordChangeUser?.email}</span></p>
                  <p className="text-slate-400">Hak Akses: <span className="text-amber-400 font-extrabold uppercase">{passwordChangeUser?.role}</span></p>
                </div>

                <form onSubmit={handlePasswordChangeSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Kata Sandi Baru</label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min. 8 karakter, ada huruf besar & angka"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 font-semibold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Konfirmasi Kata Sandi Baru</label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ketik ulang kata sandi baru"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 font-semibold"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-rose-600 hover:bg-rose-500 text-white font-extrabold py-3 rounded-xl text-xs tracking-wider cursor-pointer shadow shadow-rose-600/30 transition-colors uppercase"
                  >
                    Simpan Password & Portal Login
                  </button>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dirender (jadi lazy chunk-nya baru diunduh) HANYA untuk sesi Super
          Admin yang sudah login — bukan cuma dikontrol lewat prop `enabled`,
          supaya pengunjung publik/staf lain sama sekali tidak ikut menarik
          chunk AnnotationMode ini. */}
      {isLoggedIn && currentUser?.role === 'Super Admin' && (
        <Suspense fallback={null}>
          <AnnotationMode
            enabled
            authorName={currentUser?.name ?? 'Super Admin'}
            annotations={annotations}
            setAnnotations={setAnnotations}
          />
        </Suspense>
      )}

    </div>
  );
}
