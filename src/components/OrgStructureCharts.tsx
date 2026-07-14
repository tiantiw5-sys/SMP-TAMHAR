/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Crown, Users, Shield, Camera, Palette, Film, Sparkles } from 'lucide-react';
import { ORG_STRUCTURE, OrgDivision } from '../orgStructure';

function Connector() {
  return (
    <div className="h-8 w-0.5 bg-amber-400/40 mx-auto relative">
      <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-amber-400" />
    </div>
  );
}

function getDivisionStyle(name: string) {
  if (name.includes('UMUM')) return 'from-blue-600/15 to-blue-900/5 border-blue-500/30 text-blue-400';
  if (name.includes('PIKET') || name.includes('PENGECEK')) return 'from-emerald-600/15 to-emerald-900/5 border-emerald-500/30 text-emerald-400';
  if (name.includes('KEAMANAN')) return 'from-rose-600/15 to-rose-900/5 border-rose-500/30 text-rose-400';
  if (name.includes('KREATIF') || name.includes('MADING')) return 'from-purple-600/15 to-purple-900/5 border-purple-500/30 text-purple-400';
  if (name.includes('DOKUMENTASI')) return 'from-orange-600/15 to-orange-900/5 border-orange-500/30 text-orange-400';
  if (name.includes('EDITING')) return 'from-cyan-600/15 to-cyan-900/5 border-cyan-500/30 text-cyan-400';
  if (name.includes('ROHANI')) return 'from-amber-600/15 to-amber-900/5 border-amber-500/30 text-amber-400';
  return 'from-slate-600/15 to-slate-900/5 border-slate-500/30 text-slate-400';
}

function DivisionIcon({ name }: { name: string }) {
  const className = 'w-4 h-4';
  if (name.includes('KEAMANAN')) return <Shield className={`${className} text-rose-400`} />;
  if (name.includes('KREATIF') || name.includes('MADING')) return <Palette className={`${className} text-purple-400`} />;
  if (name.includes('DOKUMENTASI')) return <Camera className={`${className} text-orange-400`} />;
  if (name.includes('EDITING')) return <Film className={`${className} text-cyan-400`} />;
  if (name.includes('ROHANI')) return <Sparkles className={`${className} text-amber-400`} />;
  return <Users className={`${className} text-blue-400`} />;
}

