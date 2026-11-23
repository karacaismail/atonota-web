/**
 * Bütün tarayıcı testlerinin ortak `test` değeri. Testler `test` ve `expect` değerlerini
 * `@playwright/test` yerine bu dosyadan alır. Kural `src/app/e2e-fixture.node.test.ts` ile sınanır.
 *
 * Sahte Keycloak kökü gerçek üretim adresidir: `https://api.login.atonota.net`.
 * Bu fixture `atonota.net` alanına giden her isteği yakalar. İstek ağa çıkmaz, kesilir.
 * Testin kendi `page.route` yönlendirmesi önce gelir. Yakalanan istek beklenmeyen istektir.
 * Beklenmeyen istek varsa test sonunda düşer. Test: `tests/e2e/dis-istek-korumasi.spec.ts`.
 *
 * Sınır: Playwright, sayfanın servis işçisinin (MSW) kendisinin karşıladığı isteği görmez.
 * Böyle bir istek ağa çıkmaz. İşçinin ağa geçirdiği istek Chromium'da bu kurala düşer.
 */
import { test as base } from '@playwright/test';

import { isGuardedUrl } from './dis-istek';

export * from '@playwright/test';

export const test = base.extend<{ gercekSunucuKorumasi: undefined }>({
  gercekSunucuKorumasi: [
    async ({ context }, use) => {
      const unexpected: string[] = [];
      await context.route(isGuardedUrl, async (route) => {
        const request = route.request();
        unexpected.push(`${request.method()} ${request.url()}`);
        await route.abort('blockedbyclient');
      });
      await use(undefined);
      if (unexpected.length > 0) {
        throw new Error(
          `Test gerçek sunucuya istek attı. İstek kesildi. Testte page.route ile yönlendirme kurun:\n${unexpected.join('\n')}`,
        );
      }
    },
    { auto: true },
  ],
});
