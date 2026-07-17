# LMS EduHarapan — Fase 2b Skema: Stream + Materi Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tabel `lms_announcements` (Stream/pengumuman) dan `lms_materials` (Materi, berupa link — mengikuti pola `DriveLinkConverter.tsx` yang sudah ada di project ini, BUKAN upload file native/Supabase Storage) + RLS, supaya frontend `SMP-TAMHAR-LMS` bisa membangun tab Stream & Materi di atasnya.

**Architecture:** Melanjutkan pola Fase 1 persis — tabel relasional baru di skema `public`, RLS pakai fungsi `is_class_teacher()`/`is_enrolled_in_class()` yang SUDAH ADA (dibuat Fase 1, jangan dibuat ulang), guru pemilik kelas (`is_class_teacher`) boleh tulis, siswa yang enroll aktif (`is_enrolled_in_class`) boleh baca, Super Admin boleh semua.

**Tech Stack:** Sama seperti Fase 1 — SQL ad-hoc di `supabase/`, dijalankan manual di Supabase self-hosted (`db.smptamhar.com`).

## Global Constraints

- Tabel yang SUDAH ADA dari Fase 1 (jangan dibuat ulang): `lms_classes(id, name, class_code, teacher_id, color, created_at)`, `lms_enrollments(id, class_id, student_id, status, created_at)`, fungsi `is_class_teacher(uuid) returns boolean`, `is_enrolled_in_class(uuid) returns boolean`, RPC `get_my_classes()`.
- Materi = LINK (URL), bukan file upload — konsisten dengan pola `src/components/DriveLinkConverter.tsx` di project ini (guru share link Google Drive, bukan native upload ke Supabase Storage). Kolom `url` di `lms_materials` cukup `text`, tidak ada `storage_path`.
- SQL dijalankan manual oleh user di Supabase SQL Editor / lewat SSH VPS (operator step) — jangan pernah dieksekusi otomatis terhadap production tanpa konfirmasi eksplisit lebih dulu (walau di sesi ini user sudah beberapa kali bilang "autopilot", tetap sampaikan ringkas apa yang dijalankan sebelum eksekusi nyata ke production, konsisten dengan kebijakan project).
- Tidak ada test runner otomatis. "Test" = query verifikasi manual + panggilan REST dengan token asli.
- Pola cross-table RLS WAJIB lewat fungsi `security definer` (`is_class_teacher`/`is_enrolled_in_class` yang sudah ada) — JANGAN inline `exists (select ... from lms_classes ...)` langsung di dalam `create policy` (lihat komentar di `supabase/migrate_lms_foundation.sql` untuk alasan lengkap — ini bug rekursi RLS nyata yang pernah ditemukan Fase 1).

---

### Task 1: Tabel `lms_announcements` + `lms_materials` + RLS

**Files:**
- Create: `supabase/migrate_lms_classroom.sql`

**Interfaces:**
- Consumes: `public.is_class_teacher(uuid)`, `public.is_enrolled_in_class(uuid)`, `public.current_role_name()` (semua sudah ada dari Fase 1).
- Produces: tabel `public.lms_announcements(id uuid, class_id uuid, author_id uuid, text text, created_at timestamptz)`, tabel `public.lms_materials(id uuid, class_id uuid, title text, type text, url text, uploaded_by uuid, created_at timestamptz)`. Frontend Fase 2b (repo `SMP-TAMHAR-LMS`) memakai nama-nama ini persis.

- [ ] **Step 1: Tulis tabel**

Buat file baru `supabase/migrate_lms_classroom.sql`:

```sql
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
```

- [ ] **Step 2: RLS `lms_announcements`**

```sql
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
```

- [ ] **Step 3: RLS `lms_materials`**

```sql
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
```

- [ ] **Step 4: Verifikasi sintaks — baca ulang file lengkap**

Baca `supabase/migrate_lms_classroom.sql` dari awal sampai akhir. Pastikan: (1) tidak ada `exists (select ... from public.lms_classes` atau `...lms_enrollments` inline langsung di dalam blok `create policy` manapun — semua pengecekan lintas-tabel harus lewat `is_class_teacher()`/`is_enrolled_in_class()` yang sudah ada; (2) setiap `create table` pakai `if not exists`; (3) setiap `create policy` didahului `drop policy if exists` dengan nama yang sama persis.

- [ ] **Step 5: Commit**

```powershell
git add supabase/migrate_lms_classroom.sql
git commit -m "feat(lms): skema Fase 2b (lms_announcements, lms_materials, RLS)"
```

---

## Fase Berikutnya

Fase 2c menambah `lms_assignments`/`lms_submissions` (Tugas + Nilai) di file migrasi barunya sendiri, plus UI React di repo `SMP-TAMHAR-LMS` untuk tab Tugas (submit + nilai) dan Nilai (gradebook).
