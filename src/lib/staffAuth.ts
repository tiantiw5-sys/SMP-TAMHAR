/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Session, SupabaseClient, User as AuthUser } from '@supabase/supabase-js';
import { staffLoginEmails } from '../constants';

export async function signInStaff(
  supabase: SupabaseClient,
  loginId: string,
  password: string
): Promise<{ user: AuthUser; session: Session; email: string } | { error: string }> {
  const emails = staffLoginEmails(loginId);
  let lastError = 'ID atau password salah.';

  for (const email of emails) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && data.user && data.session) {
      return { user: data.user, session: data.session, email };
    }
    if (error?.message) lastError = error.message;
  }

  if (lastError.includes('Invalid login credentials')) {
    return {
      error:
        'Akun belum ada atau password salah. Buat user di Supabase Dashboard → Authentication → Users (email: superadmin@smptamhar.com, centang Auto Confirm).',
    };
  }

  return { error: lastError };
}