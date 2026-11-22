import { defineConfig } from '@playwright/test';
import base from '../../../../playwright.config.ts';
export default defineConfig({
  ...base,
  testDir: '../../../../tests/e2e',
  workers: 2,
  outputDir: '../../../../.pane/qa/root-results',
  use: { ...base.use, baseURL: 'http://127.0.0.1:4321' },
  webServer: {
    command: 'npm run build && npx vite preview --host 127.0.0.1 --port 4321 --strictPort',
    cwd: '../../../..',
    url: 'http://127.0.0.1:4321',
    reuseExistingServer: false,
    timeout: 120000,
  },
});
