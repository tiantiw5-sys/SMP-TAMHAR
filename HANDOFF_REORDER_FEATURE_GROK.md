# Handoff: Drag-reorder (Galeri, Seragam, Artikel)

**Status:** ✅ **SELESAI & LIVE** (2026-07-20)  
**Sumber kebenaran penuh:** `HANDOFF_CURRENT.md` §6  

## Ringkas

| Tab | Key | RPC |
|-----|-----|-----|
| Dokumentasi Galeri | `gallery` | `reorder_collection` |
| Jadwal Seragam | `uniforms` | sama |
| Artikel & Kegiatan | `articles` | sama |

- SQL: `supabase/migrate_reorder_collection.sql` — **sudah applied** produksi  
- Client: `src/lib/portalDb.ts` → `reorderCollection()`  
- UI: `StudentDashboard.tsx` — grip + debounce 600ms  
- Verifikasi: login **`admintian`** → drag → F5 → urutan tetap  

**Jangan** jalankan ulang migrasi / re-implement UI kecuali bug baru.

## Kredensial

`private-student-data/LOCAL_SECRETS.md` (gitignored) — jangan taruh key di handoff ini.
