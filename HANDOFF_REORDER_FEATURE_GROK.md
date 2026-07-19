# Handoff: Drag-reorder koleksi portal (Galeri, Seragam, Artikel) — Grok 2026-07-20

**Untuk:** Claude  
**Dari:** Grok  
**Status:** **SELESAI & LIVE** di `https://smptamhar.com`  
**Admin uji:** login **`admintian`** (bukan superadmin)

---

## Ringkasan

Fitur drag-drop mengubah **urutan tampil** di dashboard ERP, disimpan permanen lewat RPC `public.reorder_collection`. Dipakai di tiga tab:

| Tab dashboard | collection_key | UI drag |
|---------------|----------------|---------|
| Dokumentasi Galeri | `gallery` | Ya (manajerial) — **Claude** |
| Jadwal Seragam | `uniforms` | Ya (manajerial) — **Grok** |
| Artikel & Kegiatan | `articles` | Ya (manajerial) — **Grok** |

Landing page (`#uniforms`, berita, slideshow galeri) mengikuti urutan array di `portal_collections.payload`.

---

## Yang sudah di production

### 1. Migrasi SQL — **applied**

File: `supabase/migrate_reorder_collection.sql`

- Fungsi: `public.reorder_collection(p_key text, p_ordered_ids text[]) → jsonb`
- `SECURITY DEFINER`, cek role sama pola append/update collection
- Key yang diizinkan manajerial/guru (termasuk `articles`, `gallery`, `uniforms`) ada di body fungsi
- `GRANT EXECUTE` ke **`authenticated`** saja (bukan anon)
- Diverifikasi: RPC ada; tanpa session → `42501 insufficient_privilege` (permission-check OK)

**Jangan jalankan ulang kecuali ada perubahan SQL** (idempotent `create or replace`).

### 2. Frontend — **deployed live**

- Bundle main terkonfirmasi: `index-WEumedmf.js` (redeploy final sesi ini)
- `src/lib/portalDb.ts` → `reorderCollection(key, orderedIds)` memanggil RPC
- `src/components/StudentDashboard.tsx`:
  - `handleGalleryReorder` (debounce 600ms)
  - `handleUniformsReorder`
  - `handleArticlesReorder` (merge aman saat filter/search aktif)
  - UI: `Reorder.Group` + `GripVertical` (motion/framer)

### 3. Cara verifikasi UI (owner / Claude)

1. Login `admintian` di portal.
2. Buka tab → drag grip kiri → **F5**.
3. Urutan harus **tetap**. Landing page ikut.

---

## Commit terkait (portal `SMP-TAMHAR-new`)

Cek `git log` — yang relevan sesi reorder:

- (Claude) fitur galeri reorder + deploy frontend awal  
- `fc9f0b0` feat(uniforms): drag-reorder schedule like gallery  
- `15c5e3c` feat(articles): drag-reorder Artikel and Kegiatan list  
- Commit terbaru sesi penutup: `portalDb.reorderCollection` + migrasi SQL + handoff (jika di-commit Grok)

**Git status saat penutup:** `main` bisa **ahead of origin** beberapa commit — **belum tentu di-push**. Claude: `git status` / `git log origin/main..HEAD` lalu push kalau owner setuju.

---

## Yang TIDAK perlu dikerjakan ulang

1. Migrasi `reorder_collection` ke DB  
2. Deploy frontend reorder (sudah live)  
3. Implementasi drag uniforms & articles  

## Opsional / residual

- `git push origin main` untuk commit yang masih lokal  
- Residual uncommitted lain (migrate LMS lain, diagnose SQL, Bank Soal di LMS repo) — di luar fitur ini  
- LMS `SMP-TAMHAR-LMS` **tidak terlibat** di fitur reorder ini  

---

## File referensi

| File | Peran |
|------|--------|
| `supabase/migrate_reorder_collection.sql` | Migrasi RPC (sudah applied) |
| `src/lib/portalDb.ts` | `reorderCollection()` |
| `src/components/StudentDashboard.tsx` | UI drag 3 tab |
| `HANDOFF_REORDER_GALLERY.md` | Handoff Claude awal (galeri only) |
| **`HANDOFF_REORDER_FEATURE_GROK.md`** | Dokumen ini (status penuh) |
| `HANDOFF_GROK_SESSION_2026-07-19.md` | Sesi Grok sebelumnya (lockout, LMS, admintian) |

---

## Memory lokal Grok

- Project: `SMP-TAMHAR-new/.grok/MEMORY.md`  
- Global: `~/.grok/memory/SESSION_LOG.md`, `USER_PREFERENCES.md`  

**Owner preferensi:** selalu update memory lokal setelah kerja.
