# LMS EduHarapan — Fase 1: Fondasi Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menyiapkan fondasi backend LMS "EduHarapan" — role `'Siswa'`, tabel `lms_classes`/`lms_enrollments` dengan RLS ketat, RPC `get_my_classes()`, dan skrip pembuatan 87 akun siswa massal — supaya Fase 2 (Classroom inti) punya akun dan struktur kelas yang bisa dipakai.

**Architecture:** Tabel relasional baru di skema `public` (bukan pola blob `portal_collections`), mengikuti persis pola keamanan yang sudah divalidasi di fitur Portal Orang Tua: `current_role_name()`/`current_linked_student_id()` yang sudah ada dipakai ulang, RLS + RPC `security definer` untuk isolasi data siswa, skrip Node admin-API untuk pembuatan akun massal mengikuti pola `create-parent-accounts.mjs`.

**Tech Stack:** Supabase self-hosted (VPS `db.smptamhar.com`) Postgres + Auth + PostgREST, Node.js (`.mjs`, `"type": "module"`), tanpa test runner (project ini tidak punya Jest/Vitest — `npm run lint` cuma `tsc --noEmit`).

## Global Constraints

- SQL adalah file ad-hoc di `supabase/` (bukan folder `migrations/`), idempotent, dan **dijalankan manual oleh user** di Supabase SQL Editor terhadap instance self-hosted `db.smptamhar.com` — jangan pernah dieksekusi otomatis terhadap production tanpa konfirmasi eksplisit lebih dulu (kebijakan standing project ini).
- `alter type ... add value` harus jadi statement berdiri sendiri, tidak boleh dipakai literal-nya dalam query di transaksi/file yang sama saat ditambahkan.
- Secret (`SUPABASE_SERVICE_ROLE_KEY`, dsb) **tidak pernah ditempel ke chat** — diset sebagai env var PowerShell lokal oleh user saja.
- Tidak ada test runner otomatis di repo ini. "Test" untuk kerja SQL/RLS berarti query verifikasi manual + panggilan REST dengan token asli, dicek hasilnya terhadap ekspektasi tertulis — pola yang sama seperti file `migrate_*.sql` lain di repo ini.
- ID login siswa = NIS yang disanitasi (fallback ke `id` kalau `nis` kosong), sesuai keputusan spec `docs/superpowers/specs/2026-07-17-lms-eduharapan-design.md` §2.
- Data siswa asli (`private-student-data/students-2627.json`) sudah di-gitignore — jangan pindahkan datanya ke file yang ter-track git.

---

### Task 1: Skema fondasi — role `Siswa`, tabel `lms_classes`/`lms_enrollments`, RLS, RPC `get_my_classes()`

**Files:**
- Create: `supabase/migrate_lms_foundation.sql`

**Interfaces:**
- Consumes: `public.current_role_name()`, `public.current_linked_student_id()`, `public.profiles.linked_student_id` (semua sudah ada dari `supabase/schema.sql`, bagian Portal Orang Tua).
- Produces: enum value `'Siswa'` di `public.user_role`; tabel `public.lms_classes(id uuid, name text, class_code text, teacher_id uuid, color text, created_at timestamptz)`; tabel `public.lms_enrollments(id uuid, class_id uuid, student_id text, status text, created_at timestamptz)`; fungsi `public.is_class_teacher(p_class_id uuid) returns boolean`, `public.is_enrolled_in_class(p_class_id uuid) returns boolean`, `public.get_my_classes() returns setof public.lms_classes`. Task 2 dan Task 3 memakai nama-nama ini persis.

- [ ] **Step 1: Tulis penambahan role `Siswa`**

Buat file baru `supabase/migrate_lms_foundation.sql`, mulai dengan:

