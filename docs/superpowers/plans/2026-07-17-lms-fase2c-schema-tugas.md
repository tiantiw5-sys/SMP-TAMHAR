# LMS EduHarapan — Fase 2c Skema: Tugas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tabel `lms_assignments` (tugas) dan `lms_submissions` (pengumpulan + nilai) + RLS, supaya frontend `SMP-TAMHAR-LMS` bisa membangun tab Tugas (guru bikin tugas, siswa submit link/teks, guru nilai).

**Architecture:** Melanjutkan pola Fase 1/2b — tabel relasional baru, RLS pakai fungsi `security definer`. Karena `lms_submissions` perlu tahu kelas lewat `lms_assignments` (dua lompatan: submission → assignment → class), dibuat DUA fungsi bantu baru (`is_assignment_class_teacher`, `is_enrolled_in_assignment_class`) yang MEMANGGIL fungsi Fase 1 yang sudah ada (`is_class_teacher`, `is_enrolled_in_class`) — bukan query ulang dari nol, dan tetap `security definer` supaya tidak memicu rekursi RLS.

**Tech Stack:** Sama seperti fase-fase sebelumnya — SQL ad-hoc di `supabase/`, dijalankan manual di Supabase self-hosted (`db.smptamhar.com`).

## Global Constraints

- Tabel/fungsi yang SUDAH ADA (jangan dibuat ulang): `lms_classes`, `lms_enrollments`, `lms_announcements`, `lms_materials`, `is_class_teacher(uuid)`, `is_enrolled_in_class(uuid)`, `current_role_name()`.
- Submission = link/teks bebas (kolom `content text`), BUKAN upload file — konsisten dengan pola Materi (Fase 2b).
- `lms_submissions.student_id` adalah **uuid, `auth.uid()` siswa yang login** (`profiles.id`) — BUKAN id blob roster (`TEMP-8A-001` dst, itu dipakai `lms_enrollments.student_id` yang text). Dua konsep beda: `lms_enrollments` = "siapa terdaftar di kelas" (dicocokkan ke roster), `lms_submissions.student_id` = "akun siapa yang submit" (dicocokkan ke sesi login). Keduanya terhubung lewat `is_enrolled_in_class()`/`is_enrolled_in_assignment_class()` yang secara internal tetap mengecek roster lewat `current_linked_student_id()`.
- Satu siswa cuma boleh submit SEKALI per tugas (`unique(assignment_id, student_id)`) — tidak ada alur "submit ulang" di fase ini (out of scope, YAGNI).
- RLS di fase ini adalah row-level, bukan column-level — guru yang boleh UPDATE baris submission (untuk isi nilai) secara teknis bisa update kolom manapun di baris itu (termasuk `content` milik siswa), bukan cuma kolom nilai. Ini konsisten dengan cara RLS dipakai di tabel lain project ini (tidak ada pembatasan per-kolom di mana pun), dipercayakan ke UI frontend untuk cuma expose form nilai, bukan form edit jawaban siswa.
- SQL dijalankan manual di Supabase SQL Editor / lewat SSH VPS (operator step) — sampaikan ringkas apa yang dijalankan sebelum eksekusi nyata ke production.
- Tidak ada test runner otomatis. "Test" = query verifikasi manual + panggilan REST dengan token asli.
- Pola cross-table RLS WAJIB lewat fungsi `security definer` — JANGAN inline `exists (select ... from lms_classes/lms_enrollments/lms_assignments ...)` langsung di dalam `create policy`.

---

### Task 1: Tabel `lms_assignments` + `lms_submissions` + fungsi bantu + RLS

**Files:**
- Create: `supabase/migrate_lms_tugas.sql`

**Interfaces:**
- Consumes: `public.is_class_teacher(uuid)`, `public.is_enrolled_in_class(uuid)`, `public.current_role_name()` (semua sudah ada).
- Produces: tabel `public.lms_assignments(id uuid, class_id uuid, title text, description text, due_at timestamptz, points numeric, created_by uuid, created_at timestamptz)`, tabel `public.lms_submissions(id uuid, assignment_id uuid, student_id uuid, content text, submitted_at timestamptz, grade numeric, graded_at timestamptz, graded_by uuid)`, fungsi `public.is_assignment_class_teacher(uuid) returns boolean`, `public.is_enrolled_in_assignment_class(uuid) returns boolean`. Frontend Fase 2c memakai nama-nama ini persis.

- [ ] **Step 1: Tulis tabel `lms_assignments`**

Buat file baru `supabase/migrate_lms_tugas.sql`:

```sql
-- LMS EduHarapan — Fase 2c: Tugas (assignment + submission + nilai)
-- Jalankan di Supabase SQL Editor (self-hosted, db.smptamhar.com). Idempotent.
-- Lihat docs/superpowers/specs/2026-07-17-lms-eduharapan-design.md untuk desain lengkap.

create table if not exists public.lms_assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.lms_classes(id) on delete cascade,
  title text not null,
  description text not null default '',
  due_at timestamptz,
  points numeric not null default 100,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists lms_assignments_class_idx on public.lms_assignments (class_id, created_at desc);
```

- [ ] **Step 2: Tulis tabel `lms_submissions`**

