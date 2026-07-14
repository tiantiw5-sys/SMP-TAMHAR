/**
 * Jalankan sekali untuk membuat tabel portal_collections.
 * Butuh database password dari Supabase Dashboard → Connect → URI.
 *
 * PowerShell:
 *   $env:SUPABASE_DB_PASSWORD="password-database-anda"
 *   node scripts/setup-supabase-schema.mjs
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';

const PROJECT_REF = 'tmbrfhjfjbfhrpplekyq';
const password = process.env.SUPABASE_DB_PASSWORD?.trim();

if (!password) {
  console.error('Set SUPABASE_DB_PASSWORD dulu (dari Supabase → Connect → Database password).');
  process.exit(1);
}

const connectionString =
  process.env.SUPABASE_DB_URL?.trim() ||
  `postgresql://postgres.${PROJECT_REF}:${encodeURIComponent(password)}@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`;

const __dirname = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(join(__dirname, '..', 'supabase', 'schema.sql'), 'utf8');

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  await client.query(sql);
  console.log('Schema berhasil dijalankan. Tabel portal_collections siap dipakai.');
} catch (error) {
  console.error('Gagal menjalankan schema:', error.message);
  console.error('Coba region pooler lain di SUPABASE_DB_URL, atau jalankan schema.sql manual di SQL Editor.');
  process.exit(1);
} finally {
  await client.end();
}