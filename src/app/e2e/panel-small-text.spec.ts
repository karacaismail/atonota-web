import type { Page } from '@playwright/test';
import { expect, test } from '../../../tests/setup/playwright-fixtures';

/**
 * Kayıt sayfasındaki çok satırlı metin alanı. Kayıt sahte sunucudan gelir.
 * Arka uç Small Text alanı için `text-area` bileşen adını yollar. Sahte sunucunun tanımı da öyledir.
 */
const RECORD = `/ornek/${encodeURIComponent('örnek-kayıt')}/ORNEK-0003`;

async function overflowX(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

test.describe('kayıt sayfası: Small Text alanı', () => {
  test('Small Text alanı "Desteklenmeyen alan" yazmaz; çok satırlı metin kutusu olur', async ({
    page,
  }) => {
    await page.goto(RECORD);
    await expect(page.getByRole('textbox', { name: /Örnek başlık/ })).toHaveValue('Örnek veri 3');
    await expect(page.getByText(/Desteklenmeyen alan/)).toHaveCount(0);
    const box = page.getByRole('textbox', { name: /Açıklama/ });
    await expect(box).toBeVisible();
    expect(await box.evaluate((el) => el.tagName)).toBe('TEXTAREA');
    await expect(box).toHaveValue('Örnek veri 3 için açıklama.\nİkinci satır.');
    await box.focus();
    await page.keyboard.press('End');
    await page.keyboard.type(' Ek');
    await expect(box).toHaveValue('Örnek veri 3 için açıklama.\nİkinci satır. Ek');
    await expect(page.getByText('1 kaydedilmemiş değişiklik')).toBeVisible();
    const fontSize = await box.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(fontSize).toBeGreaterThanOrEqual(14);
    expect(await overflowX(page)).toBeLessThanOrEqual(0);
  });
});
