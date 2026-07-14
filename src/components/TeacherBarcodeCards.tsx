/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Kartu barcode guru — siap cetak untuk scanner USB/kamera di pintu masuk.
 */

import React, { useEffect, useMemo } from 'react';
import type { Teacher } from '../types';
import SchoolLogo from './SchoolLogo';
import QrCodeBlock from './QrCodeBlock';

interface TeacherBarcodeCardsProps {
  teachers: Teacher[];
}

export default function TeacherBarcodeCards({ teachers }: TeacherBarcodeCardsProps) {
  const list = useMemo(
    () => [...teachers].sort((a, b) => a.name.localeCompare(b.name, 'id')),
    [teachers]
  );

  useEffect(() => {
    document.title = 'Kartu Barcode Absensi Guru — SMP Taman Harapan';
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900 print:bg-white">
      <style>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          .no-print { display: none !important; }
          .card-grid { break-inside: avoid; }
        }
      `}</style>

      <header className="no-print sticky top-0 z-10 bg-slate-900 text-white px-6 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-700">
        <div>
          <h1 className="font-black text-lg">Kartu Barcode Absensi Guru</h1>
          <p className="text-slate-400 text-sm">{list.length} kartu — scan QR di pintu masuk</p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="px-5 py-2.5 rounded-xl bg-amber-400 text-slate-900 font-bold text-sm hover:bg-amber-300"
        >
          Cetak (Ctrl+P)
        </button>
      </header>

      <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 card-grid">
        {list.map((teacher) => (
          <article
            key={teacher.id}
            className="card-grid rounded-xl border-2 border-slate-200 bg-white p-4 flex flex-col items-center text-center shadow-sm print:shadow-none print:break-inside-avoid"
          >
            <div className="flex items-center gap-2 w-full mb-3 pb-2 border-b border-slate-100">
              <SchoolLogo className="w-10 h-10 shrink-0" />
              <div className="text-left min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-wide text-amber-700 leading-tight">
                  SMP Taman Harapan Bekasi
                </p>
                <p className="text-[10px] text-slate-500">Kartu Absensi Guru</p>
              </div>
            </div>

            <p className="font-black text-sm text-slate-900 leading-snug line-clamp-2 min-h-[2.5rem]">
              {teacher.name}
            </p>
            <p className="text-xs font-bold text-amber-800 mt-1">{teacher.subject}</p>

            <div className="mt-3 w-full flex justify-center bg-white rounded-lg py-2">
              <QrCodeBlock value={teacher.id} />
            </div>

            <p className="text-[10px] text-slate-400 mt-2 font-mono">
              {teacher.code !== undefined ? `Kode Mengajar ${teacher.code}` : teacher.position}
            </p>
          </article>
        ))}
      </div>

      <footer className="no-print text-center text-xs text-slate-500 py-8">
        Potong kartu → laminating opsional → tempel di ID card guru. Scanner membaca QR code.
      </footer>
    </div>
  );
}
