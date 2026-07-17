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

-- student_id = auth.uid() siswa yang login (uuid), pola sama seperti
-- lms_submissions.student_id di Fase 2c — BUKAN id blob roster.
create table if not exists public.lms_exam_attempts (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.lms_exams(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  status text not null default 'in_progress' check (status in ('in_progress', 'submitted', 'graded')),
  score numeric,
  unique (exam_id, student_id)
);

create index if not exists lms_exam_attempts_exam_idx on public.lms_exam_attempts (exam_id);
create index if not exists lms_exam_attempts_student_idx on public.lms_exam_attempts (student_id);

-- answer: jsonb — {"option": 2} untuk PG (index opsi yang dipilih) atau
-- {"text": "..."} untuk esai. essay_grade: poin yang diberikan guru untuk
-- jawaban esai ini secara spesifik (NULL = belum dinilai). Untuk PG,
-- benar/salahnya dihitung otomatis saat submit (Task 3 RPC), tidak
-- disimpan sebagai kolom terpisah di sini — cukup dari answer vs
-- lms_questions.correct_option saat itu.
create table if not exists public.lms_exam_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.lms_exam_attempts(id) on delete cascade,
  question_id uuid not null references public.lms_questions(id) on delete cascade,
  answer jsonb not null,
  essay_grade numeric,
  unique (attempt_id, question_id)
);

create index if not exists lms_exam_answers_attempt_idx on public.lms_exam_answers (attempt_id);

create table if not exists public.lms_violations (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.lms_exam_attempts(id) on delete cascade,
  type text not null,
  occurred_at timestamptz not null default now()
);

create index if not exists lms_violations_attempt_idx on public.lms_violations (attempt_id);

create or replace function public.is_exam_class_teacher_via_attempt(p_attempt_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.lms_exam_attempts a
    where a.id = p_attempt_id and public.is_exam_class_teacher(a.exam_id)
  )
$$;

revoke all on function public.is_exam_class_teacher_via_attempt(uuid) from public, anon;
grant execute on function public.is_exam_class_teacher_via_attempt(uuid) to authenticated;

create or replace function public.is_own_attempt(p_attempt_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.lms_exam_attempts a
    where a.id = p_attempt_id and a.student_id = auth.uid()
  )
$$;

revoke all on function public.is_own_attempt(uuid) from public, anon;
grant execute on function public.is_own_attempt(uuid) to authenticated;

alter table public.lms_exam_attempts enable row level security;

-- SELECT boleh siswa (baris sendiri) supaya frontend bisa cek "apakah
-- saya sudah attempt ujian ini" tanpa RPC tambahan — ini aman karena
-- baris attempt sendiri TIDAK mengandung correct_option (itu di
-- lms_questions, tabel terpisah yang memang tidak bisa diakses siswa).
drop policy if exists "lms_exam_attempts_select" on public.lms_exam_attempts;
create policy "lms_exam_attempts_select"
  on public.lms_exam_attempts for select
  to authenticated
  using (
    public.current_role_name() = 'Super Admin'
    or public.is_exam_class_teacher(exam_id)
    or student_id = auth.uid()
  );

-- TIDAK ADA policy insert/update di sini SENGAJA — pembuatan &
-- penyelesaian attempt HANYA lewat RPC start_exam_attempt()/
-- submit_exam_attempt() (Task 3), supaya auto-koreksi PG & validasi
-- status/kepemilikan terjadi terpusat di server, bukan lewat PATCH
-- langsung yang bisa dipalsukan klien (mis. siswa set score sendiri).

alter table public.lms_exam_answers enable row level security;

drop policy if exists "lms_exam_answers_select" on public.lms_exam_answers;
create policy "lms_exam_answers_select"
  on public.lms_exam_answers for select
  to authenticated
  using (
    public.current_role_name() = 'Super Admin'
    or public.is_exam_class_teacher_via_attempt(attempt_id)
    or public.is_own_attempt(attempt_id)
  );

-- Guru boleh UPDATE (dipakai isi essay_grade) — row-level saja, sama
-- seperti lms_submissions Fase 2c. Frontend WAJIB cuma kirim
-- { essay_grade } di body PATCH, tidak pernah kirim ulang `answer`.
drop policy if exists "lms_exam_answers_update" on public.lms_exam_answers;
create policy "lms_exam_answers_update"
  on public.lms_exam_answers for update
  to authenticated
  using (public.current_role_name() = 'Super Admin' or public.is_exam_class_teacher_via_attempt(attempt_id))
  with check (public.current_role_name() = 'Super Admin' or public.is_exam_class_teacher_via_attempt(attempt_id));

-- TIDAK ADA policy insert di sini SENGAJA — cuma lewat RPC
-- submit_exam_answer() (Task 3), sama alasannya dengan lms_exam_attempts.

alter table public.lms_violations enable row level security;

drop policy if exists "lms_violations_select" on public.lms_violations;
create policy "lms_violations_select"
  on public.lms_violations for select
  to authenticated
  using (
    public.current_role_name() = 'Super Admin'
    or public.is_exam_class_teacher_via_attempt(attempt_id)
    or public.is_own_attempt(attempt_id)
  );

