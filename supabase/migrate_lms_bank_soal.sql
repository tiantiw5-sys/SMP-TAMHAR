-- LMS EduHarapan — Bank Soal AI untuk Simulasi TKA: skema + RPC.
-- Jalankan di Supabase SQL Editor (self-hosted, db.smptamhar.com). Idempotent.
-- Lihat docs/superpowers/specs/2026-07-18-bank-soal-ai-simulasi-tka-design.md
-- dan docs/superpowers/plans/2026-07-18-bank-soal-ai-simulasi-tka.md

-- ============================================================
-- TASK 1: Schema — class_id nullable, subject/source_note/is_remix
-- ============================================================

-- class_id sekarang boleh NULL khusus baris exam_type='simulasi' (soal
-- Simulasi TKA sekarang per-MAPEL, bukan per-rombel — satu set kelihatan ke
-- semua siswa/guru lintas kelas, bukan cuma satu kelas tertentu).
alter table public.lms_exams alter column class_id drop not null;

alter table public.lms_exams add column if not exists subject text;
alter table public.lms_exams add column if not exists source_note text;
alter table public.lms_exams add column if not exists is_remix boolean not null default false;

-- Backfill: kalau ada baris simulasi lama (dibuat lewat checkbox guru yang
-- sekarang dihapus) yang masih class_id NOT NULL + subject kosong, turunkan
-- subject dari nama kelasnya lalu kosongkan class_id-nya supaya konsisten
-- dengan model baru SEBELUM constraint di bawah ditambahkan.
update public.lms_exams e
set subject = trim(regexp_replace(c.name, ' ' || c.class_code || '$', '')),
    class_id = null
from public.lms_classes c
where e.class_id = c.id
  and e.exam_type = 'simulasi'
  and e.subject is null;

alter table public.lms_exams drop constraint if exists lms_exams_scope_check;
alter table public.lms_exams add constraint lms_exams_scope_check check (
  (exam_type = 'ujian' and class_id is not null)
  or (exam_type = 'simulasi' and class_id is null and subject is not null)
);

-- Enrollment kelas tidak berlaku untuk baris simulasi (tidak ada kelasnya) —
-- ganti jadi: siapa pun akun Siswa ATAU Guru aktif dianggap "boleh lihat".
-- Baris ujian biasa (class_id NOT NULL) TIDAK berubah perilakunya sama sekali.
create or replace function public.is_enrolled_in_exam_class(p_exam_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.lms_exams e
    where e.id = p_exam_id
      and (
        (e.class_id is not null and public.is_enrolled_in_class(e.class_id))
        or (e.class_id is null and public.current_role_name() in ('Siswa', 'Guru'))
      )
  )
$$;

-- lms_exams_select: tambah 1 cabang baru untuk baris simulasi published,
-- kelihatan ke Siswa DAN Guru manapun (bukan cuma yang terkait satu kelas).
-- Cabang lama (guru pemilik kelas / siswa terdaftar di kelas itu) TIDAK
-- diubah — is_class_teacher(null)/is_enrolled_in_class(null) otomatis false
-- untuk baris simulasi, jadi aman berdampingan.
drop policy if exists "lms_exams_select" on public.lms_exams;
create policy "lms_exams_select"
  on public.lms_exams for select
  to authenticated
  using (
    public.current_role_name() = 'Super Admin'
    or (class_id is not null and public.is_class_teacher(class_id))
    or (class_id is not null and status = 'published' and public.is_enrolled_in_class(class_id))
    or (class_id is null and status = 'published' and public.current_role_name() in ('Siswa', 'Guru'))
  );

-- get_my_exam: tambahkan exam_type ke hasil, dipakai ExamTaking.tsx untuk
-- tahu kapan harus pakai mode kunci-layar-ketat (Simulasi TKA) vs mode
-- catat-pelanggaran-biasa (ujian kelas). Select kolom tetap satu-satu
-- (bukan select *) — aturan keras yang sama seperti sebelumnya, correct_option
-- tidak boleh pernah ikut kebawa.
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
    'exam', jsonb_build_object(
      'id', e.id, 'title', e.title, 'duration_minutes', e.duration_minutes, 'exam_type', e.exam_type
    ),
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

-- ============================================================
-- TASK 2: RPC generate_bank_soal_questions
-- ============================================================