```sql
-- LMS EduHarapan — Fase 1: Fondasi (role Siswa, lms_classes, lms_enrollments)
-- Jalankan di Supabase SQL Editor (self-hosted, db.smptamhar.com). Idempotent.
-- Lihat docs/superpowers/specs/2026-07-17-lms-eduharapan-design.md untuk desain lengkap.

-- Statement ini SENGAJA berdiri sendiri (Postgres melarang ADD VALUE enum
-- dipakai literal-nya dalam transaksi yang sama saat ditambahkan) — pola
-- sama seperti penambahan 'Orang Tua' di schema.sql.
alter type public.user_role add value if not exists 'Siswa';
```

- [ ] **Step 2: Tulis tabel `lms_classes` + `lms_enrollments`**

Tambahkan ke file yang sama:

```sql
create extension if not exists pgcrypto;

-- Satu baris = satu kelas/mapel yang diampu satu guru (gaya Google
-- Classroom "section"), BUKAN kelas fisik/wali kelas. class_code menyimpan
-- kode kelas fisik (mis. '8A') untuk referensi/filter saja.
create table if not exists public.lms_classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  class_code text not null,
  teacher_id uuid not null references public.profiles(id) on delete restrict,
  color text not null default '#1E3A8A',
  created_at timestamptz not null default now()
);

-- student_id TIDAK di-FK (sama seperti profiles.linked_student_id) karena
-- roster murid asli disimpan sebagai blob JSON di portal_collections
-- (collection_key='students'), bukan tabel relasional.
create table if not exists public.lms_enrollments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.lms_classes(id) on delete cascade,
  student_id text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  unique (class_id, student_id)
);

create index if not exists lms_enrollments_student_idx on public.lms_enrollments (student_id);
create index if not exists lms_enrollments_class_idx on public.lms_enrollments (class_id);
```

- [ ] **Step 3: Tulis fungsi bantu `security definer` untuk RLS lintas-tabel**

`lms_classes` dan `lms_enrollments` perlu saling mengecek satu sama lain di kebijakan RLS-nya (guru boleh lihat enrollment di kelasnya; siswa boleh lihat kelas yang dia ikuti). Kalau ditulis sebagai subquery `EXISTS` polos langsung di dalam policy, itu memicu RLS tabel lawan lagi saat subquery dievaluasi — `lms_classes` policy memicu `lms_enrollments` policy, yang memicu balik `lms_classes` policy, dst (rekursif). Pola yang sudah dipakai project ini untuk masalah yang sama (lihat `current_role_name()`/`current_linked_student_id()` di `schema.sql`) adalah bungkus pengecekan lintas-tabel dalam fungsi `security definer` — fungsi begini jalan sebagai pemilik tabel, yang tidak kena RLS tabelnya sendiri secara default, jadi rantai rekursifnya putus.

Tambahkan ke file yang sama:

```sql
create or replace function public.is_class_teacher(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.lms_classes c
    where c.id = p_class_id and c.teacher_id = auth.uid()
  )
$$;

revoke all on function public.is_class_teacher(uuid) from public, anon;
grant execute on function public.is_class_teacher(uuid) to authenticated;

create or replace function public.is_enrolled_in_class(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.lms_enrollments e
    where e.class_id = p_class_id
      and e.student_id = public.current_linked_student_id()
      and e.status = 'active'
  )
$$;

revoke all on function public.is_enrolled_in_class(uuid) from public, anon;
grant execute on function public.is_enrolled_in_class(uuid) to authenticated;
```

- [ ] **Step 4: Tulis RLS untuk `lms_classes`**

```sql
alter table public.lms_classes enable row level security;

drop policy if exists "lms_classes_select" on public.lms_classes;
create policy "lms_classes_select"
  on public.lms_classes for select
  to authenticated
  using (
    public.current_role_name() = 'Super Admin'
    or teacher_id = auth.uid()
    or public.is_enrolled_in_class(id)
  );

drop policy if exists "lms_classes_insert" on public.lms_classes;
create policy "lms_classes_insert"
  on public.lms_classes for insert
  to authenticated
  with check (
    public.current_role_name() = 'Super Admin'
    or (public.current_role_name() = 'Guru' and teacher_id = auth.uid())
  );

drop policy if exists "lms_classes_update" on public.lms_classes;
create policy "lms_classes_update"
  on public.lms_classes for update
  to authenticated
  using (public.current_role_name() = 'Super Admin' or teacher_id = auth.uid())
  with check (public.current_role_name() = 'Super Admin' or teacher_id = auth.uid());

drop policy if exists "lms_classes_delete" on public.lms_classes;
create policy "lms_classes_delete"
  on public.lms_classes for delete
  to authenticated
  using (public.current_role_name() = 'Super Admin' or teacher_id = auth.uid());
```