-- TIDAK ADA policy insert langsung — lewat RPC report_violation() (Task 3).

-- Mengembalikan data ujian + daftar soal TANPA correct_option — ini
-- SATU-SATUNYA cara siswa "membaca" lms_questions. select di dalam RPC
-- ini SENGAJA menyebutkan kolom satu-satu (bukan select *) supaya
-- correct_option tidak bisa ikut kebawa kalau kolom baru ditambahkan
-- ke tabel di masa depan tanpa updateRPC ini.
create or replace function public.get_my_exam(p_exam_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not (public.is_enrolled_in_exam_class(p_exam_id) and public.is_exam_published(p_exam_id)) then
    raise exception 'exam_not_available' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'exam', jsonb_build_object('id', e.id, 'title', e.title, 'duration_minutes', e.duration_minutes),
    'questions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', q.id, 'order_index', q.order_index, 'type', q.type,
        'text', q.text, 'options', q.options, 'points', q.points
      ) order by q.order_index)
      from public.lms_questions q
      where q.exam_id = e.id
    ), '[]'::jsonb)
  ) into result
  from public.lms_exams e
  where e.id = p_exam_id;

  return result;
end;
$$;

revoke all on function public.get_my_exam(uuid) from public, anon;
grant execute on function public.get_my_exam(uuid) to authenticated;

-- Idempotent: kalau attempt untuk exam+siswa ini sudah ada, kembalikan
-- id yang sudah ada (bukan bikin baris baru / error) — supaya refresh
-- halaman ujian tidak menghasilkan attempt ganda.
create or replace function public.start_exam_attempt(p_exam_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_id uuid;
  new_id uuid;
begin
  if not (public.is_enrolled_in_exam_class(p_exam_id) and public.is_exam_published(p_exam_id)) then
    raise exception 'exam_not_available' using errcode = '42501';
  end if;

  select id into existing_id
  from public.lms_exam_attempts
  where exam_id = p_exam_id and student_id = auth.uid();

  if existing_id is not null then
    return existing_id;
  end if;

  insert into public.lms_exam_attempts (exam_id, student_id)
  values (p_exam_id, auth.uid())
  returning id into new_id;

  return new_id;
end;
$$;

revoke all on function public.start_exam_attempt(uuid) from public, anon;
grant execute on function public.start_exam_attempt(uuid) to authenticated;

create or replace function public.submit_exam_answer(p_attempt_id uuid, p_question_id uuid, p_answer jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  attempt_status text;
begin
  if not public.is_own_attempt(p_attempt_id) then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  select status into attempt_status from public.lms_exam_attempts where id = p_attempt_id;
  if attempt_status <> 'in_progress' then
    raise exception 'attempt_not_in_progress' using errcode = '22023';
  end if;

  insert into public.lms_exam_answers (attempt_id, question_id, answer)
  values (p_attempt_id, p_question_id, p_answer)
  on conflict (attempt_id, question_id) do update set answer = excluded.answer;
end;
$$;

revoke all on function public.submit_exam_answer(uuid, uuid, jsonb) from public, anon;
grant execute on function public.submit_exam_answer(uuid, uuid, jsonb) to authenticated;

-- Menghitung skor PG otomatis (bandingkan lms_exam_answers.answer->>'option'
-- dengan lms_questions.correct_option, jumlahkan points soal yang benar).
-- Soal esai TIDAK ikut dihitung di sini (essay_grade masih NULL sampai
-- guru menilai manual) — score hasil fungsi ini HANYA total PG, guru
-- menambah bagian esai belakangan lewat UPDATE lms_exam_attempts.score
-- (fase frontend berikutnya).
create or replace function public.submit_exam_attempt(p_attempt_id uuid)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  attempt_status text;
  mc_score numeric;
begin
  if not public.is_own_attempt(p_attempt_id) then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  select status into attempt_status from public.lms_exam_attempts where id = p_attempt_id;
  if attempt_status <> 'in_progress' then
    raise exception 'attempt_not_in_progress' using errcode = '22023';
  end if;

  select coalesce(sum(q.points), 0) into mc_score
  from public.lms_exam_answers ans
  join public.lms_questions q on q.id = ans.question_id
  where ans.attempt_id = p_attempt_id
    and q.type = 'mcq'
    and (ans.answer->>'option')::int = q.correct_option;

  update public.lms_exam_attempts
  set status = 'submitted', submitted_at = now(), score = mc_score
  where id = p_attempt_id;

  return mc_score;
end;
$$;

revoke all on function public.submit_exam_attempt(uuid) from public, anon;
grant execute on function public.submit_exam_attempt(uuid) to authenticated;

create or replace function public.report_violation(p_attempt_id uuid, p_type text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_own_attempt(p_attempt_id) then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  insert into public.lms_violations (attempt_id, type) values (p_attempt_id, p_type);
end;
$$;

revoke all on function public.report_violation(uuid, text) from public, anon;
grant execute on function public.report_violation(uuid, text) to authenticated;
