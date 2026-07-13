/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Capacitor } from '@capacitor/core';
import { registerSW } from 'virtual:pwa-register';

export function registerPwaServiceWorker() {
  // Service worker caching konflik dengan siklus update app native (App Store
  // sudah mengirim bundle terbaru lewat instalasi/update app, jadi SW cache
  // lama justru bisa menahan versi JS/CSS basi di WKWebView).
  if (Capacitor.isNativePlatform()) return;

  const updateSW = registerSW({
    onNeedRefresh() {
      if (window.confirm('Versi portal baru tersedia. Muat ulang sekarang?')) {
        updateSW(true);
      }
    },
    onOfflineReady() {
      console.info('[PWA] Portal siap digunakan secara offline.');
    },
  });
}