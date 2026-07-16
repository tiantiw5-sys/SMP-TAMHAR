-- LMS EduHarapan — Fase 1: Fondasi (role Siswa, lms_classes, lms_enrollments)
-- Jalankan di Supabase SQL Editor (self-hosted, db.smptamhar.com). Idempotent.
-- Lihat docs/superpowers/specs/2026-07-17-lms-eduharapan-design.md untuk desain lengkap.

-- Statement ini SENGAJA berdiri sendiri (Postgres melarang ADD VALUE enum
-- dipakai literal-nya dalam transaksi yang sama saat ditambahkan) — pola
-- sama seperti penambahan 'Orang Tua' di schema.sql.
alter type public.user_role add value if not exists 'Siswa';

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
