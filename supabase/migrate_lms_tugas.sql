-- LMS EduHarapan — Fase 2c: Tugas (assignment + submission + nilai)
-- Jalankan di Supabase SQL Editor (self-hosted, db.smptamhar.com). Idempotent.
-- Lihat docs/superpowers/specs/2026-07-17-lms-eduharapan-design.md untuk desain lengkap.

-- ============================================================================
-- Step 1: Tulis tabel `lms_assignments`
-- ============================================================================

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

-- ============================================================================
-- Step 2: Tulis tabel `lms_submissions`
-- ============================================================================

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

-- ============================================================================
-- Step 3: Fungsi bantu `security definer` (submission → assignment → class)
-- ============================================================================

-- lms_submissions perlu tahu kelas lewat lms_assignments.class_id — dua lompatan tabel.
-- Bungkus jadi fungsi baru yang MEMANGGIL is_class_teacher/is_enrolled_in_class yang sudah ada
-- (bukan query ulang ke lms_classes/lms_enrollments langsung), supaya polanya konsisten
-- dan tidak ada risiko rekursi RLS baru.

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

-- ============================================================================
-- Step 4: RLS `lms_assignments`
-- ============================================================================

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

-- ============================================================================
-- Step 5: RLS `lms_submissions`
-- ============================================================================

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
