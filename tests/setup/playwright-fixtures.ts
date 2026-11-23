/**
 * Bütün tarayıcı testlerinin ortak `test` değeri. Testler `test` ve `expect` değerlerini
 * `@playwright/test` yerine bu dosyadan alır. Kural `src/app/e2e-fixture.node.test.ts` ile sınanır.
 *
 * Sahte Keycloak kökü gerçek üretim adresidir: `https://api.login.atonota.net`.
 * Bu fixture `atonota.net` alanına giden her isteği yakalar. İstek ağa çıkmaz, kesilir.
 * Testin kendi `page.route` yönlendirmesi önce gelir. Yakalanan istek beklenmeyen istektir.
 * Beklenmeyen istek varsa test sonunda düşer. Test: `tests/e2e/dis-istek-korumasi.spec.ts`.
 *
 * Servis işçisi: Playwright, sayfanın servis işçisinin (MSW) karşıladığı isteği görmez.
 * WebKit, işçinin ağa geçirdiği isteği de göstermez. Bu yüzden sahte sunucu `atonota.net`
 * isteğini işçide keser ve tarayıcı günlüğüne bir kayıt yazar (`src/mocks/browser.ts`).
 * Fixture bu kaydı da beklenmeyen istek sayar. Chromium ve WebKit aynı yoldan geçer.
 */
import { test as base } from '@playwright/test';

import { isGuardedUrl, parseRealServerLogLine } from './dis-istek';

export * from '@playwright/test';

/** Yakalanan gerçek sunucu istekleri. Bilerek istek atan test kaydı `take` ile okur. */
export interface RealServerRequests {
  /** Kesilen isteği kaydeder: `<yöntem> <adres>`. */
  add(entry: string): void;
  /** Kaydı değiştirmeden döner. */
  peek(): string[];
  /** Kaydı döner ve boşaltır. Boş kayıtla test düşmez. */
  take(): string[];
}

export const test = base.extend<{
  gercekSunucuIstekleri: RealServerRequests;
  gercekSunucuKorumasi: undefined;
}>({
  gercekSunucuIstekleri: [
    // Playwright fixture işlevi ilk bağımsız değişkeni yapı bozmayla ister.
    // eslint-disable-next-line no-empty-pattern
    async ({}, use) => {
      const list: string[] = [];
      await use({
        add: (entry) => list.push(entry),
        peek: () => [...list],
        take: () => list.splice(0, list.length),
      });
    },
    { scope: 'test' },
  ],
  gercekSunucuKorumasi: [
    async ({ context, gercekSunucuIstekleri }, use) => {
      // Sahte sunucunun servis işçisinde kestiği istek. Kayıt tarayıcı günlüğüne düşer.
      context.on('console', (message) => {
        const request = parseRealServerLogLine(message.text());
        if (request) gercekSunucuIstekleri.add(request);
      });
      await context.route(isGuardedUrl, async (route) => {
        const request = route.request();
        gercekSunucuIstekleri.add(`${request.method()} ${request.url()}`);
        await route.abort('blockedbyclient');
      });
      await use(undefined);
      const unexpected = gercekSunucuIstekleri.take();
      if (unexpected.length > 0) {
        throw new Error(
          `Test gerçek sunucuya istek attı. İstek kesildi. Testte page.route ile yönlendirme kurun:\n${unexpected.join('\n')}`,
        );
      }
    },
    { auto: true },
  ],
});
