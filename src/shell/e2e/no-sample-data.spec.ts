import type { Page } from '@playwright/test';
import { expect, test } from '../../../tests/setup/playwright-fixtures';

/**
 * MVP denetimi: canlı panelde örnek veri yoktur.
 * Canlı panel sahte sunucuya bağlıdır. Sahte sunucunun menüsü boştur ve kredi ucu yoktur.
 */
const isCompact = (page: Page) => {
  const v = page.viewportSize();
  return !!v && (v.width <= 767 || v.height <= 499);
};

/** Yan menüyü açar. Telefonda menü çekmecededir. */
async function openSidebar(page: Page) {
  await page.goto('/');
  await expect(page.locator('.shell')).toBeVisible();
  if (isCompact(page)) {
    await page.getByRole('button', { name: 'Menüyü aç' }).click();
    await expect(page.getByRole('dialog', { name: 'Menü' })).toBeVisible();
  }
  return page.locator('.shell-sb');
}

test.describe('canlı panelde örnek veri yok', () => {
  test('çalışma alanı oturumun sitesidir, örnek şirket görünmez', async ({ page }) => {
    const sidebar = await openSidebar(page);
    await expect(sidebar.locator('.shell-ws')).toBeVisible();
    await expect(page.getByText(/Örnek Şirket/)).toHaveCount(0);
    // Tek çalışma alanı açılır liste değildir.
    await expect(sidebar.locator('button.shell-ws')).toHaveCount(0);
    await expect(sidebar.locator('[aria-haspopup="menu"]')).toHaveCount(0);
  });

  test('kredi ucu yoksa sayaç ve uydurma sayı görünmez', async ({ page }) => {
    await openSidebar(page);
    await expect(page.getByText('AI kredisi')).toHaveCount(0);
    await expect(page.getByRole('img', { name: /Kredinin/ })).toHaveCount(0);
  });

  test('sunucu menüsü boşsa hızlı eylem ve örnek öneri görünmez', async ({ page }) => {
    await openSidebar(page);
    await expect(page.getByRole('group', { name: 'Hızlı eylemler' })).toHaveCount(0);
    await expect(page.getByText('Günün özeti')).toHaveCount(0);
  });

  test('ana sayfa örnek ajan göstermez, durumu açıkça yazar', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Ana sayfa' })).toBeVisible();
    await expect(page.getByText('Panel özeti henüz yok. Menüden bir sayfa açın.')).toBeVisible();
    await expect(page.getByText('Bu sayfadaki veriler örnektir.')).toHaveCount(0);
  });

  test('klavyeyle gezinince çalışma alanı Tab sırasına girmez', async ({ page }) => {
    test.skip(isCompact(page), 'telefonda menü çekmecededir; çekmece testi ayrıdır');
    await page.goto('/');
    await expect(page.locator('.shell')).toBeVisible();
    // Tek çalışma alanı bir eylem değildir. İlk Tab durağı gezinme bağlantısı ya da düğmedir.
    for (let i = 0; i < 4; i += 1) {
      await page.keyboard.press('Tab');
      const inWorkspace = await page.evaluate(
        () => document.activeElement?.closest('.shell-ws') !== null,
      );
      expect(inWorkspace).toBe(false);
    }
  });

  test('telefonda çekmece klavyeyle açılır, örnek veri görünmez', async ({ page }) => {
    test.skip(!isCompact(page), 'yalnız telefon kabuğu');
    await page.goto('/');
    const menu = page.getByRole('button', { name: 'Menüyü aç' });
    await menu.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog', { name: 'Menü' })).toBeVisible();
    await expect(page.getByText(/Örnek Şirket/)).toHaveCount(0);
    await expect(page.getByText('AI kredisi')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(menu).toBeFocused();
  });
});
