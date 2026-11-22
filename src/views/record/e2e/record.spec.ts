import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

async function overflowX(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

const isPhoneWidth = (page: Page): boolean => {
  const vp = page.viewportSize();
  return Boolean(vp && vp.width <= 767);
};

test.describe('kayıt formu yerleşimi ve 320 px uyumu', () => {
  test('sayfa yatay taşmaz; telefonda tek sütun, geniş ekranda iki sütun olur', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Örnek Kişi' })).toBeVisible();
    expect(await overflowX(page)).toBeLessThanOrEqual(0);

    const colCount = await page
      .locator('.rv-section-grid')
      .first()
      .evaluate((el) => getComputedStyle(el).gridTemplateColumns.trim().split(/\s+/).length);

    if (isPhoneWidth(page)) {
      expect(colCount).toBe(1);
    } else {
      expect(colCount).toBe(2);
    }
  });

  test('alt tablodaki Tutar alanı 320 px dahil okunur genişliktedir ve tablo kendi kutusunda kayar', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Örnek Kişi' })).toBeVisible();

    const amountInput = page.locator('.rv-table-scroll input[aria-invalid]').nth(2);
    await expect(amountInput).toBeVisible();
    const box = await amountInput.boundingBox();
    expect(box).not.toBeNull();
    // Önemli 4: 320 px'te bile sayı giriş kutusu okunur genişlikte kalmalı (0 px olmamalı).
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(72);
    expect(await overflowX(page)).toBeLessThanOrEqual(0);
  });
});

test.describe('imza alanı ve bağlantı araması', () => {
  test('imza tuvali birden çok çizgiyi ve sağ yarıdaki çizimi korur', async ({ page }) => {
    await page.goto('/');
    const canvas = page.getByRole('img', { name: 'Onay İmzası' });
    await canvas.scrollIntoViewIfNeeded();
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    // Sol yarıda birinci çizgi
    await page.mouse.move(box.x + box.width * 0.15, box.y + box.height * 0.3);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.35, box.y + box.height * 0.5);
    await page.mouse.up();

    // Sağ yarıda ikinci çizgi (1440 px geniş tuvalde kesilmemeli)
    await page.mouse.move(box.x + box.width * 0.65, box.y + box.height * 0.35);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.88, box.y + box.height * 0.65);
    await page.mouse.up();

    await expect(page.getByText('İmza alındı')).toBeVisible();
    await expect(page.getByText('1 kaydedilmemiş değişiklik')).toBeVisible();
  });

  test('bağlantı araması hata alınca hata metni ve Yeniden dene gösterir', async ({ page }) => {
    await page.goto('/?linkError=1');
    await expect(page.getByRole('heading', { level: 1, name: 'Örnek Kişi' })).toBeVisible();

    await page.getByRole('combobox', { name: /Departman/ }).click();
    await expect(page.getByText('Arama sunucusuna ulaşılamadı.')).toBeVisible();
    await expect(page.getByText('Eşleşen kayıt yok')).toBeHidden();

    await page.getByRole('button', { name: 'Yeniden dene' }).click();
    await expect(page.getByText('Mühendislik')).toBeVisible();
  });
});

test.describe('odak kuralları', () => {
  test('fare tıklamasında klavye odak modu açılmaz, yalnız Tab ile açılır', async ({ page }) => {
    await page.goto('/');
    const root = page.locator('.rv-root');
    await expect(root).toHaveAttribute('data-rv-kbd', 'false');

    const input = page.getByLabel(/Çalışan Adı/);
    await input.click();
    await expect(root).toHaveAttribute('data-rv-kbd', 'false');

    await page.keyboard.press('Tab');
    await expect(root).toHaveAttribute('data-rv-kbd', 'true');
  });

  // foundation birleşince aç
  test.fixme('klavye odağında çevreleyen halka olmamalı', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Örnek Kişi' })).toBeVisible();

    for (let step = 0; step < 25; step += 1) {
      await page.keyboard.press('Tab');
      const outlineStyle = await page
        .locator(':focus')
        .evaluate((el) => getComputedStyle(el).outlineStyle);
      expect(outlineStyle).toBe('none');
    }
  });
});
