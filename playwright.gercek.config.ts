import { defineConfig, devices } from '@playwright/test';

/**
 * Gerçek yığın kapısı (AJA-945). Dört panel rolü testi yerel yığındaki gerçek panelde koşar.
 * Sahte sunucu yoktur. Test, rolün inceleme hesabıyla AtonotA Login'e girer.
 *
 * Gerekenler:
 * 1. Yerel yığın açıktır: `backend/e2e/stack up` ve `backend/e2e/stack review-accounts`.
 * 2. Panel `npm run dev:yerel` ile açıktır. Keycloak dönüşü `http://localhost:5180` adresine gelir.
 * 3. Denenen panel aynı ya da başka bir porttadır. Örnek: `vite --mode yerel --port 5181`.
 *
 * Komut:
 * `PANEL_GERCEK_URL=http://localhost:5181/ PANEL_HESAPLAR=<yol>/review-accounts.json \
 *   npx playwright test -c playwright.gercek.config.ts`
 *
 * Bu kapı canlı sunucuya bağlanmaz. Adres `localhost` değilse kapı durur.
 */
const url = process.env['PANEL_GERCEK_URL'];
if (!url) throw new Error('PANEL_GERCEK_URL değişkeni gerekir. Örnek: http://localhost:5181/');
if (new URL(url).hostname !== 'localhost') {
  throw new Error('Gerçek yığın kapısı yalnız localhost adresinde koşar.');
}

const chromium = devices['Desktop Chrome'];

export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: ['rol-*.spec.ts'],
  fullyParallel: true,
  // Her işçi her hesapla bir kez girer. Az işçi Keycloak'u yormaz.
  workers: 2,
  retries: 0,
  reporter: [['list']],
  timeout: 60_000,
  use: {
    baseURL: url,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'gercek-chromium-320',
      use: { ...chromium, viewport: { width: 320, height: 568 }, hasTouch: true },
    },
    {
      name: 'gercek-chromium-desktop',
      use: { ...chromium, viewport: { width: 1440, height: 900 } },
    },
  ],
});
