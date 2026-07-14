import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync, writeFileSync } from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');
const sourcePath = path.join(__dirname, 'logo-source.png');

// Logo asli SMP Taman Harapan (bukan lagi favicon.svg generik) — disimpan
// sekali secara lokal di scripts/logo-source.png supaya generate build tidak
// bergantung ke koneksi internet/Google Drive setiap kali build.
if (!existsSync(sourcePath)) {
  const LOGO_URL = 'https://lh3.googleusercontent.com/d/1L3fcyxjBaY4CfjW5-sLkGrge85Ixh5kA';
  const res = await fetch(LOGO_URL);
  if (!res.ok) throw new Error(`Gagal unduh logo sumber: ${res.status}`);
  writeFileSync(sourcePath, Buffer.from(await res.arrayBuffer()));
  console.log('Logo sumber diunduh ke scripts/logo-source.png');
}

const BG = '#0b1a30'; // navy tema portal — dipakai untuk ikon HP (bukan favicon tab)

// Favicon tab browser: transparan, cuma logonya saja tanpa kotak warna.
async function transparentIcon(size, padRatio = 0.06) {
  const inner = Math.round(size * (1 - padRatio * 2));
  return sharp(sourcePath)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({
      top: Math.round((size - inner) / 2),
      bottom: size - inner - Math.round((size - inner) / 2),
      left: Math.round((size - inner) / 2),
      right: size - inner - Math.round((size - inner) / 2),
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
}

// Ikon "Add to Home Screen" di HP: background solid navy — iOS/Android
// otomatis mengisi bagian transparan jadi HITAM kalau dipasang di layar
// utama, jadi untuk ikon ini backgroundnya sengaja dibuat solid.
async function solidIcon(size, padRatio = 0.1) {
  const inner = Math.round(size * (1 - padRatio * 2));
  const resized = await sharp(sourcePath)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: resized, gravity: 'center' }])
    .png()
    .toBuffer();
}

writeFileSync(path.join(publicDir, 'favicon.png'), await transparentIcon(64, 0.06));
console.log('Generated favicon.png (transparan)');

// favicon.ico — sebagian browser/bot lama minta file ini langsung di /favicon.ico
// tanpa peduli tag <link>. Kalau file ini tidak ada, aturan SPA fallback di
// .htaccess malah membalasnya dengan index.html (bukan gambar), jadi sebagian
// alat luar menampilkan ikon default/rusak. Isinya PNG biasa (browser modern
// mengenali lewat isi file, bukan ekstensi), jadi cukup pakai favicon 32px.
writeFileSync(path.join(publicDir, 'favicon.ico'), await transparentIcon(32, 0.06));
console.log('Generated favicon.ico');

const solidTargets = [
  { name: 'apple-touch-icon.png', size: 180, pad: 0.1 },
  { name: 'pwa-192x192.png', size: 192, pad: 0.1 },
  { name: 'pwa-512x512.png', size: 512, pad: 0.1 },
  { name: 'pwa-maskable-512x512.png', size: 512, pad: 0.2 },
];

for (const { name, size, pad } of solidTargets) {
  const buf = await solidIcon(size, pad);
  writeFileSync(path.join(publicDir, name), buf);
  console.log(`Generated ${name}`);
}
