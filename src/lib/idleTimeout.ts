/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Auto-logout setelah tidak ada aktivitas selama N milidetik — supaya kalau
 * ada yang login lalu meninggalkan komputer/HP begitu saja (misal komputer
 * bersama di kantor sekolah), sesi tidak tertinggal terbuka selamanya.
 */

import { useEffect, useRef } from 'react';

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'] as const;

export function useIdleTimeout(active: boolean, onIdle: () => void, timeoutMs: number): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onIdleRef = useRef(onIdle);
  onIdleRef.current = onIdle;

  useEffect(() => {
    if (!active) return;

    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => onIdleRef.current(), timeoutMs);
    };

    resetTimer();
    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, resetTimer, { passive: true }));

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, resetTimer));
    };
  }, [active, timeoutMs]);
}
