import type { Page } from '@playwright/test';
import { expect, test } from '../../../tests/setup/playwright-fixtures';

import {
  isBottomBarOnly,
  isRingShadow,
  splitShadows,
  tokenColor,
} from '../../../tests/setup/odak-gostergesi';
import { SAMPLE_KEYCLOAK_URL, sampleLoginUrl } from '../../mocks/fixtures';
import { MOCK_START_LOGIN_KEY } from '../../mocks/handlers';
import { MOCK_SCENARIO_KEY } from '../../mocks/scenarios';

const BUTTON = 'AtonotA Login ile oturum aç';
const START_LOGIN = '/api/method/platform_core.api.auth.start_login';

/**
 * Sahte sunucu oturumu kapalı açar. Giriş ekranı görünür.
 * Sahte sunucu `start_login` isteğine 302 yanıtı verir. Yanıt Keycloak giriş adresini gösterir.
 * Keycloak adresi `api.login.atonota.net` köküdür. Tarayıcı oraya gidince boş bir sayfa döner.
 */
async function openLogin(page: Page): Promise<void> {
  await page.route(`${SAMPLE_KEYCLOAK_URL}/**`, (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<title>AtonotA Login</title>' }),
  );
  await page.addInitScript(([key, value]) => sessionStorage.setItem(key, value), [
    MOCK_SCENARIO_KEY,
    'oturum-kapali',
  ] as const);
  await page.goto('/panel');
  await expect(page.getByRole('heading', { name: 'Oturum açın' })).toBeVisible();
}

/**
 * Sahte sunucu sayfanın içinde çalışır. Playwright bu yüzden `start_login` isteğini görmez.
 * Sahte sunucu isteğin adresini oturum deposuna yazar. Test panele geri döner ve kaydı okur.
 */
async function readStartLogin(page: Page): Promise<URL> {
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Oturum açın' })).toBeVisible();
  const url = await page.evaluate((key) => sessionStorage.getItem(key), MOCK_START_LOGIN_KEY);
  expect(url).not.toBeNull();
  return new URL(url ?? '');
}

test.describe('AtonotA Login düğmesi', () => {
  test('düğme görünür ve marka adını tam yazar', async ({ page }) => {
    await openLogin(page);
    const button = page.getByRole('button', { name: BUTTON });
    await expect(button).toBeVisible();
    await expect(button).toHaveText(BUTTON);
    // 320 px genişlikte de sayfa yatay taşmaz.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  });

  test('düğmeye basınca start_login yoluna, sonra api.login.atonota.net köküne gidilir', async ({
    page,
  }) => {
    await openLogin(page);
    await page.getByRole('button', { name: BUTTON }).click();
    await expect(page).toHaveURL(sampleLoginUrl.login_url);
    expect(new URL(page.url()).origin).toBe('https://api.login.atonota.net');
    const startLogin = await readStartLogin(page);
    expect(startLogin.pathname).toBe(START_LOGIN);
    expect(startLogin.searchParams.get('redirect_to')).toBe('/panel');
  });

  test('düğme klavyeyle de basılır', async ({ page, browserName }) => {
    await openLogin(page);
    const button = page.getByRole('button', { name: BUTTON });
    // Tab tuşu görünür odak kipini açar. Alt+Tab kipi açmaz (odak kuralı).
    await page.keyboard.press('Tab');
    await expect(page.locator('html')).toHaveAttribute('data-focus-mode', 'keyboard');
    // Tab ile odak düğmeye gelir. Enter ile basılır.
    // macOS WebKit Tab ile düğmeye gitmez. Orada Alt+Tab kullanılır (controls.spec.ts ile aynı).
    const tab = browserName === 'webkit' ? 'Alt+Tab' : 'Tab';
    for (let i = 0; i < 10; i += 1) {
      if (await button.evaluate((node) => node === document.activeElement)) break;
      await page.keyboard.press(tab);
    }
    await expect(button).toBeFocused();
    // Çevreleyen odak halkası yoktur. outline ve box-shadow ikisi de denetlenir.
    const outline = await button.evaluate((node) => {
      const style = getComputedStyle(node);
      return style.outlineStyle === 'none' || style.outlineWidth === '0px';
    });
    expect(outline, 'outline').toBe(true);
    // Gösterge alt kenarda tek bir vurgu rengi çizgidir. Renk tokendan okunur (`--focus-indicator-color`).
    // Gösterge geçişle gelir. Test bu yüzden bekler.
    const FOCUS_RGB = await tokenColor(page, '--focus-indicator-color');
    const shadows = async () =>
      splitShadows(await button.evaluate((node) => getComputedStyle(node).boxShadow));
    await expect
      .poll(async () => (await shadows()).filter((p) => isBottomBarOnly(p, FOCUS_RGB)))
      .toHaveLength(1);
    const parts = await shadows();
    expect(
      parts.filter((p) => p.includes(FOCUS_RGB)),
      parts.join(' | '),
    ).toHaveLength(1);
    expect(parts.filter(isRingShadow), parts.join(' | ')).toEqual([]);
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(sampleLoginUrl.login_url);
    expect((await readStartLogin(page)).pathname).toBe(START_LOGIN);
  });
});
