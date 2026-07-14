/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Gerbang akses untuk #absen-murid, #kartu-barcode-murid, dan (lewat prop
 * `variant="guru"`) #absen-guru, #kartu-barcode-guru — role yang diizinkan
 * sama persis untuk murid & guru jadi dipakai bersama, bukan diduplikasi.
 * Hanya Super Admin, Manajerial Sekolah, dan Guru Piket.
 */

import React, { useState } from 'react';
import { Lock, ShieldAlert, ScanLine, ArrowLeft } from 'lucide-react';
import SchoolLogo from './SchoolLogo';
import { MURID_ATTENDANCE_ROLES } from '../lib/roleAccess';
import type { User } from '../types';

interface LoginProps {
  mode: 'login';
  variant?: 'murid' | 'guru';
  onSubmit: (e: React.FormEvent) => void;
  loginId: string;
  setLoginId: (v: string) => void;
  loginPassword: string;
  setLoginPassword: (v: string) => void;
  error?: string | null;
}

interface DeniedProps {
  mode: 'denied';
  variant?: 'murid' | 'guru';
  user: User;
  onBack: () => void;
}

type Props = LoginProps | DeniedProps;

export default function MuridAttendanceGate(props: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const label = props.variant === 'guru' ? 'guru' : 'murid';

  if (props.mode === 'denied') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-rose-950 text-white flex flex-col items-center justify-center px-6">
        <div className="max-w-md w-full text-center space-y-6">
          <SchoolLogo className="w-16 h-16 mx-auto" />
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-rose-500/15 border border-rose-400/40">
            <ShieldAlert className="w-10 h-10 text-rose-400" />
          </div>
          <h1 className="text-2xl font-black">Akses Ditolak</h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Akun <span className="text-white font-bold">{props.user.name}</span> ({props.user.role}) tidak
            memiliki izin modul absensi {label}.
          </p>
          <p className="text-xs text-slate-500">
            Role yang diizinkan: {MURID_ATTENDANCE_ROLES.join(', ')}.
          </p>
          <button
            type="button"
            onClick={props.onBack}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-800 border border-slate-600 text-sm font-bold hover:bg-slate-700 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Portal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950 text-white flex flex-col items-center justify-center px-6">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-3">
          <SchoolLogo className="w-16 h-16 mx-auto" />
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-400/15 border border-amber-400/40">
            <ScanLine className="w-10 h-10 text-amber-300" />
          </div>
          <h1 className="text-2xl font-black">Absensi {label === 'guru' ? 'Guru' : 'Murid'} — Login Wajib</h1>
          <p className="text-slate-400 text-sm">
            Scanner & absensi {label} hanya untuk Super Admin, Manajerial Sekolah, dan Guru Piket.
          </p>
          <p className="text-[10px] text-amber-400/90 max-w-sm mx-auto">
            Akun belum ada? Supabase Dashboard → Users → tambah superadmin@smptamhar.com (Auto Confirm).
          </p>
        </div>

        <form onSubmit={props.onSubmit} className="bg-slate-900/80 border border-slate-700 rounded-2xl p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase">ID Login</label>
            <input
              type="text"
              required
              value={props.loginId}
              onChange={(e) => props.setLoginId(e.target.value)}
              placeholder="e.g. bambang.piket"
              autoComplete="username"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:border-amber-400 outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={props.loginPassword}
                onChange={(e) => props.setLoginPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 pr-12 text-sm text-white focus:border-amber-400 outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-[10px] font-bold cursor-pointer"
              >
                {showPassword ? 'Sembunyi' : 'Lihat'}
              </button>
            </div>
          </div>

          {props.error && (
            <p className="text-xs text-rose-400 bg-rose-400/10 border border-rose-900/50 rounded-lg px-3 py-2">
              {props.error}
            </p>
          )}

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-400 text-slate-950 font-bold text-sm hover:bg-amber-300 cursor-pointer"
          >
            <Lock className="w-4 h-4" />
            Masuk & Buka Scanner
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            window.location.hash = '';
            window.location.reload();
          }}
          className="w-full text-center text-xs text-slate-500 hover:text-slate-300 cursor-pointer"
        >
          ← Kembali ke beranda portal
        </button>
      </div>
    </div>
  );
}