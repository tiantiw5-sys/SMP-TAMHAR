-- LMS EduHarapan — Fase 3a: Skema Ujian (CBT)
-- Jalankan di Supabase SQL Editor (self-hosted, db.smptamhar.com). Idempotent.
-- SYARAT KERAS: lms_questions.correct_option TIDAK PERNAH boleh terlihat
-- siswa — lihat catatan di Global Constraints plan ini.

create table if not exists public.lms_exams (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.lms_classes(id) on delete cascade,
  title text not null,
  duration_minutes integer not null default 60,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists lms_exams_class_idx on public.lms_exams (class_id, created_at desc);

-- options: array jsonb pilihan jawaban untuk soal PG, mis. ["Jakarta","Bandung","Surabaya","Medan"].
-- correct_option: index (0-based) opsi yang benar di array options — NULL untuk soal esai.
-- type: 'mcq' (pilihan ganda) atau 'essay'.
create table if not exists public.lms_questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.lms_exams(id) on delete cascade,
  order_index integer not null default 0,
  type text not null check (type in ('mcq', 'essay')),
  text text not null,
  options jsonb,
  correct_option integer,
  points numeric not null default 10,
  constraint lms_questions_mcq_has_options check (type <> 'mcq' or (options is not null and correct_option is not null))
);

create index if not exists lms_questions_exam_idx on public.lms_questions (exam_id, order_index);

create or replace function public.is_exam_class_teacher(p_exam_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.lms_exams e
    where e.id = p_exam_id and public.is_class_teacher(e.class_id)
  )
$$;

revoke all on function public.is_exam_class_teacher(uuid) from public, anon;
grant execute on function public.is_exam_class_teacher(uuid) to authenticated;

create or replace function public.is_enrolled_in_exam_class(p_exam_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.lms_exams e
    where e.id = p_exam_id and public.is_enrolled_in_class(e.class_id)
  )
$$;

revoke all on function public.is_enrolled_in_exam_class(uuid) from public, anon;
grant execute on function public.is_enrolled_in_exam_class(uuid) to authenticated;

create or replace function public.is_exam_published(p_exam_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.lms_exams e where e.id = p_exam_id and e.status = 'published')
$$;

revoke all on function public.is_exam_published(uuid) from public, anon;
grant execute on function public.is_exam_published(uuid) to authenticated;

alter table public.lms_exams enable row level security;

drop policy if exists "lms_exams_select" on public.lms_exams;
create policy "lms_exams_select"
  on public.lms_exams for select
  to authenticated
  using (
    public.current_role_name() = 'Super Admin'
    or public.is_class_teacher(class_id)
    or (status = 'published' and public.is_enrolled_in_class(class_id))
  );

drop policy if exists "lms_exams_insert" on public.lms_exams;
create policy "lms_exams_insert"
  on public.lms_exams for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and (public.current_role_name() = 'Super Admin' or public.is_class_teacher(class_id))
  );

drop policy if exists "lms_exams_update" on public.lms_exams;
create policy "lms_exams_update"
  on public.lms_exams for update
  to authenticated
  using (public.current_role_name() = 'Super Admin' or public.is_class_teacher(class_id))
  with check (public.current_role_name() = 'Super Admin' or public.is_class_teacher(class_id));

drop policy if exists "lms_exams_delete" on public.lms_exams;
create policy "lms_exams_delete"
  on public.lms_exams for delete
  to authenticated
  using (public.current_role_name() = 'Super Admin' or public.is_class_teacher(class_id));

alter table public.lms_questions enable row level security;

-- SENGAJA cuma guru pemilik kelas & Super Admin — TIDAK ADA klausa untuk
-- siswa/enrolled di kebijakan SELECT ini. Siswa mengerjakan ujian LEWAT
-- RPC get_my_exam() (Task 2), yang secara eksplisit tidak menyertakan
-- correct_option di hasilnya — bukan lewat baca tabel ini langsung.
drop policy if exists "lms_questions_select" on public.lms_questions;
create policy "lms_questions_select"
  on public.lms_questions for select
  to authenticated
  using (public.current_role_name() = 'Super Admin' or public.is_exam_class_teacher(exam_id));

drop policy if exists "lms_questions_insert" on public.lms_questions;
create policy "lms_questions_insert"
  on public.lms_questions for insert
  to authenticated
  with check (public.current_role_name() = 'Super Admin' or public.is_exam_class_teacher(exam_id));

drop policy if exists "lms_questions_update" on public.lms_questions;
create policy "lms_questions_update"
  on public.lms_questions for update
  to authenticated
  using (public.current_role_name() = 'Super Admin' or public.is_exam_class_teacher(exam_id))
  with check (public.current_role_name() = 'Super Admin' or public.is_exam_class_teacher(exam_id));

drop policy if exists "lms_questions_delete" on public.lms_questions;
create policy "lms_questions_delete"
  on public.lms_questions for delete
  to authenticated
  using (public.current_role_name() = 'Super Admin' or public.is_exam_class_teacher(exam_id));
