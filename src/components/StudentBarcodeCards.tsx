/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Kartu barcode murid — siap cetak untuk scanner USB di pintu masuk.
 */

import React, { useEffect, useMemo } from 'react';
import type { Student } from '../types';
import SchoolLogo from './SchoolLogo';
import QrCodeBlock from './QrCodeBlock';

interface StudentBarcodeCardsProps {
  students: Student[];
  classFilter?: string;
}

export default function StudentBarcodeCards({ students, classFilter = 'all' }: StudentBarcodeCardsProps) {
  const list = useMemo(() => {
    return students
      .filter((s) => s.active)
      .filter((s) => classFilter === 'all' || s.className === classFilter)
      .sort((a, b) => a.className.localeCompare(b.className) || a.name.localeCompare(b.name, 'id'));
  }, [students, classFilter]);

  useEffect(() => {
    document.title = 'Kartu Barcode Absensi — SMP Taman Harapan';
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
          <h1 className="font-black text-lg">Kartu Barcode Absensi Murid</h1>
          <p className="text-slate-400 text-sm">{list.length} kartu — scan NIS di pintu masuk</p>
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
        {list.map((student) => (
          <article
            key={student.id}
            className="card-grid rounded-xl border-2 border-slate-200 bg-white p-4 flex flex-col items-center text-center shadow-sm print:shadow-none print:break-inside-avoid"
          >
            <div className="flex items-center gap-2 w-full mb-3 pb-2 border-b border-slate-100">
              <SchoolLogo className="w-10 h-10 shrink-0" />
              <div className="text-left min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-wide text-amber-700 leading-tight">
                  SMP Taman Harapan Bekasi
                </p>
                <p className="text-[10px] text-slate-500">Kartu Absensi {student.schoolYear}</p>
              </div>
            </div>

            <p className="font-black text-sm text-slate-900 leading-snug line-clamp-2 min-h-[2.5rem]">
              {student.name}
            </p>
            <p className="text-xs font-bold text-amber-800 mt-1">Kelas {student.className}</p>

            <div className="mt-3 w-full flex justify-center bg-white rounded-lg py-2">
              <QrCodeBlock value={student.nis} />
            </div>

            <p className="text-xs font-bold text-slate-700 mt-2 font-mono tracking-wide">NIS {student.nis}</p>
            <p className="text-[10px] text-slate-400 font-mono">NISN {student.nisn}</p>
          </article>
        ))}
      </div>

      <footer className="no-print text-center text-xs text-slate-500 py-8">
        Potong kartu → laminating opsional → tempel di ID card siswa. Scanner membaca barcode NIS.
      </footer>
    </div>
  );
}