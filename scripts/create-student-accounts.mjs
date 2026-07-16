/**
 * Buat akun Siswa secara massal, 1 akun per murid aktif di
 * private-student-data/students-2627.json.
 *
 * Jalankan SEKALI — aman diulang, akun yang sudah ada otomatis dilewati.
 * Butuh Service Role Key dari Supabase Dashboard → Project Settings → API.
 *
 * PowerShell:
 *   $env:SUPABASE_SERVICE_ROLE_KEY="service-role-key-anda"
 *   node scripts/create-student-accounts.mjs
 *
 * WAJIB jalankan supabase/migrate_lms_foundation.sql di SQL Editor DULU
 * sebelum menjalankan skrip ini — skrip ini butuh role 'Siswa' sudah ada.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env.local');

let url = process.env.VITE_SUPABASE_URL?.trim();
let serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !serviceRole) {
  try {
    const raw = readFileSync(envPath, 'utf8');
    for (const line of raw.split('\n')) {
      if (!url && line.startsWith('VITE_SUPABASE_URL=')) url = line.split('=').slice(1).join('=').trim();
      if (!serviceRole && line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) serviceRole = line.split('=').slice(1).join('=').trim();
    }
  } catch {
    /* ignore */
  }
}

if (!url) {
  console.error('VITE_SUPABASE_URL tidak ditemukan (.env.local).');
  process.exit(1);
}
if (!serviceRole) {
  console.error('Set SUPABASE_SERVICE_ROLE_KEY dulu (Supabase Dashboard -> Project Settings -> API -> service_role).');
  console.error('PowerShell: $env:SUPABASE_SERVICE_ROLE_KEY="..."; node scripts/create-student-accounts.mjs');
  process.exit(1);
}

const studentsPath = join(__dirname, '..', 'private-student-data', 'students-2627.json');
const students = JSON.parse(readFileSync(studentsPath, 'utf8')).filter((s) => s.active);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sanitizeId = (id) => id.toLowerCase().replace(/[^a-z0-9]/g, '');
const randomPin = () => String(Math.floor(100000 + Math.random() * 900000));

async function adminCreateUser(email, password) {
  const res = await fetch(`${url}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: serviceRole,
      Authorization: `Bearer ${serviceRole}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function updateProfile(userId, patch) {
  const res = await fetch(`${url}/rest/v1/profiles?id=eq.${userId}`, {
    method: 'PATCH',
    headers: {
      apikey: serviceRole,
      Authorization: `Bearer ${serviceRole}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(patch),
  });
  return res.status;
}

async function findUserIdByEmail(email) {
  const res = await fetch(`${url}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, {
    method: 'GET',
    headers: {
      apikey: serviceRole,
      Authorization: `Bearer ${serviceRole}`,
    },
  });
  const body = await res.json().catch(() => ({}));
  const users = Array.isArray(body) ? body : body?.users;
  return users?.[0]?.id || null;
}

const results = [];

for (const s of students) {
  const loginId = sanitizeId(s.nis || s.id);
  const email = `${loginId}@tamhar.local`;
  const password = randomPin();

  const created = await adminCreateUser(email, password);
  const userId = created.body?.id || created.body?.user?.id;
  const alreadyExists = created.status === 422 || /already registered|already exists/i.test(created.body?.msg || created.body?.error_code || '');

  if (!userId) {
    if (alreadyExists) {
      // Akun auth sudah ada dari run sebelumnya — tapi run itu mungkin gagal/terhenti
      // SEBELUM atau SAAT patch profil (mis. dijalankan sebelum migrasi SQL menambah
      // role 'Siswa', jadi PATCH-nya 400). Kalau langsung skip di sini tanpa cek ulang,
      // akun itu diam-diam permanen tanpa role/linked_student_id, dan re-run berikutnya
      // tetap skip terus. Jadi cari id user yang sudah ada, lalu re-apply updateProfile
      // (idempotent — PATCH by id) supaya run ini juga MEMPERBAIKI akun yang setengah jadi.
      const existingId = await findUserIdByEmail(email);
      if (existingId) {
        const patchStatus = await updateProfile(existingId, {
          role: 'Siswa',
          name: s.name,
          linked_student_id: s.id,
          must_change_password: true,
        });
        const ok = patchStatus < 300;
        console.log(`${ok ? 'SUDAH-ADA' : 'SUDAH-ADA (PROFIL-GAGAL)'} ${s.name} (${loginId}) — profil dicek ulang.`);
        results.push({
          student: s.name,
          className: s.className,
          loginId,
          password: '(sudah ada — lihat run sebelumnya)',
          status: ok ? 'sudah_ada_profil_ok' : 'sudah_ada_profil_gagal',
        });
      } else {
        console.log(`LEWATI  ${s.name} (${loginId}) — akun sudah ada tapi id-nya tidak ditemukan lewat lookup email.`);
        results.push({ student: s.name, className: s.className, loginId, password: '(sudah ada — lookup gagal)', status: 'sudah_ada_lookup_gagal' });
      }
    } else {
      console.log(`GAGAL   ${s.name} (${loginId}): ${created.body?.msg || created.body?.error_code || created.status}`);
      results.push({ student: s.name, className: s.className, loginId, password: '(GAGAL DIBUAT)', status: 'error' });
    }
    await sleep(150);
    continue;
  }

  const patchStatus = await updateProfile(userId, {
    role: 'Siswa',
    name: s.name,
    linked_student_id: s.id,
    must_change_password: true,
  });

  const ok = patchStatus < 300;
  console.log(`${ok ? 'OK      ' : 'PROFIL-GAGAL'} ${s.name} (${loginId})`);
  results.push({ student: s.name, className: s.className, loginId, password, status: ok ? 'ok' : 'profil_gagal' });
  await sleep(150);
}

const csvLines = ['Nama Murid,Kelas,ID Login,Password Awal,Status'];
for (const r of results) {
  csvLines.push([r.student, r.className, r.loginId, r.password, r.status].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
}
const outPath = join(__dirname, '..', 'private-student-data', 'akun-siswa-2627.csv');
writeFileSync(outPath, csvLines.join('\n'), 'utf8');

const okCount = results.filter((r) => r.status === 'ok').length;
console.log(`\nSelesai. ${okCount}/${results.length} akun baru berhasil dibuat (sisanya sudah ada / gagal, lihat kolom Status).`);
console.log(`Daftar ID login + password awal: ${outPath}`);
console.log('File CSV ini berisi data pribadi murid + password — JANGAN pernah upload/kirim ke tempat publik (sudah otomatis di-gitignore).');
