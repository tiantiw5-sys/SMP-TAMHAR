// Edge Function: admin-reset-password
//
// Dipanggil dari tombol "Reset Sandi" di menu Pengguna & Hak Akses (Super
// Admin only). Fungsi ini jalan di server Supabase (Deno), BUKAN di browser
// — ini satu-satunya tempat yang boleh memegang SERVICE_ROLE_KEY, supaya bisa
// mengubah password akun ORANG LAIN (supabase.auth.updateUser() di browser
// cuma bisa mengubah password akun yang SEDANG login, tidak bisa untuk akun
// lain).
//
// SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY otomatis
// tersedia sebagai env var di setiap Edge Function — tidak perlu diisi manual.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return json({ error: 'Unauthorized' }, 401);
  }

  // Klien yang mewakili SI PEMANGGIL (dipakai cuma untuk verifikasi siapa dia
  // & apa perannya lewat tabel profiles — TIDAK pakai service_role di sini).
  const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser();
  if (callerError || !caller) {
    return json({ error: 'Sesi login tidak valid.' }, 401);
  }

  const { data: callerProfile, error: profileError } = await callerClient
    .from('profiles')
    .select('role')
    .eq('id', caller.id)
    .single();

  if (profileError || callerProfile?.role !== 'Super Admin') {
    return json({ error: 'Hanya Super Admin yang boleh reset kata sandi akun lain.' }, 403);
  }

  let body: { userId?: string; newPassword?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Body request tidak valid.' }, 400);
  }

  const { userId, newPassword } = body;
  // Aturan sama seperti validatePasswordStrength() di src/auth.ts (frontend)
  // — dicek ULANG di sini karena endpoint ini bisa dipanggil langsung lewat
  // API, bukan cuma lewat form dashboard yang sudah divalidasi di browser.
  if (!userId || !newPassword) {
    return json({ error: 'userId dan newPassword wajib diisi.' }, 400);
  }
  if (newPassword.length < 8) {
    return json({ error: 'Password minimal 8 karakter.' }, 400);
  }
  if (!/[A-Z]/.test(newPassword)) {
    return json({ error: 'Password harus mengandung minimal 1 huruf besar.' }, 400);
  }
  if (!/[0-9]/.test(newPassword)) {
    return json({ error: 'Password harus mengandung minimal 1 angka.' }, 400);
  }

  // Klien admin — service_role cuma dipakai di sini, di server, sesudah
  // pemanggilnya terverifikasi Super Admin di atas.
  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
    password: newPassword,
  });
  if (updateError) {
    return json({ error: updateError.message }, 500);
  }

  // Wajibkan akun itu ganti sandi lagi sendiri saat login berikutnya.
  await adminClient
    .from('profiles')
    .update({ must_change_password: true, updated_at: new Date().toISOString() })
    .eq('id', userId);

  return json({ success: true });
});
