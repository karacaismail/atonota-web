/* global process, URL */
/**
 * Kayıt ekranı tarayıcı testleri. Kök ayarın aynı tarayıcı matrisini kullanır
 * (320, 360, 375, 390 px, yatay telefon, tablet, masaüstü; Chromium, WebKit ve iPhone 13).
 * Firefox koşulmaz.
 *
 * Çalıştırma: npx playwright test -c src/views/record/e2e/playwright.config.mjs
 * Dosya .mjs uzantılıdır. Böylece `src` tip denetimi Node türlerini istemez.
 */
import { fileURLToPath } from 'node:url';

import { defineConfig } from '@playwright/test';

import root from '../../../../playwright.config.ts';

const PORT = 4184;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  ...root,
  testDir: '.',
  testMatch: '*.spec.ts',
  outputDir: '../../../../test-results/views-record',
  use: { ...root.use, baseURL: BASE_URL },
  webServer: {
    command: `npx vite src/views/record/harness --config vite.config.ts --port ${PORT} --strictPort --host 127.0.0.1`,
    cwd: fileURLToPath(new URL('../../../..', import.meta.url)),
    url: BASE_URL,
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
});
