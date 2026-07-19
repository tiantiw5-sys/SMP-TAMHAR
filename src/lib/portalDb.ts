/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  INITIAL_ARTICLES,
  INITIAL_GALLERY,
  INITIAL_TEACHERS,
  INITIAL_UNIFORMS,
  UNIFORMS_DATA_VERSION,
  INITIAL_CASH_TRANSACTIONS,
  INITIAL_FINE_TRANSACTIONS,
  INITIAL_NOTIFICATIONS,
  INITIAL_LOGS,
  INITIAL_SETTINGS,
  INITIAL_CLASS_ROSTER,
  INITIAL_TEACHING_SCHEDULE,
} from '../data';
import {
  Article,
  GalleryItem,
  Teacher,
  Uniform,
  CashTransaction,
  FineTransaction,
  NotificationItem,
  ActivityLog,
  SystemSettings,
  Student,
  StudentAttendanceRecord,
  ClassRosterEntry,
  TeachingScheduleDay,
  TeacherAttendanceRecord,
} from '../types';
import { INITIAL_STUDENTS } from '../data/initialStudents';
import { getSupabase, isSupabaseEnabled } from './supabase';
import { todayDateKey } from './studentAttendance';

export type PortalCollectionKey =
  | 'articles'
  | 'gallery'
  | 'teachers'
  | 'uniforms'
  | 'notifications'
  | 'settings'
  | 'attendance'
  | 'students'
  | 'visits'
  | 'annotations'
  | 'classRoster'
  | 'teachingSchedule';

export interface AnnotationItem {
  id: string;
  note: string;
  pageLabel: string;
  elementLabel: string;
  imageDataUrl?: string;
  createdAt: string;
  status: 'open' | 'done';
  authorName: string;
}

export type AttendanceMap = {
  [teacherId: string]: { [day: string]: 'Hadir' | 'Izin' | 'Sakit' | 'Alpa' };
};

export interface UniformsPayload {
  version: number;
  items: Uniform[];
}

// Kunjungan landing page, satu angka per tanggal (bukan satu total tunggal
// lagi) — dipakai untuk tab "Rekap Kunjungan" di dashboard.
export type VisitsByDay = Record<string, number>;

export interface PortalData {
  articles: Article[];
  gallery: GalleryItem[];
  teachers: Teacher[];
  uniforms: Uniform[];
  cashTransactions: CashTransaction[];
  fineTransactions: FineTransaction[];
  notifications: NotificationItem[];
  logs: ActivityLog[];
  settings: SystemSettings;
  attendance: AttendanceMap;
  students: Student[];
  studentAttendance: StudentAttendanceRecord[];
  visitsByDay: VisitsByDay;
  annotations: AnnotationItem[];
  classRoster: ClassRosterEntry[];
  teachingSchedule: TeachingScheduleDay[];
  teacherAttendanceLog: TeacherAttendanceRecord[];
}

const LOCAL_KEYS: Record<PortalCollectionKey, string> = {
  articles: 'smptamhar_articles',
  gallery: 'smptamhar_gallery',
  teachers: 'smptamhar_teachers',
  uniforms: 'smptamhar_uniforms',
  notifications: 'smptamhar_notifications',
  settings: 'smptamhar_settings',
  attendance: 'smptamhar_attendance',
  students: 'smptamhar_students',
  visits: 'smptamhar_visits',
  annotations: 'smptamhar_annotations',
  classRoster: 'smptamhar_class_roster',
  teachingSchedule: 'smptamhar_teaching_schedule',
};

// studentAttendance sekarang punya tabel Postgres sendiri (student_attendance,
// bukan lagi blob di portal_collections) — lihat fetchStudentAttendance/
// upsertStudentAttendance/deleteStudentAttendanceForDate di bawah. Key cache
// lokalnya berdiri sendiri (di luar LOCAL_KEYS) karena tidak lagi lewat jalur
// generik mapRowToPortalSlice/portalPayloadFromData.
const STUDENT_ATTENDANCE_LOCAL_KEY = 'smptamhar_student_attendance';

// logs punya perlakuan sama seperti studentAttendance di atas — tabel
// Postgres sendiri (activity_logs), key cache lokal berdiri sendiri di luar
// LOCAL_KEYS/mapRowToPortalSlice/portalPayloadFromData generik.
const ACTIVITY_LOGS_LOCAL_KEY = 'smptamhar_activity_logs';

// cash/fines sama juga — tabel Postgres sendiri (cash_transactions,
// fine_transactions), lihat migrate_cash_fines_tables.sql.
const CASH_TRANSACTIONS_LOCAL_KEY = 'smptamhar_cash_transactions';
const FINE_TRANSACTIONS_LOCAL_KEY = 'smptamhar_fine_transactions';

// teacherAttendanceLog sama juga — tabel Postgres sendiri (teacher_attendance),
// lihat migrate_teacher_attendance_table.sql.
const TEACHER_ATTENDANCE_LOCAL_KEY = 'smptamhar_teacher_attendance';

