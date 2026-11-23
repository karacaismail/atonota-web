import { expect, test } from '../setup/playwright-fixtures';

/**
 * Tarayıcı testleri gerçek sunucuya istek atmaz. Ortak fixture `atonota.net` isteklerini yakalar.
 * Testin kendi yönlendirmesi yoksa istek kesilir ve test düşer.
 * `test.fail` bu düşmeyi bekler. Fixture çalışmazsa test "beklenmedik geçti" diye düşer.
 */
const LOGIN_PROBE = 'https://api.login.atonota.net/__e2e-koruma-denemesi';
const ENV_PROBE = 'https://api.login.alpha.atonota.net/__e2e-koruma-denemesi';

test.describe('gerçek sunucu koruması', () => {
  test('yönlendirmesiz gezinme gerçek giriş sunucusuna gitmez ve testi düşürür', async ({
    page,
  }) => {
    test.fail(true, 'Ortak fixture beklenmeyen isteği yakalar ve testi düşürür.');
    await page.goto(LOGIN_PROBE).catch(() => undefined);
  });

  test('yönlendirmesiz fetch ortam sunucusuna gitmez ve testi düşürür', async ({ page }) => {
    test.fail(true, 'Ortak fixture beklenmeyen isteği yakalar ve testi düşürür.');
    await page.evaluate(async (url) => {
      await fetch(url, { mode: 'no-cors' }).catch(() => undefined);
    }, ENV_PROBE);
  });

  /**
   * Panel incelemesi 2, K-1: uygulama sayfasında sahte sunucunun servis işçisi istekleri yönetir.
   * WebKit'te Playwright, işçinin ağa geçirdiği isteği görmez. Bu yüzden sahte sunucu
   * `atonota.net` isteğini işçide keser ve tarayıcı günlüğüne yazar. Fixture bu kaydı okur.
   * Test `test.fail` kullanmaz. Böylece başka bir hata testi geçirmez (inceleme e5-1, K-1).
   * Fixture kaydı boş değilse testi düşürür. Bu yolu yukarıdaki iki deneme sınar.
   */
  test('uygulama sayfasında servis işçisi gerçek sunucu isteğini ağ hatasına düşürür', async ({
    page,
    gercekSunucuIstekleri,
  }) => {
    await page.goto('/');
    await page.waitForFunction(() => navigator.serviceWorker?.controller != null);
    const outcome = await page.evaluate(async (url) => {
      try {
        const response = await fetch(url);
        return `yanıt ${response.status}`;
      } catch {
        return 'ağ hatası';
      }
    }, ENV_PROBE);
    // İstek ağa çıkmaz. Sayfa yanıt değil, ağ hatası alır.
    expect(outcome).toBe('ağ hatası');
    // Fixture kesilen isteği kaydeder. Test kaydı kendisi okur. Böylece test düşmez.
    await expect.poll(() => gercekSunucuIstekleri.peek()).toEqual([`GET ${ENV_PROBE}`]);
    gercekSunucuIstekleri.take();
  });

  test('testin kendi yönlendirmesi önce gelir ve test geçer', async ({ page }) => {
    await page.route(`${new URL(LOGIN_PROBE).origin}/**`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'text/html; charset=utf-8',
        body: '<title>Yerel yanıt</title>',
      }),
    );
    await page.goto(LOGIN_PROBE);
    await expect(page).toHaveTitle('Yerel yanıt');
  });
});
