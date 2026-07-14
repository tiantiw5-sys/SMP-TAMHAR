/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Kamera HP / webcam — scan barcode & QR (NIS/NISN).
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, SwitchCamera } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

const SCANNER_ID = 'tamhar-camera-scanner';
const COOLDOWN_MS = 1800;
const CAMERA_RELEASE_MS = 400;

type CameraPick = string | { facingMode: string } | { deviceId: { exact: string } };

interface CameraMap {
  frontId?: string;
  backId?: string;
  devices: { id: string; label: string }[];
}

interface Props {
  onScan: (code: string) => void;
  active: boolean;
}

const FRONT_LABEL = /front|user|selfie|depan|face|facetime|inward/i;
const BACK_LABEL = /back|rear|environment|belakang|world|outward|trás|arrière/i;

async function buildCameraMap(): Promise<CameraMap> {
  const devices = await Html5Qrcode.getCameras();
  const list = devices.map((d) => ({ id: d.id, label: d.label || '' }));

  let frontId: string | undefined;
  let backId: string | undefined;

  for (const cam of list) {
    if (!frontId && FRONT_LABEL.test(cam.label)) frontId = cam.id;
    if (!backId && BACK_LABEL.test(cam.label)) backId = cam.id;
  }

  if (list.length >= 2) {
    if (!backId) backId = list[0]?.id;
    if (!frontId) frontId = list.find((c) => c.id !== backId)?.id ?? list[list.length - 1]?.id;
  } else if (list.length === 1 && !backId) {
    backId = list[0]?.id;
  }

  return { frontId, backId, devices: list };
}

function pickCamera(map: CameraMap, useFront: boolean): CameraPick {
  const id = useFront ? map.frontId : map.backId;
  if (id) return { deviceId: { exact: id } };
  return { facingMode: useFront ? 'user' : 'environment' };
}

function alternateCameraId(map: CameraMap, currentId?: string): string | undefined {
  const ids = map.devices.map((d) => d.id).filter(Boolean);
  if (ids.length < 2) return undefined;
  if (!currentId) return ids[1];
  const idx = ids.indexOf(currentId);
  return ids[(idx + 1) % ids.length];
}