// Cache singkat KHUSUS pengunjung yang belum login — supaya kunjungan
// berulang dalam 5 menit tidak menarik ulang seluruh data dari server
// (mengurangi beban egress Supabase). Sengaja timestamp-nya cuma ditulis
// (dan langsung dihapus lagi begitu ada fetch saat SUDAH login) supaya
// tidak ada risiko data sensitif dari sesi login sempat "nyangkut" lalu
// terpakai ulang setelah logout di browser yang sama.
const ANON_CACHE_TIMESTAMP_KEY = 'smptamhar_anon_cache_at';
const ANON_CACHE_TTL_MS = 5 * 60 * 1000;

const SAVE_DEBOUNCE_MS = 800;
const pendingTimers = new Map<PortalCollectionKey, ReturnType<typeof setTimeout>>();
const pendingPayloads = new Map<PortalCollectionKey, unknown>();

const randomInitialVisits = (): number =>
  Math.floor(Math.random() * 5000) + 12450;

const readLocalJson = <T>(key: string, fallback: T): T => {
  const saved = localStorage.getItem(key);
  if (!saved) return fallback;
  try {
    return JSON.parse(saved) as T;
  } catch {
    return fallback;
  }
};

const readLocalUniforms = (): Uniform[] => {
  const version = localStorage.getItem('smptamhar_uniforms_version');
  const saved = localStorage.getItem(LOCAL_KEYS.uniforms);
  if (version === String(UNIFORMS_DATA_VERSION) && saved) {
    return readLocalJson<Uniform[]>(LOCAL_KEYS.uniforms, INITIAL_UNIFORMS);
  }
  return INITIAL_UNIFORMS;
};

const readLocalVisitsByDay = (): VisitsByDay => {
  const saved = readLocalJson<VisitsByDay | null>(LOCAL_KEYS.visits, null);
  if (saved && typeof saved === 'object') return saved;
  return { [todayDateKey()]: randomInitialVisits() };
};

export const getDefaultPortalData = (): PortalData => ({
  articles: INITIAL_ARTICLES,
  gallery: INITIAL_GALLERY,
  teachers: INITIAL_TEACHERS,
  uniforms: INITIAL_UNIFORMS,
  cashTransactions: INITIAL_CASH_TRANSACTIONS,
  fineTransactions: INITIAL_FINE_TRANSACTIONS,
  notifications: INITIAL_NOTIFICATIONS,
  logs: INITIAL_LOGS,
  settings: INITIAL_SETTINGS,
  attendance: {},
  students: INITIAL_STUDENTS as Student[],
  studentAttendance: [],
  visitsByDay: { [todayDateKey()]: randomInitialVisits() },
  annotations: [],
  classRoster: INITIAL_CLASS_ROSTER,
  teachingSchedule: INITIAL_TEACHING_SCHEDULE,
  teacherAttendanceLog: [],
});

export const loadPortalDataFromLocalStorage = (): PortalData => ({
  articles: readLocalJson(LOCAL_KEYS.articles, INITIAL_ARTICLES),
  gallery: readLocalJson(LOCAL_KEYS.gallery, INITIAL_GALLERY),
  teachers: readLocalJson(LOCAL_KEYS.teachers, INITIAL_TEACHERS),
  uniforms: readLocalUniforms(),
  cashTransactions: readLocalJson<CashTransaction[]>(CASH_TRANSACTIONS_LOCAL_KEY, INITIAL_CASH_TRANSACTIONS),
  fineTransactions: readLocalJson<FineTransaction[]>(FINE_TRANSACTIONS_LOCAL_KEY, INITIAL_FINE_TRANSACTIONS),
  notifications: readLocalJson(LOCAL_KEYS.notifications, INITIAL_NOTIFICATIONS),
  logs: readLocalJson<ActivityLog[]>(ACTIVITY_LOGS_LOCAL_KEY, INITIAL_LOGS),
  settings: readLocalJson(LOCAL_KEYS.settings, INITIAL_SETTINGS),
  attendance: readLocalJson<AttendanceMap>(LOCAL_KEYS.attendance, {}),
  students: readLocalJson<Student[]>(LOCAL_KEYS.students, INITIAL_STUDENTS as Student[]),
  studentAttendance: readLocalJson<StudentAttendanceRecord[]>(STUDENT_ATTENDANCE_LOCAL_KEY, []),
  visitsByDay: readLocalVisitsByDay(),
  annotations: readLocalJson<AnnotationItem[]>(LOCAL_KEYS.annotations, []),
  classRoster: readLocalJson<ClassRosterEntry[]>(LOCAL_KEYS.classRoster, INITIAL_CLASS_ROSTER),
  teachingSchedule: readLocalJson<TeachingScheduleDay[]>(LOCAL_KEYS.teachingSchedule, INITIAL_TEACHING_SCHEDULE),
  teacherAttendanceLog: readLocalJson<TeacherAttendanceRecord[]>(TEACHER_ATTENDANCE_LOCAL_KEY, []),
});

