import { defineConfig, devices } from '@playwright/test';

/**
 * AI Studio tarayıcı testleri. Deneme sayfası geliştirme sunucusunda açılır.
 * Çalıştırma: `npx playwright test -c src/ai/e2e/playwright.config.ts`
 * Firefox koşulmaz (proje kararı).
 */
const PORT = 5179;
const chromium = devices['Desktop Chrome'];
const webkit = devices['Desktop Safari'];

export default defineConfig({
  testDir: '.',
  fullyParallel: true,
  reporter: [['list']],
  outputDir: '../../../test-results/ai-studio',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/src/ai/dev/studio.html`,
    // Sunucu depo kökünde çalışır. Yol bu dosyanın klasörüne göredir.
    cwd: '../../..',
    reuseExistingServer: true,
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
  ],
});
