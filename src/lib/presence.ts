/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Hitungan "online sekarang" yang NYATA (pakai Supabase Realtime Presence —
 * koneksi WebSocket langsung, bukan disimpan ke tabel), menggantikan angka
 * acak yang sebelumnya cuma dianimasikan naik-turun random di dashboard.
 * Cuma orang yang sedang membuka LANDING PAGE (belum/tidak login) yang
 * dihitung — dashboard staf hanya "mengintip" jumlahnya, tidak ikut dihitung.
 */

import { useEffect, useRef, useState } from 'react';
import { getSupabase } from './supabase';

const CHANNEL_NAME = 'landing-page-online';

export function useLandingPagePresence(shouldTrack: boolean): number {
  const [onlineCount, setOnlineCount] = useState(0);
  const idRef = useRef(Math.random().toString(36).slice(2));

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;

    const channel = supabase.channel(CHANNEL_NAME, {
      config: { presence: { key: idRef.current } },
    });

    channel.on('presence', { event: 'sync' }, () => {
      setOnlineCount(Object.keys(channel.presenceState()).length);
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED' && shouldTrack) {
        void channel.track({ online_at: new Date().toISOString() });
      }
    });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [shouldTrack]);

  return onlineCount;
}