function DivisionCard({ division }: { division: OrgDivision }) {
  const style = getDivisionStyle(division.name);
  return (
    <div className={`bg-gradient-to-b ${style} border rounded-2xl p-5 shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all`}>
      <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-slate-950/40 flex items-center justify-center shrink-0">
            <DivisionIcon name={division.name} />
          </div>
          <h5 className="text-[11px] font-black uppercase tracking-wide leading-tight">{division.name}</h5>
        </div>
        <span className="text-[9px] font-extrabold bg-slate-950/50 px-2.5 py-1 rounded-full shrink-0 whitespace-nowrap">
          {division.members.length} Orang
        </span>
      </div>
      <ul className="space-y-2">
        {division.members.map((member, idx) => (
          <li key={member} className="flex items-center gap-2.5">
            <span className="w-5 h-5 rounded-full bg-slate-950/50 text-[9px] font-black flex items-center justify-center shrink-0 text-current">
              {idx + 1}
            </span>
            <span className="text-xs font-semibold text-slate-200 leading-snug">{member}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SchoolOrgChartCompact() {
  const { school } = ORG_STRUCTURE;
  return (
    <div className="w-full h-full p-4 sm:p-6 bg-gradient-to-b from-[#091629] to-[#050f1b] flex flex-col justify-between">
      <div className="text-center">
        <span className="text-[10px] font-extrabold text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-full uppercase tracking-widest border border-amber-400/20">
          Tata Kepengurusan Sekolah
        </span>
        <h3 className="text-sm font-black text-white uppercase tracking-wider mt-2.5">SMP Taman Harapan Bekasi</h3>
      </div>
      <div className="flex-grow flex flex-col justify-center space-y-4 relative py-2">
        <div className="flex justify-center z-10">
          <div className="bg-slate-900 border-2 border-amber-400 px-4 py-2.5 rounded-xl text-center w-64 shadow-md">
            <span className="text-[8px] text-amber-400 uppercase tracking-widest font-black block leading-none mb-1">{school.kepalaSekolah.role}</span>
            <h4 className="text-xs font-black text-white">{school.kepalaSekolah.name}</h4>
            <p className="text-[9px] text-slate-400 leading-none mt-0.5">{school.kepalaSekolah.description}</p>
          </div>
        </div>
        <div className="w-0.5 h-3 bg-amber-400/40 mx-auto" />
        <div className="grid grid-cols-2 gap-3 z-10">
          <div className="bg-slate-900/90 border border-emerald-500/55 p-2 rounded-xl text-center shadow-md">
            <span className="text-[8px] text-emerald-400 uppercase tracking-widest font-extrabold block leading-none mb-1">Waka Kurikulum</span>
            <h4 className="text-[11px] font-extrabold text-white leading-tight">{school.wakaKurikulum.name}</h4>
            <p className="text-[8px] text-slate-400 leading-none mt-0.5">Bid. Kurikulum</p>
          </div>
          <div className="bg-slate-900/90 border border-blue-500/55 p-2 rounded-xl text-center shadow-md">
            <span className="text-[8px] text-blue-400 uppercase tracking-widest font-extrabold block leading-none mb-1">Waka Kesiswaan</span>
            <h4 className="text-[11px] font-extrabold text-white leading-tight">{school.wakaKesiswaan.name}</h4>
            <p className="text-[8px] text-slate-400 leading-none mt-0.5">Bid. Kesiswaan</p>
          </div>
        </div>
        <div className="w-0.5 h-3 bg-amber-400/40 mx-auto" />
        <div className="flex justify-center z-10">
          <div className="bg-slate-900/90 border border-amber-400/50 px-4 py-2 rounded-xl text-center w-52 shadow-md">
            <span className="text-[8px] text-amber-400 uppercase tracking-widest font-extrabold block leading-none mb-0.5">{school.pembinaOsis.role}</span>
            <h4 className="text-[11px] font-bold text-white">{school.pembinaOsis.name}</h4>
            <p className="text-[8px] text-slate-400 leading-none mt-0.5">{school.pembinaOsis.description}</p>
          </div>
        </div>
      </div>
      <div className="text-center pt-2 border-t border-slate-800/80">
        <p className="text-[9px] text-slate-400">Data kepengurusan diperbarui secara resmi tahun ajaran 2026/2027.</p>
      </div>
    </div>
  );
}

export function SchoolOrgChartFull() {
  const { school } = ORG_STRUCTURE;
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-center">
        <div className="bg-[#0f2a4c] border-2 border-amber-400 p-5 rounded-2xl text-center w-80 shadow-lg relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-950 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">
            Pimpinan
          </div>
          <span className="text-[10px] text-amber-400 uppercase tracking-widest font-black block mb-1 mt-1">{school.kepalaSekolah.role}</span>
          <h4 className="text-base font-extrabold text-white">{school.kepalaSekolah.name}</h4>
          <p className="text-[11px] text-slate-400 font-medium mt-1">{school.kepalaSekolah.description}</p>
        </div>
      </div>
      <Connector />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        {[school.wakaKurikulum, school.wakaKesiswaan].map((person, idx) => (
          <div key={person.role} className="bg-[#0f2a4c] border border-slate-700/80 p-5 rounded-2xl text-center shadow-md hover:border-amber-400/30 transition-all">
            <span className={`text-[10px] uppercase tracking-widest font-black block mb-1 ${idx === 0 ? 'text-emerald-400' : 'text-blue-400'}`}>{person.role}</span>
            <h4 className="text-sm font-bold text-white">{person.name}</h4>
            <p className="text-[10px] text-slate-400 mt-1">{person.description}</p>
          </div>
        ))}
      </div>
      <Connector />
      <div className="flex justify-center">
        <div className="bg-[#071930] border border-slate-800 p-5 rounded-2xl text-center w-80 shadow-md hover:border-amber-400/30 transition-all">
          <span className="text-[10px] text-amber-400 uppercase tracking-widest font-black block mb-1">{school.pembinaOsis.role}</span>
          <h5 className="text-sm font-bold text-white">{school.pembinaOsis.name}</h5>
          <p className="text-[10px] text-slate-400 mt-1">{school.pembinaOsis.description}</p>
        </div>
      </div>
    </div>
  );
}

export function OsisOrgChartFull() {
  const { osis } = ORG_STRUCTURE;
  const officers = [osis.sekretaris1, osis.sekretaris2, osis.bendahara1, osis.bendahara2];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        <div className="bg-[#0f2a4c] border-2 border-amber-400 p-5 rounded-2xl text-center shadow-lg relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-950 text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <Crown className="w-2.5 h-2.5 fill-slate-950" />
            <span>{osis.ketuaOsis.role}</span>
          </div>
          <h4 className="text-base font-extrabold text-white capitalize mt-2">{osis.ketuaOsis.name}</h4>
          <p className="text-[11px] text-slate-400 font-medium mt-1">{osis.ketuaOsis.description}</p>
        </div>
        <div className="bg-[#0f2a4c] border-2 border-slate-400 p-5 rounded-2xl text-center shadow-lg relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-400 text-slate-950 text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full">
            <span>{osis.wakilKetuaOsis.role}</span>
          </div>
          <h4 className="text-base font-extrabold text-white capitalize mt-2">{osis.wakilKetuaOsis.name}</h4>
          <p className="text-[11px] text-slate-400 font-medium mt-1">{osis.wakilKetuaOsis.description}</p>
        </div>
      </div>
      <Connector />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
        {officers.map((person, idx) => (
          <div key={person.role} className="bg-[#0f2a4c]/80 border border-slate-700/80 p-4 rounded-2xl text-center hover:border-amber-400/30 transition-all relative">
            <span className={`text-[9px] uppercase tracking-widest font-black block mb-1 ${idx < 2 ? 'text-emerald-400' : 'text-amber-400'}`}>{person.role}</span>
            <h4 className="text-sm font-bold text-white capitalize">{person.name}</h4>
            <p className="text-[10px] text-slate-400 mt-1">{person.description}</p>
          </div>
        ))}
      </div>
      <Connector />
      <div className="text-center">
        <h4 className="text-[11px] font-black text-amber-400 uppercase tracking-widest bg-amber-400/10 px-4 py-1.5 rounded-full inline-block">
          DIVISI-DIVISI & KOORDINATOR OSIS
        </h4>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 pt-4 items-start">
        {osis.divisions.map((division) => (
          <div key={division.name}>
            <DivisionCard division={division} />
          </div>
        ))}
      </div>
    </div>
  );
}