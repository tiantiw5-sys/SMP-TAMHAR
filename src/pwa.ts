/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { registerSW } from 'virtual:pwa-register';

export function registerPwaServiceWorker() {
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