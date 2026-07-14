/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Link2, Copy, Check, ImageOff, ImageIcon } from 'lucide-react';
import { normalizeImageUrl } from '../lib/imageUrl';

export default function DriveLinkConverter() {
  const [rawLink, setRawLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);

  const converted = normalizeImageUrl(rawLink);
  const isDriveLink = /^https?:\/\/(drive|docs)\.google\.com\//i.test(rawLink.trim());
  const wasConverted = converted !== rawLink.trim() && converted !== '';

  const handleCopy = async () => {
    if (!converted) return;
    try {
      await navigator.clipboard.writeText(converted);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable — no-op.
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#0b1d33] border border-slate-800 rounded-2xl p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
          <Link2 className="w-40 h-40 text-amber-400" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center space-x-2.5 text-amber-400 mb-2">
            <Link2 className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-widest bg-amber-400/10 px-2.5 py-1 rounded-full">Alat Bantu</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Konversi Link Google Drive</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Tempel link "Bagikan" biasa dari Google Drive, alat ini otomatis ubah jadi link yang bisa tampil sebagai foto di website
            (bukan halaman preview HTML yang gagal dimuat). Pastikan file di Drive di-set "Anyone with the link" agar bisa diakses publik.
          </p>
        </div>
      </div>

      <div className="bg-[#0b1d33] border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Link Google Drive (paste di sini)</label>
          <input
            type="text"
            value={rawLink}
            onChange={(e) => { setRawLink(e.target.value); setPreviewFailed(false); }}
            placeholder="https://drive.google.com/file/d/........./view?usp=sharing"
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
          />
        </div>

        {rawLink.trim() && (
          <>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Hasil Link Foto</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={converted}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-emerald-400 font-mono truncate"
                />
                <button
                  onClick={handleCopy}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 cursor-pointer transition-colors flex items-center gap-1.5 shrink-0"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Tersalin!' : 'Salin'}</span>
                </button>
              </div>
              {isDriveLink && !wasConverted && (
                <p className="text-[10px] text-amber-400">
                  Link ini terdeteksi dari Google Drive tapi ID file tidak ditemukan — pastikan link "Bagikan" lengkap ter-copy.
                </p>
              )}
              {!isDriveLink && (
                <p className="text-[10px] text-slate-500">Bukan link Google Drive — dipakai apa adanya tanpa perlu konversi.</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Preview</label>
              <div className="rounded-xl border border-slate-800 bg-slate-900 aspect-video flex items-center justify-center overflow-hidden">
                {!previewFailed ? (
                  <img
                    src={converted}
                    alt="Preview hasil konversi"
                    referrerPolicy="no-referrer"
                    onError={() => setPreviewFailed(true)}
                    onLoad={() => setPreviewFailed(false)}
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <div className="text-center text-slate-500 text-xs flex flex-col items-center gap-2 p-6">
                    <ImageOff className="w-8 h-8" />
                    <span>Foto gagal ditampilkan. Cek lagi apakah file di Drive sudah di-set "Anyone with the link".</span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {!rawLink.trim() && (
          <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
            <ImageIcon className="w-8 h-8" />
            <span>Tempel link Google Drive di atas untuk mulai konversi.</span>
          </div>
        )}
      </div>
    </div>
  );
}
