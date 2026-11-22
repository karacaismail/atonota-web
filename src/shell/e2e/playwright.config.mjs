/* global process, URL */
/**
 * Kabuk tarayıcı testleri. Kök ayarın aynı tarayıcı matrisini kullanır.
 * Testler kabuk deneme sayfasında koşar. Firefox koşulmaz.
 *
 * Çalıştırma: npx playwright test -c src/shell/e2e/playwright.config.mjs
 * Dosya .mjs uzantılıdır. Böylece `src` tip denetimi Node türlerini istemez.
 */
import { fileURLToPath } from 'node:url';

import { defineConfig } from '@playwright/test';

import root from '../../../playwright.config.ts';

const PORT = 4180;
// Çıktı klasörü git dışındadır (test-results/).
const OUT = '../../../test-results/shell-harness';
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  ...root,
  testDir: '.',
  testMatch: '*.spec.ts',
  outputDir: '../../../test-results/shell',
  use: { ...root.use, baseURL: BASE_URL },
  webServer: {
    // Derlenmiş çıktıyla koşar. Geliştirme sunucusu tembel sayfada bağımlılık
    // paketleyip sayfayı yeniden yükler. Bu durum testleri kararsız yapıyordu.
    command: `npx vite build src/shell/harness --config vite.config.ts --outDir ${OUT} --emptyOutDir && npx vite preview src/shell/harness --config vite.config.ts --outDir ${OUT} --port ${PORT} --strictPort --host 127.0.0.1`,
    cwd: fileURLToPath(new URL('../../..', import.meta.url)),
    url: BASE_URL,
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
});
