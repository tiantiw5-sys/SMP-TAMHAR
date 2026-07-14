-- ⚠️ JANGAN DIJALANKAN — sudah diverifikasi TIDAK diperlukan (audit 2026-07-07).
-- Menulis langsung ke auth.users/auth.identities (skema internal Supabase Auth
-- yang tidak didukung untuk ditulis manual). Akun superadmin sudah bekerja di
-- bawah domain @smptamhar.com (lihat log aktivitas) — src/constants.ts sudah
-- dikembalikan ke domain itu, jadi tidak perlu bikin akun baru di sini.

-- Jalankan di Supabase → SQL Editor (setelah schema.sql)
-- Membuat akun superadmin@tamhar.local password: superadmin (wajib ganti setelah login)

-- Buat akun Auth jika belum ada (aman dijalankan berulang)
create extension if not exists pgcrypto;

do $$
declare
  v_user_id uuid;
  v_email text := 'superadmin@tamhar.local';
begin
  select id into v_user_id from auth.users where email = v_email limit 1;

  if v_user_id is null then
    v_user_id := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, recovery_sent_at, last_sign_in_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_user_id, 'authenticated', 'authenticated', v_email,
      crypt('superadmin', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Tristian Novansyah, S.Kom"}'::jsonb,
      now(), now(), '', '', '', ''
    );

    insert into auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', v_email),
      'email', v_user_id::text, now(), now(), now()
    );
  end if;
end $$;

update public.profiles
set name = 'Tristian Novansyah, S.Kom', role = 'Super Admin', must_change_password = true
where email = 'superadmin@tamhar.local';

select email, name, role, must_change_password from public.profiles where email = 'superadmin@tamhar.local';