export const cachePortalDataToLocalStorage = (data: PortalData): void => {
  localStorage.setItem(LOCAL_KEYS.articles, JSON.stringify(data.articles));
  localStorage.setItem(LOCAL_KEYS.gallery, JSON.stringify(data.gallery));
  localStorage.setItem(LOCAL_KEYS.teachers, JSON.stringify(data.teachers));
  localStorage.setItem(LOCAL_KEYS.uniforms, JSON.stringify(data.uniforms));
  localStorage.setItem('smptamhar_uniforms_version', String(UNIFORMS_DATA_VERSION));
  localStorage.setItem(CASH_TRANSACTIONS_LOCAL_KEY, JSON.stringify(data.cashTransactions));
  localStorage.setItem(FINE_TRANSACTIONS_LOCAL_KEY, JSON.stringify(data.fineTransactions));
  localStorage.setItem(LOCAL_KEYS.notifications, JSON.stringify(data.notifications));
  localStorage.setItem(ACTIVITY_LOGS_LOCAL_KEY, JSON.stringify(data.logs));
  localStorage.setItem(LOCAL_KEYS.settings, JSON.stringify(data.settings));
  localStorage.setItem(LOCAL_KEYS.attendance, JSON.stringify(data.attendance));
  localStorage.setItem(LOCAL_KEYS.students, JSON.stringify(data.students));
  localStorage.setItem(STUDENT_ATTENDANCE_LOCAL_KEY, JSON.stringify(data.studentAttendance));
  localStorage.setItem(LOCAL_KEYS.visits, JSON.stringify(data.visitsByDay));
  localStorage.setItem(LOCAL_KEYS.annotations, JSON.stringify(data.annotations));
  localStorage.setItem(LOCAL_KEYS.classRoster, JSON.stringify(data.classRoster));
  localStorage.setItem(LOCAL_KEYS.teachingSchedule, JSON.stringify(data.teachingSchedule));
  localStorage.setItem(TEACHER_ATTENDANCE_LOCAL_KEY, JSON.stringify(data.teacherAttendanceLog));
};

const defaultsByKey = (): Record<PortalCollectionKey, unknown> => {
  const defaults = getDefaultPortalData();
  return {
    articles: defaults.articles,
    gallery: defaults.gallery,
    teachers: defaults.teachers,
    uniforms: defaults.uniforms,
    notifications: defaults.notifications,
    settings: defaults.settings,
    attendance: defaults.attendance,
    students: defaults.students,
    visits: defaults.visitsByDay,
    annotations: defaults.annotations,
    classRoster: defaults.classRoster,
    teachingSchedule: defaults.teachingSchedule,
  };
};

// Data denda lama menyimpan status lunas/belum lunas dengan menyisipkan tag
// "[LUNAS]"/"[BELUM LUNAS]" ke teks deskripsi (tidak ada kolom status
// terpisah) — cara ini rapuh: data denda yang dibuat sebelum konvensi ini
// ada (termasuk data contoh awal) tidak punya tag sama sekali, jadi selalu
// dianggap "tidak lunas maupun lunas" alias tidak pernah terhitung di Ringkasan
// Kas Denda mana pun. Dinormalisasi di sini setiap data dimuat: kolom
// `status` jadi sumber kebenaran, tag lama (kalau ada) dibaca sekali lalu
// dibersihkan dari teks deskripsi.
const normalizeFineTransaction = (raw: FineTransaction): FineTransaction => {
  const desc = String(raw.description ?? '');
  let status = raw.status;
  if (status !== 'Lunas' && status !== 'Belum Lunas') {
    status = /\[BELUM LUNAS\]/i.test(desc) ? 'Belum Lunas' : /\[LUNAS\]/i.test(desc) ? 'Lunas' : 'Belum Lunas';
  }
  const cleanDescription = desc.replace(/\s*\[BELUM LUNAS\]/gi, '').replace(/\s*\[LUNAS\]/gi, '').trim();
  return { ...raw, description: cleanDescription, status };
};

const parseUniformsPayload = (payload: unknown): Uniform[] => {
  if (Array.isArray(payload)) return payload as Uniform[];
  const wrapped = payload as Partial<UniformsPayload> | null;
  if (wrapped?.version === UNIFORMS_DATA_VERSION && Array.isArray(wrapped.items)) {
    return wrapped.items;
  }
  return INITIAL_UNIFORMS;
};

const parseVisitsByDay = (payload: unknown): VisitsByDay => {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const obj = payload as Record<string, unknown>;
    // Format lama {count: N} (total tunggal) — dipetakan ke hari ini sebagai
    // fallback kalau migrasi SQL belum sempat jalan.
    if (typeof obj.count === 'number' && Object.keys(obj).length === 1) {
      return { [todayDateKey()]: obj.count };
    }
    const result: VisitsByDay = {};
    for (const [day, val] of Object.entries(obj)) {
      if (typeof val === 'number' && Number.isFinite(val)) result[day] = val;
    }
    return result;
  }
  return { [todayDateKey()]: randomInitialVisits() };
};

