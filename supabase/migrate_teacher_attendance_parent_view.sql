-- RPC baru: expose absensi guru pada 1 tanggal tertentu ke SEMUA staf login
-- (termasuk role 'Orang Tua', yang tidak punya akses SELECT langsung ke
-- tabel teacher_attendance — lihat migrate_teacher_attendance_table.sql).
-- Dipakai Portal Orang Tua supaya bisa lihat guru yang mengajar anaknya
-- hari itu statusnya Hadir/Izin/Sakit/Alpa, tanpa perlu membuka akses baca
-- penuh ke tabel teacher_attendance untuk role Orang Tua.
--
-- Aman dijalankan berulang (idempotent).

create or replace function public.get_teacher_attendance_for_date(p_date date default current_date)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', ta.id,
    'teacherId', ta.teacher_id,
    'teacherName', ta.teacher_name,
    'date', to_char(ta.date, 'YYYY-MM-DD'),
    'status', ta.status,
    'recordedBy', ta.recorded_by
  )), '[]'::jsonb)
  from public.teacher_attendance ta
  where ta.date = p_date
$$;

revoke all on function public.get_teacher_attendance_for_date(date) from public, anon;
grant execute on function public.get_teacher_attendance_for_date(date) to authenticated;
