/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { User } from '../types';
import { getSupabase } from './supabase';

const LEGACY_LOGGED_IN_KEY = 'smptamhar_isLoggedIn';
const LEGACY_USER_KEY = 'smptamhar_currentUser';

type LegacyUserRecord = {
  id: string;
  name: string;
  email: string;
  role: User['role'];
  status: User['status'];
  passwordHash: string;
  mustChangePassword?: boolean;
};

export const hashPassword = async (password: string): Promise<string> => {
  const data = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};

export const verifyPassword = async (password: string, passwordHash: string): Promise<boolean> =>
  (await hashPassword(password)) === passwordHash;

const toUser = (record: LegacyUserRecord): User => ({
  id: record.id,
  name: record.name,
  email: record.email,
  role: record.role,
  status: record.status,
  mustChangePassword: record.mustChangePassword,
});

export const loadLegacySession = (): User | null => {
  if (localStorage.getItem(LEGACY_LOGGED_IN_KEY) !== 'true') return null;
  const raw = localStorage.getItem(LEGACY_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
};

export const saveLegacySession = (user: User): void => {
  localStorage.setItem(LEGACY_LOGGED_IN_KEY, 'true');
  localStorage.setItem(LEGACY_USER_KEY, JSON.stringify(user));
};

export const clearLegacySession = (): void => {
  localStorage.removeItem(LEGACY_LOGGED_IN_KEY);
  localStorage.removeItem(LEGACY_USER_KEY);
};

export const fetchLegacyUsers = async (): Promise<LegacyUserRecord[]> => {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('portal_collections')
    .select('payload')
    .eq('collection_key', 'users')
    .maybeSingle();

  if (error || !data?.payload || !Array.isArray(data.payload)) return [];
  return data.payload as LegacyUserRecord[];
};

export const findLegacyUser = async (loginId: string): Promise<LegacyUserRecord | null> => {
  const normalized = loginId.trim().toLowerCase();
  const users = await fetchLegacyUsers();
  return users.find((user) => user.email.toLowerCase() === normalized) ?? null;
};

export const authenticateLegacyUser = async (
  loginId: string,
  password: string
): Promise<User | null> => {
  const record = await findLegacyUser(loginId);
  if (!record || record.status !== 'Active') return null;
  if (!(await verifyPassword(password, record.passwordHash))) return null;
  return toUser(record);
};

export const updateLegacyUserPassword = async (userId: string, newPassword: string): Promise<boolean> => {
  const supabase = getSupabase();
  if (!supabase) return false;

  const users = await fetchLegacyUsers();
  const passwordHash = await hashPassword(newPassword);
  const nextUsers = users.map((user) =>
    user.id === userId
      ? { ...user, passwordHash, mustChangePassword: false }
      : user
  );

  const { error } = await supabase
    .from('portal_collections')
    .update({ payload: nextUsers })
    .eq('collection_key', 'users');

  return !error;
};

// Sementara — dipakai selagi migrasi ke Supabase Auth belum kelar (schema.sql
// belum dijalankan / akun asli belum dibuat). Begitu migrasi selesai, akun
// baru dibuat lewat Supabase Dashboard, bukan lewat sini lagi.
export const addLegacyUser = async (input: {
  name: string;
  email: string;
  role: User['role'];
  password: string;
  mustChangePassword: boolean;
}): Promise<{ ok: boolean; error?: string }> => {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'Supabase belum terhubung.' };

  const users = await fetchLegacyUsers();
  if (users.some((u) => u.email.toLowerCase() === input.email.toLowerCase())) {
    return { ok: false, error: 'ID Pengguna / Username sudah terdaftar!' };
  }

  const newUser: LegacyUserRecord = {
    id: `usr-${Date.now()}`,
    name: input.name,
    email: input.email,
    role: input.role,
    status: 'Active',
    passwordHash: await hashPassword(input.password || 'tamhar123'),
    mustChangePassword: input.mustChangePassword,
  };

  const { error } = await supabase
    .from('portal_collections')
    .upsert({ collection_key: 'users', payload: [...users, newUser] }, { onConflict: 'collection_key' });

  return { ok: !error, error: error?.message };
};

export const updateLegacyUserProfile = async (
  userId: string,
  updates: { name: string; role: User['role']; mustChangePassword: boolean }
): Promise<boolean> => {
  const supabase = getSupabase();
  if (!supabase) return false;

  const users = await fetchLegacyUsers();
  const nextUsers = users.map((user) => (user.id === userId ? { ...user, ...updates } : user));

  const { error } = await supabase
    .from('portal_collections')
    .update({ payload: nextUsers })
    .eq('collection_key', 'users');

  return !error;
};