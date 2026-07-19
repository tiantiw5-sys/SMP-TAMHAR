# Handoff: Migrasi SQL `reorder_collection` (untuk Grok)

> **UPDATE 2026-07-20:** Migrasi **SUDAH APPLIED** ke DB produksi. Drag juga sudah ada di **Seragam** + **Artikel**.  
> Lihat **`HANDOFF_CURRENT.md`** §6. Jangan jalankan ulang kecuali SQL berubah.

**Untuk:** Grok (lanjutan kerja dari Claude) — arsip  
**Dari:** Claude (sesi 2026-07-20)  
**Konteks (asli):** Fitur drag-drop urutan **Dokumentasi Galeri**. Frontend sudah live; migrasi SQL dulu menunggu Grok — **sekarang beres**.

## TUGAS (satu-satunya, sederhana)

1. Buka `https://db.smptamhar.com/` → SQL Editor.
2. Copy seluruh isi file `SMP-TAMHAR-new/supabase/migrate_reorder_collection.sql` di repo ini, paste, **Run**.
   - Isinya cuma nambah 1 fungsi baru `public.reorder_collection(p_key text, p_ordered_ids text[])` — SECURITY DEFINER, permission-check sama persis kayak `append_to_collection`/`update_collection_item` yang sudah ada. **Tidak mengubah/menghapus data apa pun**, murni additive, idempotent (aman dijalankan ulang kalau ragu).
3. Verifikasi cepat (paste satu-satu di SQL Editor, cocok ekspektasi = beres):

```sql
-- lihat isi gallery saat ini dulu buat tahu id-id yang valid
select payload from public.portal_collections where collection_key = 'gallery';

-- lalu coba reorder pakai urutan id APA ADANYA dulu (harus balik payload yang sama,
-- ini cuma tes fungsi bisa jalan tanpa efek samping — GANTI ['id1','id2',...] pakai id
-- asli dari hasil select di atas, urutan sama seperti aslinya)
-- select public.reorder_collection('gallery', array['id1','id2','id3']);
```

   (Fungsi ini butuh auth session `authenticated` buat cek role — kalau dites langsung di SQL Editor sebagai `postgres` superuser, `auth.uid()` akan `null` dan bisa kena `insufficient_privilege`. Kalau itu terjadi, **itu tandanya fungsi jalan dan permission-check-nya benar** — bukan bug. Verifikasi sungguhan yang lebih meyakinkan: coba drag-drop langsung di UI live sebagai `admintian` (Super Admin), lalu reload halaman — kalau urutan tetap sama setelah reload, migrasi berhasil applied.)

## Verifikasi end-to-end (opsional tapi disarankan)

1. Login `https://smptamhar.com` sebagai `admintian` (password: yang sudah ada, lihat handoff sebelumnya).
2. Buka tab **Dokumentasi Galeri**.
3. Drag salah satu item pakai ikon grip di kiri, geser ke posisi lain.
4. **Reload halaman** (F5).
5. Kalau urutan yang baru tetap bertahan setelah reload → migrasi sukses, fitur selesai total.
6. Kalau urutan balik ke semula setelah reload → migrasi belum ke-apply dengan benar, cek lagi step 2.

## File referensi

| File | Peran |
|------|--------|
| `supabase/migrate_reorder_collection.sql` | Migrasi ini — satu-satunya yang perlu dijalankan |
| `src/lib/portalDb.ts` | `reorderCollection()` — pemanggil RPC dari frontend |
| `src/components/StudentDashboard.tsx` | UI drag-drop (cari `Reorder.Group` / tab `gallery`) |

**Jangan ubah kode frontend** — itu sudah selesai & live, cukup jalankan migrasinya saja.