- [ ] **Step 5: Tulis RLS untuk `lms_enrollments`**

```sql
alter table public.lms_enrollments enable row level security;

drop policy if exists "lms_enrollments_select" on public.lms_enrollments;
create policy "lms_enrollments_select"
  on public.lms_enrollments for select
  to authenticated
  using (
    public.current_role_name() = 'Super Admin'
    or student_id = public.current_linked_student_id()
    or public.is_class_teacher(class_id)
  );

drop policy if exists "lms_enrollments_insert" on public.lms_enrollments;
create policy "lms_enrollments_insert"
  on public.lms_enrollments for insert
  to authenticated
  with check (
    public.current_role_name() = 'Super Admin'
    or public.is_class_teacher(class_id)
  );

drop policy if exists "lms_enrollments_delete" on public.lms_enrollments;
create policy "lms_enrollments_delete"
  on public.lms_enrollments for delete
  to authenticated
  using (
    public.current_role_name() = 'Super Admin'
    or public.is_class_teacher(class_id)
  );
```

- [ ] **Step 6: Tulis RPC `get_my_classes()`**

```sql
-- Kelas yang diikuti akun Siswa yang login — disaring di server (pola sama
-- seperti get_my_child() untuk Orang Tua), bukan tabel mentah yang difilter
-- di klien.
create or replace function public.get_my_classes()
returns setof public.lms_classes
language sql
stable
security definer
set search_path = public
as $$
  select c.*
  from public.lms_classes c
  join public.lms_enrollments e on e.class_id = c.id
  where e.student_id = public.current_linked_student_id()
    and e.status = 'active'
$$;

revoke all on function public.get_my_classes() from public, anon;
grant execute on function public.get_my_classes() to authenticated;
```

- [ ] **Step 7: Verifikasi sintaks — baca ulang file lengkap**

Baca `supabase/migrate_lms_foundation.sql` dari awal sampai akhir, pastikan urutan: (1) `alter type` berdiri sendiri sebagai statement pertama, (2) `create extension`, (3) `create table` x2, (4) `create index` x2, (5) fungsi `is_class_teacher`/`is_enrolled_in_class`, (6) RLS `lms_classes`, (7) RLS `lms_enrollments`, (8) RPC `get_my_classes`. Tidak ada statement lain di file ini yang menulis literal `'Siswa'`. Pastikan tidak ada policy manapun yang berisi `exists (select ... from public.lms_classes` atau `exists (select ... from public.lms_enrollments` secara langsung — semua pengecekan lintas-tabel harus lewat `is_class_teacher()`/`is_enrolled_in_class()`.

- [ ] **Step 8: Commit**

```powershell
git add supabase/migrate_lms_foundation.sql
git commit -m "feat(lms): fondasi skema Fase 1 (role Siswa, lms_classes, lms_enrollments, RLS, get_my_classes)"
```

---

### Task 2: Skrip pembuatan akun siswa massal

**Files:**
- Create: `scripts/create-student-accounts.mjs`

**Interfaces:**
- Consumes: `private-student-data/students-2627.json` (array of `{ id, nis, nisn, name, className, gender, schoolYear, active }`); env `VITE_SUPABASE_URL` / `.env.local` (pola baca sama seperti `create-parent-accounts.mjs`); role `'Siswa'` dan kolom `profiles.linked_student_id` dari Task 1.
- Produces: satu akun `auth.users` + `profiles` (role=`Siswa`, `linked_student_id`=`s.id`, `must_change_password`=true) per murid aktif; file `private-student-data/akun-siswa-2627.csv` (kolom: Nama Murid, Kelas, ID Login, Password Awal, Status).