export const mapRowToPortalSlice = (
  key: PortalCollectionKey,
  payload: unknown,
  data: PortalData
): void => {
  switch (key) {
    case 'articles':
      data.articles = Array.isArray(payload) ? (payload as Article[]) : INITIAL_ARTICLES;
      break;
    case 'gallery':
      data.gallery = Array.isArray(payload) ? (payload as GalleryItem[]) : INITIAL_GALLERY;
      break;
    case 'teachers':
      data.teachers = Array.isArray(payload) ? (payload as Teacher[]) : INITIAL_TEACHERS;
      break;
    case 'uniforms':
      data.uniforms = parseUniformsPayload(payload);
      break;
    case 'notifications':
      data.notifications = Array.isArray(payload)
        ? (payload as NotificationItem[])
        : INITIAL_NOTIFICATIONS;
      break;
    case 'settings':
      data.settings = (payload as SystemSettings) ?? INITIAL_SETTINGS;
      break;
    case 'attendance':
      data.attendance =
        payload && typeof payload === 'object' && !Array.isArray(payload)
          ? (payload as AttendanceMap)
          : {};
      break;
    case 'students':
      data.students = Array.isArray(payload) ? (payload as Student[]) : (INITIAL_STUDENTS as Student[]);
      break;
    case 'visits':
      data.visitsByDay = parseVisitsByDay(payload);
      break;
    case 'annotations':
      data.annotations = Array.isArray(payload) ? (payload as AnnotationItem[]) : [];
      break;
    case 'classRoster':
      data.classRoster = Array.isArray(payload) ? (payload as ClassRosterEntry[]) : INITIAL_CLASS_ROSTER;
      break;
    case 'teachingSchedule':
      data.teachingSchedule = Array.isArray(payload) ? (payload as TeachingScheduleDay[]) : INITIAL_TEACHING_SCHEDULE;
      break;
  }
};

const upsertCollection = async (key: PortalCollectionKey, payload: unknown): Promise<void> => {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase.from('portal_collections').upsert(
    {
      collection_key: key,
      payload: payload as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'collection_key' }
  );

  if (error) {
    console.error(`[portalDb] Gagal menyimpan ${key}:`, error.message);
  }
};

// Sama seperti upsertCollection (ganti seluruh isi koleksi), tapi diekspor
// dan langsung dieksekusi (bukan didebounce) untuk aksi ADMIN yang memang
// disengaja mengganti seluruh daftar sekaligus — misalnya tombol "Reset
// Absensi". Beda dengan appendToCollection/updateCollectionItem yang dipakai
// untuk aksi rutin per-item, ini hanya untuk aksi sekali-klik yang jarang
// terjadi & tidak butuh proteksi tabrakan per-item.
export const overwriteCollection = async (
  key: PortalCollectionKey,
  payload: unknown
): Promise<boolean> => {
  const supabase = getSupabase();
  if (!supabase) return false;

  const { error } = await supabase.from('portal_collections').upsert(
    {
      collection_key: key,
      payload: payload as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'collection_key' }
  );

  if (error) {
    console.error(`[portalDb] Gagal reset ${key}:`, error.message);
    return false;
  }
  return true;
};

// Ambil ulang payload SATU koleksi langsung dari server — dipakai untuk
// tombol "Refresh" manual (mis. panel Kehadiran Murid), supaya ada jalan
// pasti-segar di luar sinkronisasi real-time otomatis.
export const fetchCollectionRow = async (key: PortalCollectionKey): Promise<unknown> => {
  const supabase = getSupabase();
  if (!supabase) return undefined;

  const { data, error } = await supabase
    .from('portal_collections')
    .select('payload')
    .eq('collection_key', key)
    .maybeSingle();

  if (error || !data) {
    console.error(`[portalDb] Gagal refresh ${key}:`, error?.message);
    return undefined;
  }
  return data.payload;
};

// Nambah ATAU menimpa satu item (dicari lewat field id) dalam satu langkah
// atomik di server — dipakai untuk absensi murid (scan & manual), supaya
// keputusan "sudah ada, timpa" vs "baru, tambahkan" diputuskan oleh database
// dalam satu transaksi, bukan ditebak duluan di browser (yang rawan celah
// kalau ada 2 scan/aksi untuk murid+tanggal yang sama nyaris bersamaan).
export const upsertItemById = async <T,>(
  key: PortalCollectionKey,
  item: T
): Promise<unknown[] | null> => {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc('upsert_item_by_id', {
    p_key: key,
    p_item: item as Record<string, unknown>,
  });

  if (error) {
    console.error(`[portalDb] Gagal upsert item di ${key}:`, error.message);
    return null;
  }

  return data as unknown[];
};

// Data anak milik akun Orang Tua yang login, disaring DI SERVER lewat RPC
// (bukan koleksi mentah) — lihat get_my_child()/get_my_child_attendance()
// di supabase/schema.sql dan PRD-PORTAL-ORANG-TUA.md.
export const getMyChild = async (): Promise<Student | null> => {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc('get_my_child');

  if (error) {
    console.error('[portalDb] Gagal memuat data anak:', error.message);
    return null;
  }

  return (data as Student) ?? null;
};

export const getMyChildAttendance = async (): Promise<StudentAttendanceRecord[]> => {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase.rpc('get_my_child_attendance');

  if (error) {
    console.error('[portalDb] Gagal memuat absensi anak:', error.message);
    return [];
  }

  return (data as StudentAttendanceRecord[]) ?? [];
};

