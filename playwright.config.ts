import { defineConfig, devices } from '@playwright/test';

// Birden çok çalışma ağacı aynı makinede test koşabilir. Kapı E2E_PORT ile değişir.
const PORT = Number(process.env['E2E_PORT'] ?? 4173);
const BASE_URL = `http://127.0.0.1:${PORT}`;

/**
 * Kabul sırası: 320, 360, 375, 390 px, yatay telefon, tablet, masaüstü.
 * Firefox koşulmaz (proje kararı). Genişlikler CSS px'tir.
 */
const chromium = devices['Desktop Chrome'];
const webkit = devices['Desktop Safari'];

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    // Tarayıcı testleri gerçek arka uca bağlanmaz. Derleme sahte sunucuyu (MSW) açar.
    command: `npm run build && npx vite preview --port ${PORT} --strictPort --host 127.0.0.1`,
    env: { VITE_API_MOCKS: 'on' },
    url: BASE_URL,
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium-320',
      use: { ...chromium, viewport: { width: 320, height: 568 }, hasTouch: true },
    },
    {
      name: 'chromium-360',
      use: { ...chromium, viewport: { width: 360, height: 740 }, hasTouch: true },
    },
    {
      name: 'chromium-375',
      use: { ...chromium, viewport: { width: 375, height: 667 }, hasTouch: true },
    },
    {
      name: 'chromium-390',
      use: { ...chromium, viewport: { width: 390, height: 844 }, hasTouch: true },
    },
    {
      name: 'chromium-landscape-phone',
      use: { ...chromium, viewport: { width: 844, height: 390 }, hasTouch: true },
    },
    {
      name: 'chromium-tablet',
      use: { ...chromium, viewport: { width: 1024, height: 768 }, hasTouch: true },
    },
    { name: 'chromium-desktop', use: { ...chromium, viewport: { width: 1440, height: 900 } } },
    { name: 'webkit-320', use: { ...webkit, viewport: { width: 320, height: 568 } } },
    { name: 'webkit-desktop', use: { ...webkit, viewport: { width: 1440, height: 900 } } },
    { name: 'iphone-13', use: { ...devices['iPhone 13'] } },
  ],
});
