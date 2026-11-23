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