- [ ] **Step 1: Tulis skrip, mengikuti pola `scripts/create-parent-accounts.mjs` persis**

Buat `scripts/create-student-accounts.mjs`:

```js
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
      console.log(`LEWATI  ${s.name} (${loginId}) — akun sudah ada dari run sebelumnya.`);
      results.push({ student: s.name, className: s.className, loginId, password: '(sudah ada — lihat run sebelumnya)', status: 'sudah_ada' });
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
```

- [ ] **Step 2: Verifikasi tidak ada bug sintaks — baca ulang file**

Baca ulang `scripts/create-student-accounts.mjs`, bandingkan struktur terhadap `scripts/create-parent-accounts.mjs` baris demi baris: pastikan hanya 4 hal yang berbeda — nama file/skrip di komentar header, `loginId` pakai `sanitizeId(s.nis || s.id)` (bukan prefix `'ortu' + sanitizeId(s.id)`), filter `.filter((s) => s.active)`, dan patch profil pakai `role: 'Siswa'` + `name: s.name` (bukan `'Orang Tua ' + s.name`).

- [ ] **Step 3: Commit**

```powershell
git add scripts/create-student-accounts.mjs
git commit -m "feat(lms): skrip pembuatan akun Siswa massal dari roster 2026/2027"
```

---

### Task 3: Verifikasi end-to-end (operator steps — dijalankan user, bukan otomatis)

**Files:**
- Tidak ada file kode baru. Task ini murni langkah verifikasi manual terhadap Supabase self-hosted (`db.smptamhar.com`), dijalankan oleh user karena melibatkan Service Role Key dan eksekusi SQL terhadap production.

**Interfaces:**
- Consumes: `supabase/migrate_lms_foundation.sql` (Task 1), `scripts/create-student-accounts.mjs` (Task 2), `VITE_SUPABASE_ANON_KEY` dari `.env.local` (publik, aman dipakai di command).

- [ ] **Step 1: Jalankan migrasi skema**

User membuka Supabase Studio (self-hosted) → SQL Editor → paste seluruh isi `supabase/migrate_lms_foundation.sql` → Run. Verifikasi lewat query berikut, jalankan di SQL Editor yang sama:

```sql
select unnest(enum_range(null::public.user_role))::text as role_value;
```

Expected: daftar berisi `Siswa` di antara nilai lain (`Super Admin`, `Guru`, dst).

```sql
select table_name from information_schema.tables
where table_schema = 'public' and table_name in ('lms_classes', 'lms_enrollments');
```

Expected: 2 baris.

- [ ] **Step 2: Jalankan skrip pembuatan akun**

User menjalankan di PowerShell lokal (bukan lewat Claude — Service Role Key tidak boleh masuk chat):

```powershell
$env:SUPABASE_SERVICE_ROLE_KEY="<service-role-key-dari-dashboard>"
node scripts/create-student-accounts.mjs
```

Expected output: `Selesai. 87/87 akun baru berhasil dibuat` (atau mendekati — beberapa mungkin `sudah_ada` kalau skrip pernah dijalankan sebagian sebelumnya). File `private-student-data/akun-siswa-2627.csv` terbentuk.

- [ ] **Step 3: Verifikasi jumlah & role di database**

Query di SQL Editor:

```sql
select role, count(*) from public.profiles where role = 'Siswa' group by role;
```

Expected: 1 baris, count mendekati 87 (jumlah murid `active: true` di `students-2627.json`).

- [ ] **Step 4: Verifikasi isolasi RLS pakai SATU akun siswa baru (belum dibagikan ke murid asli — aman dipakai untuk tes)**

Ambil satu baris dari `akun-siswa-2627.csv` (kolom ID Login + Password Awal). Dapatkan token login lewat REST Auth (ganti `<ID_LOGIN>`/`<PASSWORD>`, `<ANON_KEY>` dari `.env.local`):