-- Menghasilkan DRAF soal PILIHAN GANDA dari file/gambar/teks yang diupload
-- Super Admin (soal ditemukan di internet, bukan dibuat AI dari nol seperti
-- generate_ai_questions). p_content: array jsonb, tiap item
-- {"type":"file","mime_type":"...","data_base64":"..."} (gambar/PDF, dikirim
-- apa adanya ke Gemini sebagai inline_data) ATAU {"type":"text","text":"..."}
-- (dipakai untuk Word/PPTX yang sudah diekstrak jadi teks di browser, dan
-- untuk p_answer_key kalau ada). TIDAK menulis ke lms_questions — draf
-- dikembalikan ke frontend dulu untuk ditinjau/diedit, sama seperti
-- generate_ai_questions.
create or replace function public.generate_bank_soal_questions(
  p_subject text,
  p_content jsonb,
  p_answer_key text default null,
  p_question_count integer default 30
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_api_key text;
  v_parts jsonb := '[]'::jsonb;
  v_item jsonb;
  v_prompt text;
  v_request_body jsonb;
  v_response http_response;
  v_response_body jsonb;
  v_gemini_text text;
  v_questions jsonb;
begin
  if public.current_role_name() <> 'Super Admin' then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  if p_content is null or jsonb_array_length(p_content) = 0 then
    raise exception 'no_content_provided' using errcode = '22023';
  end if;

  select value into v_api_key from public.app_secrets where key = 'gemini_api_key';
  if v_api_key is null then
    raise exception 'gemini_api_key_not_configured' using errcode = '22023';
  end if;

  v_prompt := format(
    'Kamu asisten penyusun bank soal Simulasi TKA (Tes Kemampuan Akademik) untuk SMP di Indonesia, mata pelajaran %s. Baca dokumen/gambar soal yang dilampirkan (soal ditemukan di internet), dan susun ulang jadi %s soal PILIHAN GANDA (4 opsi, satu jawaban benar), berbahasa Indonesia. %s Jawab HANYA dalam format JSON sesuai skema.',
    p_subject,
    p_question_count,
    case
      when p_answer_key is not null and length(trim(p_answer_key)) > 0
        then 'Kunci jawaban berikut disediakan, cocokkan nomor soal dengan kunci ini untuk menentukan opsi yang benar: ' || p_answer_key
      else 'TIDAK ada kunci jawaban yang disediakan untuk sebagian/semua soal — analisa sendiri jawaban yang paling tepat dan benar.'
    end
  );

  v_parts := jsonb_build_array(jsonb_build_object('text', v_prompt));

  for v_item in select * from jsonb_array_elements(p_content)
  loop
    if v_item->>'type' = 'file' then
      v_parts := v_parts || jsonb_build_array(jsonb_build_object(
        'inline_data', jsonb_build_object('mime_type', v_item->>'mime_type', 'data', v_item->>'data_base64')
      ));
    else
      v_parts := v_parts || jsonb_build_array(jsonb_build_object('text', v_item->>'text'));
    end if;
  end loop;

  v_request_body := jsonb_build_object(
    'contents', jsonb_build_array(jsonb_build_object('parts', v_parts)),
    'generationConfig', jsonb_build_object(
      'responseMimeType', 'application/json',
      'responseSchema', jsonb_build_object(
        'type', 'OBJECT',
        'properties', jsonb_build_object(
          'questions', jsonb_build_object(
            'type', 'ARRAY',
            'items', jsonb_build_object(
              'type', 'OBJECT',
              'properties', jsonb_build_object(
                'text', jsonb_build_object('type', 'STRING'),
                'options', jsonb_build_object('type', 'ARRAY', 'items', jsonb_build_object('type', 'STRING')),
                'correct_option', jsonb_build_object('type', 'INTEGER'),
                'points', jsonb_build_object('type', 'INTEGER')
              ),
              'required', jsonb_build_array('text', 'options', 'correct_option', 'points')
            )
          )
        ),
        'required', jsonb_build_array('questions')
      )
    )
  );

  perform http_set_curlopt('CURLOPT_TIMEOUT_MS', '60000');

  select * into v_response
  from http_post(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' || v_api_key,
    v_request_body::text,
    'application/json'
  );

  if v_response.status <> 200 then
    raise exception 'gemini_api_error_%', v_response.status using errcode = '22023';
  end if;

  v_response_body := v_response.content::jsonb;
  v_gemini_text := v_response_body #>> '{candidates,0,content,parts,0,text}';

  if v_gemini_text is null then
    raise exception 'gemini_empty_response' using errcode = '22023';
  end if;

  v_questions := (v_gemini_text::jsonb) -> 'questions';

  return coalesce(v_questions, '[]'::jsonb);
end;
$$;

revoke all on function public.generate_bank_soal_questions(text, jsonb, text, integer) from public, anon;
grant execute on function public.generate_bank_soal_questions(text, jsonb, text, integer) to authenticated;

-- ============================================================
-- TASK 3: RPC start_remix_attempt
-- ============================================================

-- Bikin 1 baris lms_exams "bayangan" (is_remix=true) berisi soal acak dari
-- SEMUA set Simulasi TKA published di satu mapel, lalu balikan id-nya —
-- caller (frontend) langsung pakai id ini persis seperti exam biasa lewat
-- start_exam_attempt/get_my_exam/ExamTaking yang SUDAH ADA, tidak ada kode
-- baru di jalur pengerjaan ujian sama sekali.
create or replace function public.start_remix_attempt(p_subject text, p_question_count integer default 30)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_available integer;
  v_new_exam_id uuid;
begin
  if public.current_role_name() not in ('Siswa', 'Guru') then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  select count(*) into v_available
  from public.lms_questions q
  join public.lms_exams e on e.id = q.exam_id
  where e.exam_type = 'simulasi' and e.subject = p_subject and e.status = 'published' and e.is_remix = false;

  if v_available = 0 then
    raise exception 'no_questions_available' using errcode = '22023';
  end if;

  insert into public.lms_exams (class_id, title, duration_minutes, status, exam_type, subject, is_remix, created_by)
  values (
    null,
    'Remix - ' || p_subject || ' - ' || to_char(now(), 'YYYY-MM-DD HH24:MI:SS'),
    75,
    'published',
    'simulasi',
    p_subject,
    true,
    auth.uid()
  )
  returning id into v_new_exam_id;

  insert into public.lms_questions (exam_id, order_index, type, text, options, correct_option, points)
  select v_new_exam_id, row_number() over (), qq.type, qq.text, qq.options, qq.correct_option, qq.points
  from (
    select q.type, q.text, q.options, q.correct_option, q.points
    from public.lms_questions q
    join public.lms_exams e on e.id = q.exam_id
    where e.exam_type = 'simulasi' and e.subject = p_subject and e.status = 'published' and e.is_remix = false
    order by random()
    limit least(p_question_count, v_available)
  ) qq;

  return v_new_exam_id;
end;
$$;

revoke all on function public.start_remix_attempt(text, integer) from public, anon;
grant execute on function public.start_remix_attempt(text, integer) to authenticated;