// Absensi guru pada 1 tanggal (default hari ini) — lewat RPC
// get_teacher_attendance_for_date supaya role 'Orang Tua' (yang tidak punya
// akses baca langsung ke tabel teacher_attendance) tetap bisa lihat siapa
// guru yang hadir/tidak hari itu, dipakai Portal Orang Tua di jadwal
// pelajaran anaknya.
export const getTeacherAttendanceForDate = async (
  date: string = todayDateKey()
): Promise<TeacherAttendanceRecord[]> => {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase.rpc('get_teacher_attendance_for_date', { p_date: date });

  if (error) {
    console.error('[portalDb] Gagal memuat absensi guru:', error.message);
    return [];
  }

  return (data as TeacherAttendanceRecord[]) ?? [];
};

// ============================================================
// student_attendance — tabel normal (1 baris = 1 catatan absensi murid),
// menggantikan collection_key='studentAttendance' yang dulu 1 blob JSONB
// raksasa. Lihat supabase/migrate_student_attendance_table.sql. Realtime
// untuk tabel ini sekarang cuma broadcast baris yang berubah, bukan seluruh
// riwayat — itu penyebab utama lonjakan egress yang diperbaiki lewat migrasi
// ini.
// ============================================================

const rowToStudentAttendanceRecord = (row: {
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
}): StudentAttendanceRecord => ({
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
});

export const fetchStudentAttendance = async (): Promise<StudentAttendanceRecord[]> => {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('student_attendance')
    .select('id, student_id, student_name, class_name, date, status, check_in_at, source, recorded_by, note');

  if (error) {
    console.error('[portalDb] Gagal memuat absensi murid:', error.message);
    return [];
  }

  return (data ?? []).map(rowToStudentAttendanceRecord);
};

// Insert-atau-update SATU baris absensi (dicocokkan lewat murid+tanggal) —
// keputusan "timpa" vs "baru" diputuskan DATABASE dalam satu transaksi,
// sama seperti upsert_item_by_id lama, tapi sekarang cuma 1 baris yang
// dikirim balik & di-broadcast Realtime, bukan seluruh riwayat.
export const upsertStudentAttendance = async (
  record: StudentAttendanceRecord
): Promise<StudentAttendanceRecord | null> => {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc('upsert_student_attendance', { p_record: record });

  if (error) {
    console.error('[portalDb] Gagal menyimpan absensi murid:', error.message);
    return null;
  }

  return data as StudentAttendanceRecord;
};

// Hapus seluruh catatan absensi murid untuk SATU tanggal — dipakai tombol
// "Hapus riwayat absensi tanggal X" (dulu overwriteCollection seluruh blob).
export const deleteStudentAttendanceForDate = async (date: string): Promise<boolean> => {
  const supabase = getSupabase();
  if (!supabase) return false;

  const { error } = await supabase.rpc('delete_student_attendance_for_date', { p_date: date });

  if (error) {
    console.error('[portalDb] Gagal menghapus absensi murid tanggal ini:', error.message);
    return false;
  }

  return true;
};

// ============================================================
// teacher_attendance — tabel normal (1 baris = 1 catatan absensi guru),
// menggantikan collection_key='teacherAttendanceLog' yang dulu 1 blob JSONB
// raksasa. Lihat supabase/migrate_teacher_attendance_table.sql. Pola sama
// persis dengan student_attendance di atas — ditambahkan belakangan karena
// fitur scan barcode QR guru membuat koleksi ini jadi jauh lebih sering
// ditulis (dulu cuma isian manual sesekali oleh guru piket).
// ============================================================

const rowToTeacherAttendanceRecord = (row: {
  id: string;
  teacher_id: string;
  teacher_name: string;
  date: string;
  status: TeacherAttendanceRecord['status'];
  recorded_by: string | null;
}): TeacherAttendanceRecord => ({
  id: row.id,
  teacherId: row.teacher_id,
  teacherName: row.teacher_name,
  date: row.date,
  status: row.status,
  recordedBy: row.recorded_by ?? undefined,
});

export const fetchTeacherAttendance = async (): Promise<TeacherAttendanceRecord[]> => {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('teacher_attendance')
    .select('id, teacher_id, teacher_name, date, status, recorded_by');

  if (error) {
    console.error('[portalDb] Gagal memuat absensi guru:', error.message);
    return [];
  }

  return (data ?? []).map(rowToTeacherAttendanceRecord);
};

// Insert-atau-update SATU baris absensi guru (dicocokkan lewat guru+tanggal)
// — sama seperti upsertStudentAttendance, cuma 1 baris yang dikirim balik &
// di-broadcast Realtime, bukan seluruh riwayat.
export const upsertTeacherAttendance = async (
  record: TeacherAttendanceRecord
): Promise<TeacherAttendanceRecord | null> => {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc('upsert_teacher_attendance', { p_record: record });

  if (error) {
    console.error('[portalDb] Gagal menyimpan absensi guru:', error.message);
    return null;
  }

  return data as TeacherAttendanceRecord;
};

// Hapus seluruh catatan absensi guru untuk SATU tanggal — dipakai tombol
// "Kosongkan Hari Ini" di tab Guru Piket.
export const deleteTeacherAttendanceForDate = async (date: string): Promise<boolean> => {
  const supabase = getSupabase();
  if (!supabase) return false;

  const { error } = await supabase.rpc('delete_teacher_attendance_for_date', { p_date: date });

  if (error) {
    console.error('[portalDb] Gagal menghapus absensi guru tanggal ini:', error.message);
    return false;
  }

  return true;
};

