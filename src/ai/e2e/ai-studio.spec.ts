import { expect, test, type Page } from '@playwright/test';

const PAGE = '/src/ai/dev/studio.html';

async function horizontalOverflow(page: Page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

async function ask(page: Page, text: string) {
  await page.getByRole('textbox', { name: 'Asistana mesaj yazın' }).fill(text);
  await page.getByRole('button', { name: 'Mesajı gönder' }).click();
}

/** Görünen metinlerin en küçük hesaplanmış yazı boyutu. */
async function smallestFont(page: Page) {
  return page.evaluate(() => {
    let min = Infinity;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const el = node.parentElement;
      if (!el || !node.textContent?.trim()) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      if (el.closest('.ai-visually-hidden')) continue;
      min = Math.min(min, parseFloat(getComputedStyle(el).fontSize));
    }
    return min;
  });
}

test.describe('AI Studio', () => {
  test('boş durumda yatay taşmaz', async ({ page }) => {
    await page.goto(PAGE);
    await expect(page.getByText('Merhaba, ben Atonota asistanı')).toBeVisible();
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    expect(await smallestFont(page)).toBeGreaterThanOrEqual(12);
  });

  test('tablo ve onay bloğuyla yatay taşmaz', async ({ page }) => {
    await page.goto(PAGE);
    await ask(page, 'Geciken siparişleri bul');
    const confirm = page.locator('[data-genui="confirm"]');
    await expect(confirm).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('[data-genui="table"]')).toBeVisible();
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    expect(await smallestFont(page)).toBeGreaterThanOrEqual(12);
    // Sipariş başlığı sözcük ortasından bölünmez.
    const header = page.locator('[data-genui="table"] th', { hasText: 'Sipariş' }).first();
    const lines = await header.evaluate((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      const tops = new Set([...range.getClientRects()].map((r) => Math.round(r.top)));
      return tops.size;
    });
    expect(lines).toBeLessThanOrEqual(1);
  });

  test('onay vermeden işlem mesajı oluşmaz, onayla yeni mesaj gelir', async ({ page }) => {
    await page.goto(PAGE);
    await ask(page, 'Geciken siparişleri bul');
    const confirm = page.locator('[data-genui="confirm"]');
    await expect(confirm).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/^Onaylıyorum/)).toHaveCount(0);
    await confirm.getByRole('button', { name: 'Gönder' }).click();
    await expect(page.getByText(/^Onaylıyorum/)).toBeVisible();
    await expect(page.getByRole('log')).toContainText('gerçek bir işlem yapılmadı', {
      timeout: 15_000,
    });
  });

  test('iptal akışı durdurur', async ({ page }) => {
    await page.goto(PAGE);
    await ask(page, 'Bu haftanın satış özetini çıkar');
    await page.getByRole('button', { name: 'Yanıtı durdur' }).click();
    await expect(page.getByText('Yanıt durduruldu.')).toBeVisible();
    await page.waitForTimeout(800);
    await expect(page.locator('[data-genui]')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Mesajı gönder' })).toBeVisible();
  });

  test('dar ekranda çekmeceler açılır ve taşmaz', async ({ page }, info) => {
    test.skip(
      (page.viewportSize()?.width ?? 0) >= 1140,
      `${info.project.name}: geniş ekranda çekmece yok`,
    );
    await page.goto(PAGE);
    await page.getByRole('button', { name: 'Sohbetleri aç' }).click();
    await expect(page.getByRole('navigation', { name: 'Sohbetler' })).toBeVisible();
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Çalışma alanını aç' }).click();
    await expect(page.getByRole('complementary', { name: 'Çalışma alanı' })).toBeVisible();
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  });

  test('azaltılmış harekette baykuş durur', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(PAGE);
    const owl = page.locator('svg.owl').first();
    await expect(owl).toHaveClass(/is-still/);
    expect(await owl.evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
    await expect(page.locator('svg.owl animateMotion')).toHaveCount(0);
  });

  test('hareket açıkken baykuş parçacıkları döner', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(PAGE);
    const owl = page.locator('svg.owl').first();
    expect(await owl.evaluate((el) => getComputedStyle(el).animationName)).toBe('owl-float');
    expect(await page.locator('svg.owl').first().locator('animateMotion').count()).toBe(3);
  });

  test('mesaj kutusu odakta çevreleyen halka çizmez', async ({ page }) => {
    await page.goto(PAGE);
    await page.getByRole('textbox', { name: 'Asistana mesaj yazın' }).click();
    const ring = await page.locator('.ai-sender .ant-sender').evaluate((el) => {
      const after = getComputedStyle(el, '::after');
      return {
        color: after.borderTopColor,
        width: after.borderTopWidth,
        outline: getComputedStyle(el).outlineStyle,
      };
    });
    expect(ring.color).not.toBe('rgb(0, 170, 204)');
    expect(ring.width).toBe('1px');
    expect(ring.outline).toBe('none');
  });
});
