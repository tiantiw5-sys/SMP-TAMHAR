-- Migrasi: pindahkan screenshot annotation (base64, langsung di JSON) ke
-- Supabase Storage — JSON cuma nyimpen URL, bukan lagi gambar penuh.
--
-- KENAPA: kolom imageDataUrl di collection_key='annotations' nyimpen
-- screenshot base64 ~80KB PER ITEM langsung di JSON. Dengan cuma 5 item,
-- total blob sudah 417KB. Setiap staf yang login/refresh menarik blob ini
-- utuh (tidak ada cache untuk user yang sudah login), DAN setiap 1 annotation
-- ditambah/diedit/ditandai selesai, seluruh blob (semua gambar) di-broadcast
-- ulang lewat Realtime ke semua tab/kiosk yang terbuka. Ini kontributor
-- egress paling besar saat ini — lebih besar dari studentAttendance yang
-- sudah diperbaiki sebelumnya (yang masih kosong/0 record).
--
-- Aman dijalankan berulang (idempotent).

insert into storage.buckets (id, name, public)
values ('annotations', 'annotations', true)
on conflict (id) do nothing;

-- Baca: publik (gambar feedback UI, bukan data murid/rahasia) — supaya
-- <img src="..."> bisa langsung load tanpa perlu signed URL/token.
drop policy if exists "annotations_storage_public_read" on storage.objects;
create policy "annotations_storage_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'annotations');

-- Upload: staf dengan role yang sama seperti akses fitur annotations di
-- portal_collections (lihat schema.sql portal_collections_staff_select).
drop policy if exists "annotations_storage_staff_write" on storage.objects;
create policy "annotations_storage_staff_write"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'annotations'
    and public.current_role_name() in ('Super Admin', 'Managerial OSIS', 'Managerial Sekolah', 'Guru Piket', 'Guru')
  );

drop policy if exists "annotations_storage_staff_delete" on storage.objects;
create policy "annotations_storage_staff_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'annotations'
    and public.current_role_name() in ('Super Admin', 'Managerial OSIS', 'Managerial Sekolah', 'Guru Piket', 'Guru')
  );