const rowToActivityLog = (row: {
  id: string;
  user_name: string;
  role: string;
  action: ActivityLog['action'];
  details: string;
  client_timestamp: string;
}): ActivityLog => ({
  id: row.id,
  user: row.user_name,
  role: row.role,
  action: row.action,
  details: row.details,
  timestamp: row.client_timestamp,
});

export const fetchActivityLogs = async (): Promise<ActivityLog[]> => {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('activity_logs')
    .select('id, user_name, role, action, details, client_timestamp')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[portalDb] Gagal memuat log aktivitas:', error.message);
    return [];
  }

  return (data ?? []).map(rowToActivityLog);
};

// Ganti appendToCollection('logs', ...) — INSERT satu baris lewat RPC
// (append_activity_log, lihat migrate_activity_logs_table.sql), hasilnya
// cuma item baru ini saja (bukan seluruh riwayat log).
export const appendActivityLog = async (log: ActivityLog): Promise<ActivityLog | null> => {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc('append_activity_log', { p_log: log });

  if (error) {
    console.error('[portalDb] Gagal mencatat log aktivitas:', error.message);
    return null;
  }

  return data as ActivityLog;
};

// logs bersifat append-only (tidak pernah diedit/dihapus per-item) — cukup
// tambahkan di depan kalau id-nya belum ada, dipakai baik untuk update
// optimistik lokal maupun saat menerima event Realtime INSERT dari sesi lain.
export const mergeActivityLog = (logs: ActivityLog[], record: ActivityLog): ActivityLog[] => {
  if (logs.some((l) => l.id === record.id)) return logs;
  return [record, ...logs];
};

// Helper generik untuk koleksi ber-id yang boleh diedit (beda dari logs yang
// append-only): item baru disisipkan di DEPAN (konsisten dengan urutan lama
// "terbaru duluan"), item yang sudah ada diganti di TEMPAT yang sama (tidak
// ikut pindah ke depan) — dipakai untuk cash/fines lewat Realtime maupun
// update optimistik lokal.
export const mergeById = <T extends { id: string }>(list: T[], item: T): T[] => {
  const idx = list.findIndex((x) => x.id === item.id);
  if (idx >= 0) {
    const copy = [...list];
    copy[idx] = item;
    return copy;
  }
  return [item, ...list];
};

export const removeById = <T extends { id: string }>(list: T[], id: string): T[] =>
  list.filter((x) => x.id !== id);

const rowToCashTransaction = (row: {
  id: string;
  type: CashTransaction['type'];
  amount: number;
  description: string;
  category: CashTransaction['category'];
  txn_date: string;
  author: string;
}): CashTransaction => ({
  id: row.id,
  type: row.type,
  amount: Number(row.amount),
  description: row.description,
  category: row.category,
  date: row.txn_date,
  author: row.author,
});

export const fetchCashTransactions = async (): Promise<CashTransaction[]> => {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('cash_transactions')
    .select('id, type, amount, description, category, txn_date, author')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[portalDb] Gagal memuat transaksi kas:', error.message);
    return [];
  }

  return (data ?? []).map(rowToCashTransaction);
};

// Ganti appendToCollection('cash', ...) DAN updateCollectionItem('cash', ...)
// sekaligus — satu RPC, insert-atau-update lewat ON CONFLICT(id) di database.
export const upsertCashTransaction = async (item: CashTransaction): Promise<CashTransaction | null> => {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc('upsert_cash_transaction', { p_item: item });

  if (error) {
    console.error('[portalDb] Gagal menyimpan transaksi kas:', error.message);
    return null;
  }

  return data as CashTransaction;
};

// Ganti deleteCollectionItem('cash', id).
export const deleteCashTransaction = async (id: string): Promise<boolean> => {
  const supabase = getSupabase();
  if (!supabase) return false;

  const { error } = await supabase.rpc('delete_cash_transaction', { p_id: id });

  if (error) {
    console.error('[portalDb] Gagal menghapus transaksi kas:', error.message);
    return false;
  }

  return true;
};

const rowToFineTransaction = (row: {
  id: string;
  type: FineTransaction['type'];
  amount: number;
  description: string;
  violator: string | null;
  category: FineTransaction['category'];
  txn_date: string;
  author: string;
  status: FineTransaction['status'];
}): FineTransaction => ({
  id: row.id,
  type: row.type,
  amount: Number(row.amount),
  description: row.description,
  violator: row.violator ?? undefined,
  category: row.category,
  date: row.txn_date,
  author: row.author,
  status: row.status,
});

export const fetchFineTransactions = async (): Promise<FineTransaction[]> => {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('fine_transactions')
    .select('id, type, amount, description, violator, category, txn_date, author, status')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[portalDb] Gagal memuat data denda:', error.message);
    return [];
  }

  return (data ?? []).map(rowToFineTransaction);
};

// Ganti appendToCollection('fines', ...) DAN updateCollectionItem('fines', ...)
// (termasuk handleToggleFinePaid yang cuma ganti status) — satu RPC yang sama.
export const upsertFineTransaction = async (item: FineTransaction): Promise<FineTransaction | null> => {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc('upsert_fine_transaction', { p_item: item });

  if (error) {
    console.error('[portalDb] Gagal menyimpan data denda:', error.message);
    return null;
  }

  return data as FineTransaction;
};

