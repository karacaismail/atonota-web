import { expect, test, type Page } from '../setup/playwright-fixtures';

/**
 * Geniş ekranda sayfa içeriği dikey kayar (AJA-1435).
 * Geniş yerleşimde kabuk `100dvh` yüksekliğindedir ve `main` taşanı gizler.
 * Bu yüzden her sayfa içeriği kendi kaydırma kutusunda durmalıdır.
 * Test fare tekerleği, klavye ve dokunma ile içeriğin sonuna ulaşmayı dener.
 */
const WIDE = { width: 1366, height: 768 };
const ROUTES = [
  { path: '/_demo/genui', heading: 'Yapay zekâ yüzeyleri' },
  { path: '/administration', heading: null },
];

/** İçeriğin son öğesinin alt kenarı ile görünen alanın alt kenarı arasındaki fark (px). */
async function hiddenBelow(page: Page): Promise<number> {
  return page.evaluate(() => {
    const main = document.querySelector('main');
    if (!main) throw new Error('main yok');
    let last: Element | null = main;
    while (last && last.lastElementChild) {
      const children: Element[] = Array.from(last.children).filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      });
      const next: Element | undefined = children.at(-1);
      if (!next) break;
      last = next;
    }
    const bottom = (last as Element).getBoundingClientRect().bottom;
    const limit = Math.min(window.innerHeight, main.getBoundingClientRect().bottom);
    return Math.round(bottom - limit);
  });
}

async function open(page: Page, path: string, heading: string | null) {
  await page.setViewportSize(WIDE);
  await page.goto(path);
  if (heading) await expect(page.getByRole('heading', { name: heading })).toBeVisible();
  else await expect(page.locator('main h1').first()).toBeVisible();
  await expect(page.locator('.shell')).toHaveAttribute('data-layout', 'wide');
  // Ön koşul: içerik görünen alandan uzundur. Yoksa test bir şey kanıtlamaz.
  expect(await hiddenBelow(page)).toBeGreaterThan(100);
}

test.describe('geniş ekranda dikey kaydırma', () => {
  test.beforeEach(() => {
    // Genişlik testte 1366 px yapılır. Tek motorda bir proje yeterlidir.
    test.skip(
      !['chromium-desktop', 'webkit-desktop', 'chromium-tablet'].includes(test.info().project.name),
      'Yalnız masaüstü ve dokunmalı tablet projelerinde koşar.',
    );
  });

  for (const { path, heading } of ROUTES) {
    test(`${path} fare tekerleğiyle sonuna kadar kayar`, async ({ page }) => {
      await open(page, path, heading);
      const main = page.locator('main');
      const box = await main.boundingBox();
      if (!box) throw new Error('main kutusu yok');
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await expect(async () => {
        await page.mouse.wheel(0, 2000);
        expect(await hiddenBelow(page)).toBeLessThanOrEqual(1);
      }).toPass({ timeout: 10_000 });
    });

    test(`${path} klavyeyle sonuna kadar kayar`, async ({ page }) => {
      await open(page, path, heading);
      // Odak sayfa içeriğindeki ilk başlığa yakın, etkileşimsiz bir yerdedir.
      const h1 = page.locator('main h1').first();
      const box = await h1.boundingBox();
      if (!box) throw new Error('başlık kutusu yok');
      await page.mouse.click(box.x + box.width - 2, box.y + box.height / 2);
      await expect(async () => {
        await page.keyboard.press('End');
        expect(await hiddenBelow(page)).toBeLessThanOrEqual(1);
      }).toPass({ timeout: 10_000 });
    });

    test(`${path} dokunmayla sonuna kadar kayar`, async ({ page, browserName }, testInfo) => {
      test.skip(
        browserName !== 'chromium' || testInfo.project.name !== 'chromium-tablet',
        'Dokunma hareketi yalnız Chromium CDP ile üretilir.',
      );
      await open(page, path, heading);
      const box = await page.locator('main').boundingBox();
      if (!box) throw new Error('main kutusu yok');
      const cdp = await page.context().newCDPSession(page);
      await expect(async () => {
        await cdp.send('Input.synthesizeScrollGesture', {
          x: Math.round(box.x + box.width / 2),
          y: Math.round(box.y + box.height / 2),
          yDistance: -1500,
          gestureSourceType: 'touch',
          speed: 3000,
        });
        expect(await hiddenBelow(page)).toBeLessThanOrEqual(1);
      }).toPass({ timeout: 15_000 });
    });
  }
});
