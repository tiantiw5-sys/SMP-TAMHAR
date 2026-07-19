import { getSupabase } from './supabase';

/** Sisa detik terkunci untuk `loginId` ini, ditanya ke server (tabel
 * `login_lockouts`, satu tabel yang sama dipakai juga oleh LMS — lihat
 * supabase/migrate_server_login_lockout.sql) — BUKAN localStorage, supaya
 * tidak bisa dilewati dengan clear storage / ganti browser / incognito.
 * Fail-open: kalau RPC error (mis. migrasi belum dijalankan di DB atau
 * Supabase belum terhubung), anggap tidak terkunci — jangan sampai bug
 * infra mengunci semua orang keluar dari portal. */
export async function getLockoutRemainingSeconds(loginId: string): Promise<number> {
  const id = loginId.trim();
  const supabase = getSupabase();
  if (!id || !supabase) return 0;
  const { data, error } = await supabase.rpc('check_login_lockout', { p_login_id: id });
  if (error || typeof data !== 'number') return 0;
  return data;
}

/** Catat satu percobaan login gagal di server. Mengembalikan durasi kunci
 * baru dalam detik kalau percobaan ini yang memicu lockout, atau 0 kalau
 * belum. */
export async function recordFailedAttempt(loginId: string): Promise<number> {
  const id = loginId.trim();
  const supabase = getSupabase();
  if (!id || !supabase) return 0;
  const { data, error } = await supabase.rpc('record_login_failure', { p_login_id: id });
  if (error || typeof data !== 'number') return 0;
  return data;
}

export async function clearLockout(loginId: string): Promise<void> {
  const id = loginId.trim();
  const supabase = getSupabase();
  if (!id || !supabase) return;
  await supabase.rpc('clear_login_lockout', { p_login_id: id });
}

export function formatLockoutCountdown(seconds: number): string {
  if (seconds < 60) return `${seconds} detik`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest === 0 ? `${minutes} menit` : `${minutes} menit ${rest} detik`;
}
