/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';

export const isSupabaseEnabled = (): boolean =>
  Boolean(supabaseUrl && supabaseAnonKey);

let client: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient | null => {
  if (!isSupabaseEnabled()) return null;
  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey);
  }
  return client;
};

/**
 * Klien terpisah, khusus dipakai saat Super Admin bikin akun ERP baru dari
 * dalam dashboard (fitur "Tambah Akun"). Memakai anon key publik yang sama
 * (aman — anon key memang didesain untuk dipakai di browser), TIDAK PERNAH
 * pakai service_role key (kunci rahasia itu tidak boleh ada di kode
 * frontend sama sekali — siapa pun bisa membacanya dari JS yang ter-bundle
 * dan mengambil alih seluruh database kalau itu terjadi).
 *
 * Dibuat sebagai instance BARU (persistSession: false) supaya memanggil
 * .auth.signUp() di sini tidak menimpa/menggeser sesi login Super Admin yang
 * sedang aktif di klien utama (getSupabase()) — signUp() di klien biasa
 * otomatis mengganti sesi aktif ke akun yang baru dibuat, yang berarti Super
 * Admin akan ter-logout diam-diam kalau dipanggil dari klien yang sama.
 */
export const createSignupOnlyClient = (): SupabaseClient | null => {
  if (!isSupabaseEnabled()) return null;
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
};