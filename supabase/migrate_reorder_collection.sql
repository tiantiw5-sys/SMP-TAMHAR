-- Reorder sebuah koleksi (dipakai pertama untuk Dokumentasi Galeri, tapi
-- generik untuk collection_key apa pun yang sama seperti append/update/delete
-- _collection_item) — dipanggil sekali setelah admin selesai drag-drop
-- mengubah urutan tampil. Jalankan di Supabase SQL Editor (self-hosted,
-- db.smptamhar.com). Idempotent.

-- Susun ulang array item di portal_collections.payload sesuai urutan id yang
-- dikirim client. Item yang id-nya TIDAK ada di p_ordered_ids (harusnya tidak
-- terjadi kalau client kirim daftar lengkap, tapi dijaga supaya tidak ada
-- data yang hilang diam-diam kalau client punya salinan usang) ditaruh di
-- akhir, mempertahankan urutan aslinya di antara mereka.
create or replace function public.reorder_collection(p_key text, p_ordered_ids text[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
  caller_role text;
  ordered_items jsonb;
  remaining_items jsonb;
begin
  select role into caller_role from public.profiles where id = auth.uid();
  if p_key in ('cash', 'fines', 'logs') then
    if caller_role is null or caller_role not in ('Super Admin', 'Managerial OSIS', 'Managerial Sekolah') then
      raise exception 'insufficient_privilege' using errcode = '42501';
    end if;
  elsif p_key in ('students', 'studentAttendance') then
    if caller_role is null or caller_role not in ('Super Admin', 'Managerial Sekolah', 'Guru Piket') then
      raise exception 'insufficient_privilege' using errcode = '42501';
    end if;
  elsif p_key = 'attendance' then
    if caller_role is null or caller_role not in ('Super Admin', 'Managerial Sekolah', 'Guru Piket', 'Guru') then
      raise exception 'insufficient_privilege' using errcode = '42501';
    end if;
  elsif p_key = 'settings' then
    if caller_role is null or caller_role <> 'Super Admin' then
      raise exception 'insufficient_privilege' using errcode = '42501';
    end if;
  elsif p_key in ('articles', 'gallery', 'teachers', 'uniforms', 'notifications', 'annotations') then
    if caller_role is null or caller_role not in ('Super Admin', 'Managerial OSIS', 'Managerial Sekolah', 'Guru Piket', 'Guru') then
      raise exception 'insufficient_privilege' using errcode = '42501';
    end if;
  end if;

  select coalesce(jsonb_agg(matched.elem order by wanted.ord), '[]'::jsonb)
  into ordered_items
  from unnest(p_ordered_ids) with ordinality as wanted(id, ord)
  join lateral (
    select payload_elem as elem
    from public.portal_collections pc, jsonb_array_elements(pc.payload) payload_elem
    where pc.collection_key = p_key and payload_elem->>'id' = wanted.id
    limit 1
  ) matched on true;

  select coalesce(jsonb_agg(elem), '[]'::jsonb)
  into remaining_items
  from public.portal_collections pc, jsonb_array_elements(pc.payload) elem
  where pc.collection_key = p_key
    and not (elem->>'id' = any(p_ordered_ids));

  update public.portal_collections
  set payload = coalesce(ordered_items, '[]'::jsonb) || coalesce(remaining_items, '[]'::jsonb),
      updated_at = now()
  where collection_key = p_key
  returning payload into result;

  if result is null then
    raise exception 'collection_not_found' using errcode = 'P0002';
  end if;

  return result;
end;
$$;

revoke all on function public.reorder_collection(text, text[]) from public, anon;
grant execute on function public.reorder_collection(text, text[]) to authenticated;
