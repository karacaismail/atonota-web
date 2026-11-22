import { defineConfig } from '@playwright/test';
import base from '../../../../playwright.config.ts';
export default defineConfig({
  ...base,
  testDir: '.',
  testMatch: 'collection.spec.ts',
  workers: 2,
  outputDir: '../../../../.pane/qa/browser-results',
  use: { ...base.use, baseURL: 'http://127.0.0.1:4319', trace: 'retain-on-failure' },
  webServer: {
    command: 'node src/views/collection/qa/serve.mjs',
    cwd: '../../../..',
    url: 'http://127.0.0.1:4319/src/views/collection/preview/',
    reuseExistingServer: false,
    timeout: 120000,
  },
});
