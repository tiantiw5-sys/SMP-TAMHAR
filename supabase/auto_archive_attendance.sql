-- Auto-hapus catatan absensi (murid & guru) yang lebih tua dari 6 bulan.
-- Jalankan SEKALI di Supabase SQL Editor untuk mengaktifkan (aman dijalankan
-- ulang berkali-kali / idempotent).
--
-- PENTING: ini MENGHAPUS PERMANEN dari database, TIDAK ada backup otomatis
-- ke mana pun (disengaja — lihat diskusi soal ekspor otomatis data murid).
-- Kalau mau simpan riwayat lama sebelum terhapus, pakai tombol
-- "Backup & Ekspor Seluruh Data" di dashboard (menu Pengaturan) SEBELUM
-- tanggal 1 bulan berikutnya.

create extension if not exists pg_cron;

create or replace function public.trim_old_attendance()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cutoff date := (current_date - interval '6 months')::date;
begin
  update public.portal_collections
  set payload = (
    select coalesce(jsonb_agg(elem), '[]'::jsonb)
    from jsonb_array_elements(payload) as elem
    where (elem->>'date')::date >= cutoff
  ),
  updated_at = now()
  where collection_key = 'studentAttendance';

  update public.portal_collections
  set payload = (
    select coalesce(jsonb_agg(elem), '[]'::jsonb)
    from jsonb_array_elements(payload) as elem
    where (elem->>'date')::date >= cutoff
  ),
  updated_at = now()
  where collection_key = 'teacherAttendanceLog';
end;
$$;

-- Hapus jadwal lama dulu (kalau file ini pernah dijalankan sebelumnya)
-- supaya tidak dobel jadwal setiap kali script ini di-run ulang.
do $$
declare
  existing_jobid bigint;
begin
  select jobid into existing_jobid from cron.job where jobname = 'trim-old-attendance';
  if existing_jobid is not null then
    perform cron.unschedule(existing_jobid);
  end if;
end $$;

-- Jalan otomatis tiap tanggal 1, jam 03:00 UTC (= 10:00 WIB)
select cron.schedule(
  'trim-old-attendance',
  '0 3 1 * *',
  $$select public.trim_old_attendance();$$
);
