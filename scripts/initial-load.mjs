#!/usr/bin/env node
/**
 * İlk yük ölçümü. Üretim derlemesini (`dist/`) önizleme sunucusunda açar, Chromium'da verilen
 * yolları ziyaret eder ve aktarılan baytları (sıkıştırılmış, CDP `encodedDataLength`) yazar.
 * Dış istekler (kimlik sunucusu gibi) kesilir; yalnız yerel paket ölçülür.
 *
 * Kullanım: node scripts/initial-load.mjs [--out dist] [--port 4381] [--width 360] [yol ...]
 * Önce `npm run build` (ya da `VITE_API_MOCKS=on npm run build:e2e`) çalıştırılmış olmalıdır.
 */
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';

const args = process.argv.slice(2);
function option(name, fallback) {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const [value] = args.splice(i, 2).slice(1);
  return value ?? fallback;
}
const outDir = option('out', 'dist');
const port = Number(option('port', '4381'));
const width = Number(option('width', '360'));
const paths = args.length ? args : ['/'];
const base = `http://127.0.0.1:${port}`;

const preview = spawn(
  'npx',
  [
    'vite',
    'preview',
    '--outDir',
    outDir,
    '--port',
    String(port),
    '--strictPort',
    '--host',
    '127.0.0.1',
  ],
  { stdio: 'ignore' },
);

async function waitForServer() {
  for (let i = 0; i < 100; i += 1) {
    try {
      if ((await fetch(`${base}/`)).ok) return;
    } catch {
      /* sunucu henüz açılmadı */
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Önizleme sunucusu açılmadı: ${base}`);
}

function kindOf(name) {
  if (name.endsWith('.js')) return 'JS';
  if (name.endsWith('.css')) return 'CSS';
  if (/\.woff2?$/.test(name)) return 'Yazı tipi';
  if (name === '/' || name.endsWith('.html')) return 'HTML';
  return 'Diğer';
}

async function measure(browser, path) {
  const context = await browser.newContext({
    viewport: { width, height: Math.round(width * 2.05) },
  });
  await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => route.abort());
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  const requests = new Map();
  cdp.on('Network.responseReceived', (e) =>
    requests.set(e.requestId, { url: e.response.url, encoded: 0 }),
  );
  cdp.on('Network.loadingFinished', (e) => {
    const r = requests.get(e.requestId);
    if (r) r.encoded = e.encodedDataLength;
  });
  await page.goto(base + path, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const rows = [...requests.values()]
    .filter((r) => r.url.startsWith(base))
    .map((r) => ({ name: r.url.slice(base.length), encoded: r.encoded }))
    .sort((a, b) => b.encoded - a.encoded);
  const totals = {};
  for (const r of rows) totals[kindOf(r.name)] = (totals[kindOf(r.name)] ?? 0) + r.encoded;
  const total = rows.reduce((sum, r) => sum + r.encoded, 0);
  console.log(`\n== ${path} (${width} px, Chromium, aktarılan bayt) ==`);
  for (const r of rows)
    console.log(`${String(r.encoded).padStart(8)} B  ${kindOf(r.name).padEnd(9)} ${r.name}`);
  for (const [k, v] of Object.entries(totals))
    console.log(`${k.padEnd(10)} ${(v / 1024).toFixed(1)} KB`);
  console.log(`TOPLAM     ${(total / 1024).toFixed(1)} KB, ${rows.length} istek`);
  await context.close();
}

try {
  await waitForServer();
  const browser = await chromium.launch();
  try {
    for (const path of paths) await measure(browser, path);
  } finally {
    await browser.close();
  }
} finally {
  preview.kill();
}
