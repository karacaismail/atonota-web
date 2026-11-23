// AtonotA Login: giriş platformları, bağlı hesaplar ve tanıtım sayfası (G-159, G-160, G-165).
// Testler bütün projelerde koşar: 320 px telefondan masaüstüne kadar. Firefox koşulmaz.
import AxeBuilder from '@axe-core/playwright';
import type { Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { MOCK_SCENARIO_KEY } from '../../mocks/scenarios';

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'];

async function useScenario(page: Page, name: string) {
  await page.addInitScript(([key, value]) => sessionStorage.setItem(key, value), [
    MOCK_SCENARIO_KEY,
    name,
  ] as const);
}

/** Sayfa yatay taşıyor mu? Taşma piksel sayısını döner. 0 ya da eksi değer taşma yok demektir. */
async function pageOverflow(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

/**
 * Sonraki öğeye geçen tuş. Safari'de Tab yalnız form alanlarına gider.
 * Bağlantı ve düğmeye Option+Tab gider. Bu yüzden WebKit'te `Alt+Tab` basılır.
 */
function tabKey(page: Page): string {
  return page.context().browser()?.browserType().name() === 'webkit' ? 'Alt+Tab' : 'Tab';
}

/** Tab tuşuyla hedefe gider. Fare kullanılmaz. En çok 40 adım dener. */
async function tabTo(page: Page, target: Locator) {
  for (let step = 0; step < 40; step += 1) {
    await page.keyboard.press(tabKey(page));
    if (await target.evaluate((el) => el === document.activeElement)) return;
  }
  throw new Error('Hedefe klavyeyle ulaşılamadı.');
}

/** Hesaplanmış yazı boyutu en az 14 px mi? Görünen metin öğelerine bakar. */
async function smallestFont(root: Locator): Promise<number> {
  return root.evaluate((node) =>
    Math.min(
      ...Array.from(node.querySelectorAll('h1, h2, h3, p, a, button, li, span, strong'))
        .filter((el) => el.getBoundingClientRect().width > 0 && el.textContent?.trim())
        .map((el) => Number.parseFloat(getComputedStyle(el).fontSize)),
    ),
  );
}

test.describe('giriş ekranı platformları (G-159)', () => {
  test('açık platformlar veriden gelir, kapalı platform görünmez', async ({ page }) => {
    await useScenario(page, 'oturum-kapali');
    await page.goto('/');
    const main = page.getByRole('main', { name: 'Oturum açın' });
    await expect(main.getByRole('button', { name: 'AtonotA Login ile oturum aç' })).toBeVisible();
    const list = main.getByRole('list', { name: 'Başka bir hesapla oturum açın' });
    await expect(list.getByRole('button')).toHaveText([
      'Google ile oturum aç',
      'Facebook ile oturum aç',
      'LinkedIn ile oturum aç',
      'X ile oturum aç',
    ]);
    await expect(main.getByText('GitHub')).toHaveCount(0);

    expect(await pageOverflow(page)).toBeLessThanOrEqual(0);
    expect(await smallestFont(main)).toBeGreaterThanOrEqual(14);
    const results = await new AxeBuilder({ page }).include('main').withTags(AXE_TAGS).analyze();
    expect(results.violations).toEqual([]);
  });

  test('klavyeyle platform düğmesine basınca backend giriş yoluna gidilir', async ({ page }) => {
    await useScenario(page, 'oturum-kapali');
    await page.goto('/');
    const google = page.getByRole('button', { name: 'Google ile oturum aç' });
    await expect(google).toBeVisible();

    await tabTo(page, google);
    await page.keyboard.press('Enter');

    // Bu bir sayfa geçişidir. Sahte sunucu sayfa geçişini karşılamaz; adres yine değişir.
    await page.waitForURL(/platform_core\.api\.auth\.start_login/);
    const url = new URL(page.url());
    expect(url.searchParams.get('provider')).toBe('google');
    expect(url.searchParams.get('redirect_to')).toBe('/');
  });

  test('platform yoksa yalnız AtonotA Login düğmesi görünür', async ({ page }) => {
    await useScenario(page, 'platform-yok');
    await page.goto('/');
    const main = page.getByRole('main', { name: 'Oturum açın' });
    await expect(main.getByRole('button', { name: 'AtonotA Login ile oturum aç' })).toBeVisible();
    await expect(main.getByRole('button')).toHaveCount(1);
    await expect(main.getByRole('list')).toHaveCount(0);
  });
});

test.describe('bağlı hesaplar (G-160)', () => {
  test('kullanıcı bağı klavyeyle kaldırır, son giriş yolu kaldırılamaz', async ({ page }) => {
    await page.goto('/account');
    const region = page.getByRole('region', { name: 'Bağlı hesaplar' });
    const linkedin = region.getByRole('button', { name: 'LinkedIn bağını kaldır' });
    await expect(linkedin).toBeVisible();
    await expect(region.getByRole('link', { name: 'Facebook hesabını bağla' })).toHaveAttribute(
      'href',
      /platform_core\.api\.auth\.start_link\?provider=facebook&redirect_to=%2Faccount$/,
    );

    await tabTo(page, linkedin);
    await page.keyboard.press('Enter');
    const confirm = region.getByRole('group', { name: 'LinkedIn bağını kaldırma onayı' });
    await expect(confirm.getByRole('button', { name: 'Vazgeç' })).toBeFocused();
    await page.keyboard.press(tabKey(page));
    await expect(confirm.getByRole('button', { name: 'Bağı kaldır' })).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(region.getByRole('status')).toHaveText('LinkedIn bağı kaldırıldı.');
    await expect(region.getByRole('link', { name: 'LinkedIn hesabını bağla' })).toBeVisible();
    // Google artık tek giriş yoludur. Kaldırma düğmesi yoktur, nedeni yazılıdır.
    await expect(region.getByRole('button', { name: 'Google bağını kaldır' })).toHaveCount(0);
    await expect(
      region.getByText('Bu sizin son giriş yolunuz. Bu bağı kaldıramazsınız.'),
    ).toBeVisible();

    expect(await pageOverflow(page)).toBeLessThanOrEqual(0);
    const results = await new AxeBuilder({ page })
      .include('.module-page')
      .withTags(AXE_TAGS)
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('bağlama bağlantısı sayfa geçişiyle backend bağlama yoluna gider', async ({ page }) => {
    await page.goto('/account');
    const link = page.getByRole('link', { name: 'Facebook hesabını bağla' });
    await tabTo(page, link);
    await page.keyboard.press('Enter');
    await page.waitForURL(/platform_core\.api\.auth\.start_link/);
    const url = new URL(page.url());
    expect(url.searchParams.get('provider')).toBe('facebook');
    expect(url.searchParams.get('redirect_to')).toBe('/account');
  });
});

test.describe('tanıtım sayfası (G-165)', () => {
  test('oturum istemez, taşmaz ve dış adrese istek göndermez', async ({ page, baseURL }) => {
    const foreign: string[] = [];
    page.on('request', (request) => {
      const url = request.url();
      if (!url.startsWith(baseURL ?? '') && !url.startsWith('data:')) foreign.push(url);
    });
    // Oturum kapalıyken de sayfa açılır.
    await useScenario(page, 'oturum-kapali');
    await page.goto('/atonota-login');
    const main = page.getByRole('main', { name: 'AtonotA Login' });
    await expect(main.getByRole('heading', { level: 1 })).toHaveText('AtonotA Login');
    await expect(main.getByRole('region', { name: 'Bugün neler var?' })).toBeVisible();
    await expect(main.getByRole('region', { name: 'Yakında' })).toBeVisible();
    await expect(main.getByText('Fiyat henüz açıklanmadı.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Oturum açın' })).toHaveCount(0);

    expect(await pageOverflow(page)).toBeLessThanOrEqual(0);
    expect(await smallestFont(main)).toBeGreaterThanOrEqual(14);
    const results = await new AxeBuilder({ page }).include('main').withTags(AXE_TAGS).analyze();
    expect(results.violations).toEqual([]);
    expect(foreign).toEqual([]);
  });

  for (const scheme of ['light', 'dark'] as const) {
    test(`${scheme === 'dark' ? 'koyu' : 'açık'} temada tanıtım sayfası erişilebilirdir`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto('/atonota-login');
      await expect(page.locator('html')).toHaveAttribute('data-theme', scheme);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('AtonotA Login');
      const results = await new AxeBuilder({ page }).include('main').withTags(AXE_TAGS).analyze();
      expect(results.violations).toEqual([]);
    });
  }

  test('giriş ekranından tanıtım sayfasına klavyeyle gidilir', async ({ page }) => {
    await useScenario(page, 'oturum-kapali');
    await page.goto('/');
    const link = page.getByRole('link', { name: 'AtonotA Login nedir?' });
    await tabTo(page, link);
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/atonota-login$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('AtonotA Login');
  });
});