```sql
-- student_id DI SINI beda dari lms_enrollments.student_id (yang text, id
-- blob roster) — ini uuid, auth.uid() akun Siswa yang login (profiles.id).
-- lms_enrollments = "siapa terdaftar di kelas" (dicocokkan roster),
-- lms_submissions.student_id = "akun siapa yang submit" (dicocokkan sesi
-- login). Keduanya tersambung lewat is_enrolled_in_class() yang mengecek
-- current_linked_student_id() di baliknya.
create table if not exists public.lms_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.lms_assignments(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  submitted_at timestamptz not null default now(),
  grade numeric,
  graded_at timestamptz,
  graded_by uuid references public.profiles(id),
  unique (assignment_id, student_id)
);

create index if not exists lms_submissions_assignment_idx on public.lms_submissions (assignment_id);
create index if not exists lms_submissions_student_idx on public.lms_submissions (student_id);
```

- [ ] **Step 3: Fungsi bantu `security definer` (submission → assignment → class)**

`lms_submissions` perlu tahu kelas lewat `lms_assignments.class_id` — dua lompatan tabel. Bungkus jadi fungsi baru yang MEMANGGIL `is_class_teacher`/`is_enrolled_in_class` yang sudah ada (bukan query ulang ke `lms_classes`/`lms_enrollments` langsung), supaya polanya konsisten dan tidak ada risiko rekursi RLS baru.

```sql
create or replace function public.is_assignment_class_teacher(p_assignment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.lms_assignments a
    where a.id = p_assignment_id and public.is_class_teacher(a.class_id)
  )
$$;

revoke all on function public.is_assignment_class_teacher(uuid) from public, anon;
grant execute on function public.is_assignment_class_teacher(uuid) to authenticated;

create or replace function public.is_enrolled_in_assignment_class(p_assignment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.lms_assignments a
    where a.id = p_assignment_id and public.is_enrolled_in_class(a.class_id)
  )
$$;

revoke all on function public.is_enrolled_in_assignment_class(uuid) from public, anon;
grant execute on function public.is_enrolled_in_assignment_class(uuid) to authenticated;
```

- [ ] **Step 4: RLS `lms_assignments`**

```sql
alter table public.lms_assignments enable row level security;

drop policy if exists "lms_assignments_select" on public.lms_assignments;
create policy "lms_assignments_select"
  on public.lms_assignments for select
  to authenticated
  using (
    public.current_role_name() = 'Super Admin'
    or public.is_class_teacher(class_id)
    or public.is_enrolled_in_class(class_id)
  );

drop policy if exists "lms_assignments_insert" on public.lms_assignments;
create policy "lms_assignments_insert"
  on public.lms_assignments for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and (public.current_role_name() = 'Super Admin' or public.is_class_teacher(class_id))
  );

drop policy if exists "lms_assignments_delete" on public.lms_assignments;
create policy "lms_assignments_delete"
  on public.lms_assignments for delete
  to authenticated
  using (public.current_role_name() = 'Super Admin' or public.is_class_teacher(class_id));
```

- [ ] **Step 5: RLS `lms_submissions`**

```sql
alter table public.lms_submissions enable row level security;

drop policy if exists "lms_submissions_select" on public.lms_submissions;
create policy "lms_submissions_select"
  on public.lms_submissions for select
  to authenticated
  using (
    public.current_role_name() = 'Super Admin'
    or public.is_assignment_class_teacher(assignment_id)
    or student_id = auth.uid()
  );

-- Cuma siswa yang terdaftar aktif di kelas tugas itu boleh submit, dan
-- cuma atas namanya sendiri (student_id = auth.uid()) — guru/admin TIDAK
-- insert submission atas nama siswa di fase ini (di luar cakupan).
drop policy if exists "lms_submissions_insert" on public.lms_submissions;
create policy "lms_submissions_insert"
  on public.lms_submissions for insert
  to authenticated
  with check (
    student_id = auth.uid()
    and public.is_enrolled_in_assignment_class(assignment_id)
  );

-- Guru pemilik kelas (lewat tugas ini) atau Super Admin boleh update baris
-- (dipakai untuk isi nilai). Row-level saja, lihat catatan di Global
-- Constraints soal keterbatasan column-level.
drop policy if exists "lms_submissions_update" on public.lms_submissions;
create policy "lms_submissions_update"
  on public.lms_submissions for update
  to authenticated
  using (public.current_role_name() = 'Super Admin' or public.is_assignment_class_teacher(assignment_id))
  with check (public.current_role_name() = 'Super Admin' or public.is_assignment_class_teacher(assignment_id));
```

- [ ] **Step 6: Verifikasi sintaks — baca ulang file lengkap**

Baca `supabase/migrate_lms_tugas.sql` dari awal sampai akhir. Pastikan: (1) tidak ada `exists (select ... from public.lms_classes`, `...lms_enrollments`, ATAU `...lms_assignments` inline langsung di dalam blok `create policy` manapun — semua pengecekan lintas-tabel lewat `is_class_teacher()`/`is_enrolled_in_class()`/`is_assignment_class_teacher()`/`is_enrolled_in_assignment_class()`; (2) setiap `create table` pakai `if not exists`; (3) setiap `create policy` didahului `drop policy if exists` nama sama persis; (4) setiap `create or replace function` baru diikuti `revoke`+`grant execute` yang sesuai.

- [ ] **Step 7: Commit**

```powershell
git add supabase/migrate_lms_tugas.sql
git commit -m "feat(lms): skema Fase 2c (lms_assignments, lms_submissions, RLS)"
```

---

## Fase Berikutnya

Fase 2d: tab Nilai (gradebook) — tampilan agregat dari `lms_submissions` yang sudah ada, kemungkinan tidak butuh skema baru sama sekali, cuma query/RPC baca di frontend.
