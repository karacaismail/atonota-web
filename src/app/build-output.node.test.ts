// @vitest-environment node
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { build } from 'vite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/** Deneme sayfasının yalnız orada geçen metni. Üretim paketinde bulunmamalıdır. */
const DEMO_PAGE_MARKER = 'Arayüz temeli hazır';

let outDir = '';

async function buildProduction(): Promise<string> {
  const dir = mkdtempSync(join(tmpdir(), 'atonota-uretim-'));
  const saved = { mocks: process.env.VITE_API_MOCKS, nodeEnv: process.env.NODE_ENV };
  delete process.env.VITE_API_MOCKS;
  // Vitest NODE_ENV değerini `test` yapar. Gerçek üretim derlemesi `production` kullanır.
  process.env.NODE_ENV = 'production';
  try {
    await build({
      logLevel: 'silent',
      mode: 'production',
      build: { outDir: dir, emptyOutDir: true },
    });
  } finally {
    if (saved.mocks === undefined) delete process.env.VITE_API_MOCKS;
    else process.env.VITE_API_MOCKS = saved.mocks;
    process.env.NODE_ENV = saved.nodeEnv;
  }
  return dir;
}

function assetFiles(dir: string, ext: string): string[] {
  return readdirSync(join(dir, 'assets')).filter((name) => name.endsWith(ext));
}

/** index.html'nin hemen yüklediği dosyalar: script ve modulepreload bağlantıları. */
function initialAssets(dir: string): string[] {
  const html = readFileSync(join(dir, 'index.html'), 'utf8');
  const refs = [...html.matchAll(/(?:src|href)="\/?(assets\/[^"]+)"/g)].map((m) => m[1]!);
  return [...new Set(refs)];
}

beforeAll(async () => {
  outDir = await buildProduction();
}, 120_000);

afterAll(() => {
  if (outDir) rmSync(outDir, { recursive: true, force: true });
});

describe('üretim derlemesi (vite build)', () => {
  it('deneme sayfasını ve sahte sunucuyu içermez', () => {
    expect(existsSync(join(outDir, 'mockServiceWorker.js'))).toBe(false);
    for (const name of assetFiles(outDir, '.js')) {
      const text = readFileSync(join(outDir, 'assets', name), 'utf8');
      expect(text.includes(DEMO_PAGE_MARKER), `${name}: deneme sayfası metni`).toBe(false);
      expect(text.includes('_demo/foundation'), `${name}: deneme yolu`).toBe(false);
    }
  });

  it('paket rotalara ve kitaplıklara göre parçalıdır; ilk yük bütün paket değildir', () => {
    const js = assetFiles(outDir, '.js');
    expect(js.length).toBeGreaterThan(3);
    const total = js.reduce((sum, name) => sum + statSync(join(outDir, 'assets', name)).size, 0);
    const initial = initialAssets(outDir).filter((p) => p.endsWith('.js'));
    expect(initial.length).toBeGreaterThan(0);
    const initialBytes = initial.reduce((sum, p) => sum + statSync(join(outDir, p)).size, 0);
    // Kabuk ve sayfalar tembel yüklenir; ilk yük toplam JS'nin tamamı olamaz.
    expect(initialBytes).toBeLessThan(total);
    // Kitaplık parçaları ayrı dosyadadır; böylece sürüm değişince yalnız ilgili parça yeniden iner.
    expect(js.some((name) => name.startsWith('antd-'))).toBe(true);
    expect(js.some((name) => name.startsWith('react-'))).toBe(true);
  });
});
