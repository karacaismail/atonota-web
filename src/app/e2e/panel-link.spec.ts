import type { Page } from '@playwright/test';
import { expect, test } from '../../../tests/setup/playwright-fixtures';

/**
 * Kayıt sayfasındaki bağlantı alanları ve CSP nonce. Kayıt sahte sunucudan gelir.
 * Arka uç bağlantı alanı için `link-select` bileşen adını yollar. Sahte sunucunun tanımı da öyledir.
 */
const LIST = `/ornek/${encodeURIComponent('örnek-kayıt')}`;
const RECORD = `${LIST}/ORNEK-0003`;

async function overflowX(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

async function openRecord(page: Page): Promise<void> {
  await page.goto(RECORD);
  await expect(page.getByRole('textbox', { name: /Örnek başlık/ })).toHaveValue('Örnek veri 3');
}

test.describe('kayıt sayfası: bağlantı alanı', () => {
  test('bağlantı alanı "Desteklenmeyen alan" yazmaz; sayfa yatay taşmaz', async ({ page }) => {
    await openRecord(page);
    await expect(page.getByText(/Desteklenmeyen alan/)).toHaveCount(0);
    await expect(page.getByRole('combobox', { name: /İlgili kayıt/ })).toBeVisible();
    expect(await page.locator('select').count()).toBe(0);
    expect(await overflowX(page)).toBeLessThanOrEqual(0);
  });

  test('salt okunur bağlantı hedef kaydı açar; klavyeyle Enter çalışır', async ({ page }) => {
    await openRecord(page);
    const link = page.getByRole('link', { name: 'ORNEK-0002' });
    await expect(link).toBeVisible();
    await link.focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => new URL(page.url()).pathname).toBe(`${LIST}/ORNEK-0002`);
    await expect(page.getByRole('textbox', { name: /Örnek başlık/ })).toHaveValue('Örnek veri 2');
  });

  test('düzenlenebilir bağlantı klavyeyle aranır ve seçilir', async ({ page }) => {
    await openRecord(page);
    const combobox = page.getByRole('combobox', { name: /İlgili kayıt/ });
    await combobox.focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.type('veri 5');
    const dropdown = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
    await expect(dropdown.getByText('Örnek veri 5', { exact: true })).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(
      page.locator('[data-fieldname="ilgili_kayit"] .ant-select-selection-item'),
    ).toHaveText('Örnek veri 5');
    await expect(page.getByText('1 kaydedilmemiş değişiklik')).toBeVisible();
    expect(await overflowX(page)).toBeLessThanOrEqual(0);
  });

  test('izni olmayan hedef türde arama hata verir ve kayıt göstermez', async ({ page }) => {
    await openRecord(page);
    const combobox = page.getByRole('combobox', { name: /Gizli kayıt/ });
    await combobox.focus();
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('[data-fieldname="gizli_kayit"] [role="alert"]')).toBeVisible();
    await expect(page.locator('.ant-select-dropdown').getByText(/ORNEK-|GIZLI-/)).toHaveCount(0);
  });
});

test.describe('CSP nonce', () => {
  test('sunucu nonce verince çalışma anındaki stil öğeleri CSP kuralını bozmaz', async ({
    page,
  }) => {
    const nonce = 'ornekNonce123';
    // Arka ucun /panel kuralının stil ve betik kısmı (backend shell/headers.py, panel_csp).
    const policy = `script-src 'self'; style-src 'self' 'nonce-${nonce}'`;
    await page.route(
      (url) => url.pathname === RECORD || url.pathname === encodeURI(RECORD),
      async (route) => {
        const response = await route.fetch();
        const html = (await response.text()).replace(
          '<head>',
          `<head><meta property="csp-nonce" nonce="${nonce}">`,
        );
        await route.fulfill({
          response,
          body: html,
          headers: { ...response.headers(), 'content-security-policy': policy },
        });
      },
    );
    await page.addInitScript(() => {
      const list: string[] = [];
      (window as unknown as { __csp: string[] }).__csp = list;
      document.addEventListener('securitypolicyviolation', (event) => {
        list.push(`${event.violatedDirective} ${event.blockedURI}`);
      });
    });
    await openRecord(page);
    await page.getByRole('combobox', { name: /İlgili kayıt/ }).click();
    await expect(page.locator('.ant-select-dropdown').first()).toBeVisible();
    const violations = await page.evaluate(() => (window as unknown as { __csp: string[] }).__csp);
    expect(violations).toEqual([]);
    // Stil gerçekten uygulandı: antd düğmesi kendi sınıfının stilini aldı.
    const unstyled = await page.evaluate(
      () => [...document.querySelectorAll('style')].filter((s) => !s.nonce).length,
    );
    expect(unstyled).toBe(0);
  });
});