// Ganti deleteCollectionItem('fines', id).
export const deleteFineTransaction = async (id: string): Promise<boolean> => {
  const supabase = getSupabase();
  if (!supabase) return false;

  const { error } = await supabase.rpc('delete_fine_transaction', { p_id: id });

  if (error) {
    console.error('[portalDb] Gagal menghapus data denda:', error.message);
    return false;
  }

  return true;
};

// Naikkan hitungan kunjungan HARI INI secara atomik di server — dipanggil
// sekali per pemuatan landing page. Anon (tanpa login) boleh memanggil ini
// (lihat grant di schema.sql), tapi tidak bisa baca/ubah data lain lewat
// fungsi ini.
export const incrementDailyVisit = async (): Promise<VisitsByDay | null> => {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc('increment_daily_visit');

  if (error) {
    console.error('[portalDb] Gagal menaikkan hitungan kunjungan:', error.message);
    return null;
  }

  return data as VisitsByDay;
};

// Menambah satu item ke koleksi berbentuk daftar (artikel/galeri/kas/denda)
// secara atomik di database (lewat fungsi SQL append_to_collection) —
// dipakai untuk aksi "tambah data" supaya dua orang yang menyimpan
// bersamaan tidak saling menimpa tambahan satu sama lain (beda dengan
// upsertCollection/schedulePortalSave yang mengganti seluruh daftar dari
// salinan di memori browser, cocok untuk edit/hapus tapi rawan tabrakan
// kalau dipakai untuk tambah data saat banyak orang aktif bersamaan).
export const appendToCollection = async <T,>(
  key: PortalCollectionKey,
  item: T
): Promise<unknown[] | null> => {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc('append_to_collection', {
    p_key: key,
    p_item: item as Record<string, unknown>,
  });

  if (error) {
    console.error(`[portalDb] Gagal menambah item ke ${key}:`, error.message);
    return null;
  }

  return data as unknown[];
};

// Mengubah satu item yang sudah ada (dicari lewat id) secara atomik — dipakai
// untuk aksi "edit data" supaya dua orang yang mengedit item BERBEDA di
// koleksi yang sama pada waktu bersamaan tidak saling menimpa.
export const updateCollectionItem = async <T,>(
  key: PortalCollectionKey,
  itemId: string,
  item: T
): Promise<unknown[] | null> => {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc('update_collection_item', {
    p_key: key,
    p_item_id: itemId,
    p_item: item as Record<string, unknown>,
  });

  if (error) {
    console.error(`[portalDb] Gagal mengedit item di ${key}:`, error.message);
    return null;
  }

  return data as unknown[];
};

// Menghapus satu item (dicari lewat id) secara atomik — dipakai untuk aksi
// "hapus data" dengan alasan yang sama seperti updateCollectionItem di atas.
export const deleteCollectionItem = async (
  key: PortalCollectionKey,
  itemId: string
): Promise<unknown[] | null> => {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc('delete_collection_item', {
    p_key: key,
    p_item_id: itemId,
  });

  if (error) {
    console.error(`[portalDb] Gagal menghapus item di ${key}:`, error.message);
    return null;
  }

  return data as unknown[];
};

// Menyusun ulang urutan seluruh item di sebuah koleksi (dipakai untuk
// drag-drop reorder, mis. Dokumentasi Galeri) — atomik di server lewat
// reorder_collection, bukan mengirim ulang seluruh array dari salinan
// browser (sama alasannya dengan append/update/deleteCollectionItem di atas).
export const reorderCollection = async (
  key: PortalCollectionKey,
  orderedIds: string[]
): Promise<unknown[] | null> => {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc('reorder_collection', {
    p_key: key,
    p_ordered_ids: orderedIds,
  });

  if (error) {
    console.error(`[portalDb] Gagal menyusun ulang urutan ${key}:`, error.message);
    return null;
  }

  return data as unknown[];
};

export const flushPendingSaves = async (): Promise<void> => {
  const entries = Array.from(pendingPayloads.entries());
  for (const [key, timer] of pendingTimers.entries()) {
    clearTimeout(timer);
    pendingTimers.delete(key);
  }
  pendingPayloads.clear();

  await Promise.all(entries.map(([key, payload]) => upsertCollection(key, payload)));
};

export const schedulePortalSave = (key: PortalCollectionKey, payload: unknown): void => {
  if (!isSupabaseEnabled()) return;

  pendingPayloads.set(key, payload);
  const existing = pendingTimers.get(key);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(() => {
    pendingTimers.delete(key);
    const latest = pendingPayloads.get(key);
    pendingPayloads.delete(key);
    if (latest !== undefined) {
      void upsertCollection(key, latest);
    }
  }, SAVE_DEBOUNCE_MS);

  pendingTimers.set(key, timer);
};

