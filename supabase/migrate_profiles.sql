-- Jalankan SETELAH akun dibuat di Supabase Auth (Add User atau scripts/create-portal-users.mjs)
-- Email staf: {id}@smptamhar.com

update public.profiles set name = 'Tristian Novansyah, S.Kom', role = 'Super Admin', must_change_password = true
  where email = 'superadmin@smptamhar.com';

update public.profiles set name = 'Aditya Pratama (Ketua OSIS)', role = 'Managerial OSIS'
  where email = 'ketua.osis@smptamhar.com';

update public.profiles set name = 'Siti Rahmawati (Bendahara OSIS)', role = 'Managerial OSIS'
  where email = 'bendahara.osis@smptamhar.com';

update public.profiles set name = 'Budi Santoso', role = 'Normal User', must_change_password = true
  where email = 'budi.siswa@smptamhar.com';

update public.profiles set name = 'Drs. Bambang Wijaya (Guru Piket)', role = 'Guru Piket'
  where email = 'bambang.piket@smptamhar.com';

update public.profiles set name = 'Dra. Elok Faiqoh (Guru)', role = 'Guru'
  where email = 'elok.guru@smptamhar.com';

update public.profiles set name = 'Hj. Endang Rahayu, M.Pd (Managerial Sekolah)', role = 'Managerial Sekolah'
  where email = 'endang.sekolah@smptamhar.com';

select email, name, role, must_change_password from public.profiles order by name;
