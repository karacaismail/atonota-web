import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from '@playwright/test';

import base from '../../../playwright.config.ts';

const port = 5184;

export default defineConfig({
  ...base,
  testDir: './demo',
  use: { ...base.use, baseURL: `http://127.0.0.1:${port}` },
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${port}`,
    cwd: fileURLToPath(new URL('../../../', import.meta.url)),
    port,
  },
});