export default function CameraBarcodeScanner({ onScan, active }: Props) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanRef = useRef<{ code: string; at: number }>({ code: '', at: 0 });
  const useFrontRef = useRef(false);
  const cameraMapRef = useRef<CameraMap | null>(null);
  const activeCameraIdRef = useRef<string | undefined>(undefined);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useFrontCamera, setUseFrontCamera] = useState(false);
  const [switching, setSwitching] = useState(false);

  const stopScanner = useCallback(async () => {
    const s = scannerRef.current;
    scannerRef.current = null;
    activeCameraIdRef.current = undefined;
    if (!s) return;
    try {
      if (s.isScanning) await s.stop();
      s.clear();
    } catch {
      /* ignore stop races */
    }
    setRunning(false);
  }, []);

  const runScanner = useCallback(
    async (cameraPick: CameraPick) => {
      const host = document.getElementById(SCANNER_ID);
      if (!host) throw new Error('Elemen kamera belum siap.');

      const scanner = new Html5Qrcode(SCANNER_ID, { verbose: false });
      scannerRef.current = scanner;

      const config = {
        fps: 12,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const w = Math.min(viewfinderWidth * 0.88, 320);
          const h = Math.min(viewfinderHeight * 0.45, 160);
          return { width: w, height: h };
        },
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODABAR,
          Html5QrcodeSupportedFormats.ITF,
        ],
      };

      await scanner.start(
        cameraPick,
        config,
        (decoded) => {
          const code = decoded.trim();
          const now = Date.now();
          const last = lastScanRef.current;
          if (code === last.code && now - last.at < COOLDOWN_MS) return;
          lastScanRef.current = { code, at: now };
          onScan(code);
        },
        () => {}
      );

      if (typeof cameraPick === 'object' && 'deviceId' in cameraPick && cameraPick.deviceId?.exact) {
        activeCameraIdRef.current = cameraPick.deviceId.exact;
      }
      setRunning(true);
    },
    [onScan]
  );

  const startScanner = useCallback(
    async (preferFront?: boolean) => {
      if (preferFront !== undefined) {
        useFrontRef.current = preferFront;
        setUseFrontCamera(preferFront);
      }

      setError(null);
      await stopScanner();
      await new Promise((r) => setTimeout(r, CAMERA_RELEASE_MS));

      try {
        if (!cameraMapRef.current) {
          cameraMapRef.current = await buildCameraMap();
        }

        const map = cameraMapRef.current;
        const wantFront = useFrontRef.current;
        const primary = pickCamera(map, wantFront);

        try {
          await runScanner(primary);
        } catch (primaryErr) {
          const fallback = { facingMode: wantFront ? 'user' : 'environment' };
          try {
            await stopScanner();
            await new Promise((r) => setTimeout(r, CAMERA_RELEASE_MS));
            await runScanner(fallback);
            return;
          } catch {
            const altId = alternateCameraId(map, activeCameraIdRef.current);
            if (altId) {
              await stopScanner();
              await new Promise((r) => setTimeout(r, CAMERA_RELEASE_MS));
              await runScanner({ deviceId: { exact: altId } });
              return;
            }
            throw primaryErr;
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(
          msg.includes('NotAllowed') || msg.includes('Permission')
            ? 'Izin kamera ditolak. Aktifkan kamera di pengaturan browser/HP.'
            : msg.includes('NotFound') || msg.includes('device') || msg.includes('Overconstrained')
              ? 'Kamera tidak ditemukan. Coba ganti depan/belakang atau refresh halaman.'
              : `Gagal membuka kamera: ${msg}`
        );
        setRunning(false);
      }
    },
    [stopScanner, runScanner]
  );

  useEffect(() => {
    if (active) {
      cameraMapRef.current = null;
      useFrontRef.current = false;
      setUseFrontCamera(false);
      const t = setTimeout(() => startScanner(false), 300);
      return () => {
        clearTimeout(t);
        stopScanner();
      };
    }
    stopScanner();
    return undefined;
  }, [active, startScanner, stopScanner]);

  useEffect(
    () => () => {
      stopScanner();
    },
    [stopScanner]
  );

  const toggleCamera = async () => {
    if (switching) return;
    setSwitching(true);
    const next = !useFrontRef.current;
    try {
      await startScanner(next);
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="space-y-3 w-full max-w-xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
          <Camera className="w-4 h-4" />
          Kamera HP / Webcam
          {running && (
            <span className="text-[9px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full animate-pulse">
              LIVE
            </span>
          )}
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={toggleCamera}
            disabled={switching}
            className="px-2.5 py-1.5 rounded-lg border border-slate-600 text-[10px] font-bold text-slate-300 hover:border-slate-400 flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <SwitchCamera className="w-3.5 h-3.5" />
            {switching ? 'Ganti...' : useFrontCamera ? 'Depan' : 'Belakang'}
          </button>
          {running ? (
            <button
              type="button"
              onClick={() => stopScanner()}
              className="px-2.5 py-1.5 rounded-lg border border-rose-800 text-[10px] font-bold text-rose-400 flex items-center gap-1 cursor-pointer"
            >
              <CameraOff className="w-3.5 h-3.5" />
              Matikan
            </button>
          ) : (
            <button
              type="button"
              onClick={() => startScanner()}
              className="px-2.5 py-1.5 rounded-lg bg-amber-400 text-[10px] font-bold text-slate-950 cursor-pointer"
            >
              Nyalakan Kamera
            </button>
          )}
        </div>
      </div>

      <div
        id={SCANNER_ID}
        className="w-full min-h-[240px] sm:min-h-[280px] rounded-xl overflow-hidden bg-black border border-slate-600 [&_video]:rounded-xl"
      />

      {error && (
        <p className="text-xs text-rose-400 bg-rose-400/10 border border-rose-900/50 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <p className="text-[10px] text-slate-500 leading-relaxed text-center">
        Tombol ganti kamera mendukung depan & belakang. Di HP butuh HTTPS —{' '}
        <span className="font-mono text-slate-400">https://&lt;IP-PC&gt;:3001</span>.
      </p>
    </div>
  );
}