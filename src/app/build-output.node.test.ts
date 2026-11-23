// @vitest-environment node
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { build } from 'vite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/** Deneme sayfasının yalnız orada geçen metni. Üretim paketinde bulunmamalıdır. */
const DEMO_PAGE_MARKER = 'Arayüz temeli hazır';

/** MSW kitaplığının paketteki izleri: kayıt çağrısı, günlük öneki ve işçi dosya adı. */
const MSW_MARKERS = ['setupWorker', '[MSW]', 'mockServiceWorker'];

/**
 * Tembel parçalar: kabuk (`App.tsx` içinde `import()`; parça adı `shell-` ya da `ShellApp-` olur),
 * yönlendirici ve ikon kitaplığı. Hiçbiri index.html'nin hemen yüklediği listede olamaz.
 */
const LAZY_CHUNKS = [
  { name: 'kabuk', test: /^(shell|ShellApp)-/ },
  { name: 'yönlendirici', test: /^router-/ },
  { name: 'ikonlar', test: /^icons-/ },
];

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
      // MSW kitaplığı da pakete girmez: işçi kaydı, kitaplık günlük öneki ve işçi dosya adı yoktur.
      for (const marker of MSW_MARKERS) {
        expect(text.includes(marker), `${name}: sahte sunucu izi "${marker}"`).toBe(false);
      }
    }
  });

  it('koleksiyon ve kayıt kaynağı zinciri ilk yükte değildir (orkestratör eki: ilk yük paketi)', () => {
    // Bu metinler yalnız koleksiyon modelinde ve kayıt bağdaştırıcısında geçer.
    const markers = ['Kayıt tanımı desteklenmiyor.', 'Alan adı yineleniyor.', 'RecordApiError'];
    for (const name of initialAssets(outDir).filter((file) => file.endsWith('.js'))) {
      const text = readFileSync(join(outDir, name), 'utf8');
      for (const marker of markers) {
        expect(text.includes(marker), `${name}: ilk yükte "${marker}"`).toBe(false);
      }
    }
  });

  it('paket rotalara ve kitaplıklara göre parçalıdır; kabuk, yönlendirici ve ikonlar ilk yükte değildir', () => {
    const js = assetFiles(outDir, '.js');
    const initial = initialAssets(outDir).filter((p) => p.endsWith('.js'));
    expect(initial.length).toBeGreaterThan(0);
    const lazy = js.filter((name) => !initial.includes(`assets/${name}`));
    // En az üç tembel parça: kabuk, yönlendirici ve ikonlar (kabuk oturum kurulunca iner).
    expect(lazy.length, lazy.join(', ')).toBeGreaterThanOrEqual(3);
    for (const chunk of LAZY_CHUNKS) {
      expect(
        js.some((name) => chunk.test.test(name)),
        `${chunk.name} parçası üretilir`,
      ).toBe(true);
      expect(
        initial.some((p) => chunk.test.test(p.replace(/^assets\//, ''))),
        `${chunk.name} parçası ilk yükte değildir`,
      ).toBe(false);
    }
    // Kitaplık parçaları ayrı dosyadadır; `antd-` eşleşmesi `antd-x-` parçasını saymaz.
    expect(js.some((name) => /^antd-(?!x-)/.test(name))).toBe(true);
    expect(js.some((name) => name.startsWith('antd-x-'))).toBe(true);
    expect(js.some((name) => name.startsWith('react-'))).toBe(true);
    const total = js.reduce((sum, name) => sum + statSync(join(outDir, 'assets', name)).size, 0);
    const initialBytes = initial.reduce((sum, p) => sum + statSync(join(outDir, p)).size, 0);
    expect(initialBytes).toBeLessThan(total);
  });
});