```powershell
$anonKey = "<VITE_SUPABASE_ANON_KEY dari .env.local>"
$body = @{ email = "<ID_LOGIN>@tamhar.local"; password = "<PASSWORD>" } | ConvertTo-Json
$resp = Invoke-RestMethod -Uri "https://db.smptamhar.com/auth/v1/token?grant_type=password" -Method POST -Headers @{ apikey = $anonKey; "Content-Type" = "application/json" } -Body $body
$studentToken = $resp.access_token
```

Panggil `get_my_classes()` sebagai siswa ini (belum ada kelas yang di-enroll, jadi hasilnya harus KOSONG — ini yang diverifikasi):

```powershell
Invoke-RestMethod -Uri "https://db.smptamhar.com/rest/v1/rpc/get_my_classes" -Method POST -Headers @{ apikey = $anonKey; Authorization = "Bearer $studentToken"; "Content-Type" = "application/json" } -Body "{}"
```

Expected: `[]` (array kosong) — bukan error, dan bukan daftar kelas siapa pun.

Coba juga akses langsung ke tabel mentah (harus DITOLAK RLS, bukan cuma kosong karena filter):

```powershell
Invoke-RestMethod -Uri "https://db.smptamhar.com/rest/v1/lms_enrollments?select=*" -Method GET -Headers @{ apikey = $anonKey; Authorization = "Bearer $studentToken" }
```

Expected: `[]` juga (RLS `lms_enrollments_select` membatasi ke `student_id = current_linked_student_id()`, dan siswa ini belum punya enrollment — jadi hasilnya kosong, BUKAN error 403, karena select policy-nya memang mengizinkan select dengan filter, hanya baris yang cocok kosong).

Dua cek berikut khusus memverifikasi perbaikan Critical dari review akhir seluruh branch: kebijakan `portal_collections_staff_select` dan `profiles_select_authenticated` di `schema.sql` sebelumnya cuma mengecualikan role `'Orang Tua'`, bukan `'Siswa'` yang baru — jadi tanpa perbaikan di `migrate_lms_foundation.sql`, siswa manapun bisa baca seluruh roster murid dan seluruh tabel `profiles`. Pakai `$studentToken`/`$anonKey` yang sama dari langkah di atas.

```powershell
# HARUS gagal terlihat sedikit (1 baris, milik sendiri) — BUKAN semua akun
Invoke-RestMethod -Uri "https://db.smptamhar.com/rest/v1/profiles?select=*" -Method GET -Headers @{ apikey = $anonKey; Authorization = "Bearer $studentToken" }
```

Expected: **HANYA 1 baris** (baris milik siswa itu sendiri), bukan seluruh tabel `profiles`. Kalau ini mengembalikan lebih dari 1 baris, RLS bocor — JANGAN lanjut ke Fase 2.

```powershell
# HARUS kosong/ditolak — siswa tidak boleh baca roster mentah
Invoke-RestMethod -Uri "https://db.smptamhar.com/rest/v1/portal_collections?collection_key=eq.students" -Method GET -Headers @{ apikey = $anonKey; Authorization = "Bearer $studentToken" }
```

Expected: `[]` (kosong) — siswa tidak boleh bisa menarik koleksi `students` mentah sama sekali. Kalau ini mengembalikan data roster, RLS bocor — JANGAN lanjut ke Fase 2.

- [ ] **Step 5: Catat hasil verifikasi di plan ini**

Centang semua checkbox Task 3 di atas setelah masing-masing expected output cocok. Kalau ada yang tidak cocok, JANGAN lanjut ke Fase 2 — laporkan hasil aktual vs expected untuk didiagnosis dulu.

---

## Fase Berikutnya

Fase 2 (Classroom inti) akan menambah tabel `lms_materials`, `lms_assignments`, `lms_submissions` di file migrasi barunya sendiri (`supabase/migrate_lms_classroom.sql`, mengikuti konvensi satu file per fitur seperti `migrate_cash_fines_tables.sql`), plus UI React untuk guru membuat kelas (mengisi `lms_classes`/`lms_enrollments` yang di Fase 1 ini masih kosong) dan tab Stream/Tugas/Materi/Nilai/Siswa. Itu di luar cakupan plan ini.