export const loadPortalDataFromSupabase = async (opts?: { isLoggedIn?: boolean }): Promise<PortalData> => {
  const supabase = getSupabase();
  if (!supabase) return loadPortalDataFromLocalStorage();

  // Belum login + masih dalam 5 menit sejak fetch anon terakhir di browser
  // ini -> pakai cache lokal, jangan tarik ulang dari server.
  if (!opts?.isLoggedIn) {
    const cachedAt = Number(localStorage.getItem(ANON_CACHE_TIMESTAMP_KEY) || 0);
    if (cachedAt && Date.now() - cachedAt < ANON_CACHE_TTL_MS) {
      return loadPortalDataFromLocalStorage();
    }
  }

  const { data: rows, error } = await supabase
    .from('portal_collections')
    .select('collection_key, payload');

  if (error) {
    console.error('[portalDb] Gagal memuat data:', error.message);
    return loadPortalDataFromLocalStorage();
  }

  const defaults = defaultsByKey();
  const found = new Set<PortalCollectionKey>();
  const portalData = getDefaultPortalData();

  for (const row of rows ?? []) {
    const key = row.collection_key as PortalCollectionKey;
    if (!(key in defaults)) continue;
    found.add(key);
    mapRowToPortalSlice(key, row.payload, portalData);
  }

  const allowSeed =
    import.meta.env.DEV || import.meta.env.VITE_ALLOW_SEED === 'true';
  // Koleksi yang RLS-nya membatasi SELECT ke staf terautentikasi saja
  // (lihat portal_collections_staff_select di schema.sql) — untuk sesi
  // anon/belum login, "tidak ketemu di hasil query" di sini berarti
  // "disembunyikan RLS", BUKAN "belum ada baris di database". Kalau
  // dianggap kosong lalu di-seed, upsert-nya bakal ditolak RLS juga
  // (anon/role tanpa akses tidak boleh insert) — cuma jadi console.error
  // percuma tiap pengunjung anonim buka halaman.
  const sensitiveKeys = new Set<PortalCollectionKey>([
    'students',
    'attendance',
    'notifications',
    'annotations',
    'teachingSchedule',
  ]);

  const seedTasks: Promise<void>[] = [];
  for (const key of Object.keys(defaults) as PortalCollectionKey[]) {
    if (!found.has(key)) {
      if (sensitiveKeys.has(key) && !allowSeed) continue;
      const payload = defaults[key];
      mapRowToPortalSlice(key, payload, portalData);
      seedTasks.push(upsertCollection(key, payload));
    }
  }

  if (allowSeed && portalData.students.length < INITIAL_STUDENTS.length) {
    portalData.students = [...INITIAL_STUDENTS];
    seedTasks.push(upsertCollection('students', portalData.students));
  }

  if (seedTasks.length > 0) {
    await Promise.all(seedTasks);
  }

  // studentAttendance sekarang di tabel Postgres normal (student_attendance),
  // bukan lagi ikut blob portal_collections di atas — diambil terpisah supaya
  // 1 baris per catatan absensi (bukan blob tunggal yang tiap kali ditulis
  // mengirim ulang SELURUH riwayat lewat Realtime ke semua klien).
  portalData.studentAttendance = await fetchStudentAttendance();

  // logs sama — sekarang tabel Postgres normal (activity_logs), lihat
  // migrate_activity_logs_table.sql.
  portalData.logs = await fetchActivityLogs();

  // cash/fines sama juga — tabel Postgres normal (cash_transactions,
  // fine_transactions), lihat migrate_cash_fines_tables.sql.
  portalData.cashTransactions = await fetchCashTransactions();
  portalData.fineTransactions = (await fetchFineTransactions()).map(normalizeFineTransaction);

  // teacherAttendanceLog sama juga — tabel Postgres normal (teacher_attendance),
  // lihat migrate_teacher_attendance_table.sql.
  portalData.teacherAttendanceLog = await fetchTeacherAttendance();

  cachePortalDataToLocalStorage(portalData);

  if (!opts?.isLoggedIn) {
    localStorage.setItem(ANON_CACHE_TIMESTAMP_KEY, String(Date.now()));
  } else {
    // Fetch ini terjadi saat SUDAH login (bisa berisi data sensitif) —
    // hapus timestamp cache anon lama, supaya logout berikutnya di
    // browser yang sama tidak kebetulan pakai cache dari sesi login ini.
    localStorage.removeItem(ANON_CACHE_TIMESTAMP_KEY);
  }

  return portalData;
};

export const portalPayloadFromData = (
  key: PortalCollectionKey,
  data: PortalData
): unknown => {
  switch (key) {
    case 'articles':
      return data.articles;
    case 'gallery':
      return data.gallery;
    case 'teachers':
      return data.teachers;
    case 'uniforms':
      // Disimpan sebagai array polos di Supabase (sama seperti koleksi lain)
      // supaya kompatibel dengan append_to_collection/update_collection_item/
      // delete_collection_item, yang mengasumsikan payload berupa jsonb array.
      // Pembungkus {version, items} cuma dipakai untuk versi cache di localStorage.
      return data.uniforms;
    case 'notifications':
      return data.notifications;
    case 'settings':
      return data.settings;
    case 'attendance':
      return data.attendance;
    case 'students':
      return data.students;
    case 'visits':
      return data.visitsByDay;
    case 'annotations':
      return data.annotations;
    case 'classRoster':
      return data.classRoster;
    case 'teachingSchedule':
      return data.teachingSchedule;
  }
};