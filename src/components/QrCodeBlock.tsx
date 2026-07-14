/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Blok QR code (2D) — dipakai kartu barcode guru & murid supaya bisa
 * di-scan dari HP tanpa perlu jarak/lurus persis seperti barcode 1D.
 */

import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface QrCodeBlockProps {
  value: string;
  size?: number;
}

export default function QrCodeBlock({ value, size = 108 }: QrCodeBlockProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;
    QRCode.toCanvas(canvasRef.current, value, {
      width: size,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' },
    }).catch(() => {
      /* invalid value — skip */
    });
  }, [value, size]);

  return <canvas ref={canvasRef} className="max-w-full h-auto" />;
}
