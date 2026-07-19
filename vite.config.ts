import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const PWA_NAME = 'Portal SMP Taman Harapan Bekasi';
const PWA_SHORT_NAME = 'SMP TAMHAR';
const PWA_DESCRIPTION =
  'Portal resmi SMP Taman Harapan Bekasi — Bermata Hati. PPDB, berita sekolah, dan Portal ERP OSIS.';

export default defineConfig(({ mode }) => {
  const mobileHttps = mode === 'mobile';
  return {
    plugins: [
      react(),
      tailwindcss(),
      ...(mobileHttps ? [basicSsl()] : []),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.png', 'favicon.ico', 'pwa-192x192.png', 'pwa-512x512.png', 'apple-touch-icon.png'],
        manifest: {
          name: PWA_NAME,
          short_name: PWA_SHORT_NAME,
          description: PWA_DESCRIPTION,
          theme_color: '#0b1a30',
          background_color: '#071324',
          display: 'standalone',
          orientation: 'portrait-primary',
          scope: '/',
          start_url: '/',
          lang: 'id',
          dir: 'ltr',
          categories: ['education'],
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: 'pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          // Chunk hasil React.lazy (lihat App.tsx) untuk komponen
          // admin/staf/parent yang cuma dipakai SETELAH login (Dashboard ERP,
          // AnnotationMode, Portal Orang Tua, cetak kartu barcode) sengaja
          // TIDAK ikut precache — kalau ikut, Service Worker tetap akan
          // background-download semua chunk itu untuk SEMUA pengunjung
          // (termasuk yang belum login/publik) begitu SW ke-install, yang
          // meniadakan penghematan egress dari code-splitting itu sendiri.
          // Chunk-chunk ini tetap kepakai normal via HTTP cache biasa begitu
          // benar-benar dibuka (nama file sudah content-hashed).
          globIgnores: [
            '**/StudentDashboard-*.js',
            '**/AnnotationMode-*.js',
            '**/ParentDashboard-*.js',
            '**/StudentBarcodeCards-*.js',
            '**/TeacherBarcodeCards-*.js',
            '**/QrCodeBlock-*.js',
          ],
          // Tanpa ini, service worker (scope "/") ikut menangkap navigasi ke
          // /modul-ajar/ dan /mpls/ (aplikasi terpisah yang di-hosting di
          // subpath yang sama) dan malah menyajikan index.html ERP portal
          // yang ke-cache, bukan konten asli dari server.
          navigateFallbackDenylist: [/^\/modul-ajar(\/|$)/, /^\/mpls(\/|$)/],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/lh3\.googleusercontent\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-drive-images',
                expiration: {
                  maxEntries: 80,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'google-fonts-stylesheets',
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-webfonts',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: process.env.NODE_ENV !== 'production',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      ...(mobileHttps ? { https: {} } : {}),
      allowedHosts: true,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch:
        process.env.DISABLE_HMR === 'true'
          ? null
          : {
              ignored: ['**/*.zip', '**/dev-dist/**'],
            },
    },
  };
});
