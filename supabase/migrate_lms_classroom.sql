-- LMS EduHarapan — Fase 2b: Stream (pengumuman) + Materi (link)
-- Jalankan di Supabase SQL Editor (self-hosted, db.smptamhar.com). Idempotent.
-- Lihat docs/superpowers/specs/2026-07-17-lms-eduharapan-design.md untuk desain lengkap.

create table if not exists public.lms_announcements (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.lms_classes(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete restrict,
  text text not null,
  created_at timestamptz not null default now()
);

create index if not exists lms_announcements_class_idx on public.lms_announcements (class_id, created_at desc);

-- type: label bebas ('Slide' | 'PDF' | 'Video' | 'Link' | dst) — bukan enum,
-- supaya guru tidak terkunci daftar tetap, cuma label tampilan.
create table if not exists public.lms_materials (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.lms_classes(id) on delete cascade,
  title text not null,
  type text not null default 'Link',
  url text not null,
  uploaded_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists lms_materials_class_idx on public.lms_materials (class_id, created_at desc);

alter table public.lms_announcements enable row level security;

drop policy if exists "lms_announcements_select" on public.lms_announcements;
create policy "lms_announcements_select"
  on public.lms_announcements for select
  to authenticated
  using (
    public.current_role_name() = 'Super Admin'
    or public.is_class_teacher(class_id)
    or public.is_enrolled_in_class(class_id)
  );

drop policy if exists "lms_announcements_insert" on public.lms_announcements;
create policy "lms_announcements_insert"
  on public.lms_announcements for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and (public.current_role_name() = 'Super Admin' or public.is_class_teacher(class_id))
  );

drop policy if exists "lms_announcements_delete" on public.lms_announcements;
create policy "lms_announcements_delete"
  on public.lms_announcements for delete
  to authenticated
  using (public.current_role_name() = 'Super Admin' or public.is_class_teacher(class_id));

alter table public.lms_materials enable row level security;

drop policy if exists "lms_materials_select" on public.lms_materials;
create policy "lms_materials_select"
  on public.lms_materials for select
  to authenticated
  using (
    public.current_role_name() = 'Super Admin'
    or public.is_class_teacher(class_id)
    or public.is_enrolled_in_class(class_id)
  );

drop policy if exists "lms_materials_insert" on public.lms_materials;
create policy "lms_materials_insert"
  on public.lms_materials for insert
  to authenticated
  with check (
    uploaded_by = auth.uid()
    and (public.current_role_name() = 'Super Admin' or public.is_class_teacher(class_id))
  );

drop policy if exists "lms_materials_delete" on public.lms_materials;
create policy "lms_materials_delete"
  on public.lms_materials for delete
  to authenticated
  using (public.current_role_name() = 'Super Admin' or public.is_class_teacher(class_id));
