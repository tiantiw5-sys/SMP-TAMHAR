/**
 * Buat akun portal di Supabase Auth (sekali jalan).
 * PowerShell:
 *   node scripts/create-portal-users.mjs
 *
 * Login setelah ini: ID superadmin / password superadmin
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env.local');
let url = process.env.VITE_SUPABASE_URL?.trim();
let anon = process.env.VITE_SUPABASE_ANON_KEY?.trim();
let serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !anon) {
  try {
    const raw = readFileSync(envPath, 'utf8');
    for (const line of raw.split('\n')) {
      if (line.startsWith('VITE_SUPABASE_URL=')) url = line.split('=').slice(1).join('=').trim();
      if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) anon = line.split('=').slice(1).join('=').trim();
      if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) serviceRole = line.split('=').slice(1).join('=').trim();
    }
  } catch {
    /* ignore */
  }
}

if (!url || !anon) {
  console.error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY tidak ditemukan.');
  process.exit(1);
}

const USERS = [
  { id: 'superadmin', password: 'superadmin', name: 'Tristian Novansyah, S.Kom' },
];

async function adminCreate(email, password, name) {
  const res = await fetch(`${url}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: serviceRole,
      Authorization: `Bearer ${serviceRole}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    }),
  });
  const body = await res.json();
  return { status: res.status, body };
}

async function signup(id, password) {
  const email = `${id}@smptamhar.com`;
  if (serviceRole) {
    const created = await adminCreate(email, password, id);
    return { email, status: created.status, body: created.body };
  }
  const res = await fetch(`${url}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: anon, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, data: { name: id } }),
  });
  const body = await res.json();
  return { email, status: res.status, body };
}

async function login(email, password) {
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: anon, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json();
  return { status: res.status, ok: Boolean(body.access_token), body };
}

for (const u of USERS) {
  const email = `${u.id}@tamhar.local`;
  console.log(`\n=== ${u.id} (${email}) ===`);
  const up = await signup(u.id, u.password);
  console.log('signup:', up.status, up.body.msg || up.body.error_code || 'created', up.body.user?.id || '');

  const lg = await login(email, u.password);
  if (lg.ok) {
    console.log('login: OK — superadmin siap dipakai');
  } else {
    console.log('login:', lg.body.msg || lg.body.error_code);
    console.log('→ Jika signup sukses tapi login gagal: Supabase Dashboard → Auth → Users → confirm user');
    console.log('→ Lalu jalankan supabase/migrate_profiles.sql di SQL Editor');
  }
}

console.log('\nLogin portal: ID = superadmin , Password = superadmin');
console.log('Jalankan migrate_profiles.sql agar role = Super Admin');
if (!serviceRole) {
  console.log('\nTip: tambahkan SUPABASE_SERVICE_ROLE_KEY ke .env.local agar tidak kena rate limit signup.');
  console.log('Atau jalankan supabase/schema.sql lalu supabase/setup_login.sql di SQL Editor.');
}