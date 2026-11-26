import type { Locator, Page } from '@playwright/test';
import { expect, test } from '../../../tests/setup/playwright-fixtures';

const DEMO = '/_demo/shell';

async function openSidebar(page: Page) {
  await page.goto(DEMO);
  await expect(page.locator('.shell')).toBeVisible();
  const menu = page.getByRole('button', { name: 'Menüyü aç' });
  if (await menu.isVisible()) await menu.click();
  await expect(page.getByRole('navigation', { name: 'Ana gezinme' })).toBeVisible();
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      document
        .getAnimations()
        .filter((animation) => Number.isFinite(animation.effect?.getComputedTiming().endTime))
        .map((animation) => animation.finished.catch(() => undefined)),
    );
  });
}

async function expectTouchTarget(target: Locator) {
  await target.scrollIntoViewIfNeeded();
  await target.page().evaluate(async () => {
    await Promise.all(
      document
        .getAnimations()
        .filter((animation) => Number.isFinite(animation.effect?.getComputedTiming().endTime))
        .map((animation) => animation.finished.catch(() => undefined)),
    );
  });
  const measured = await target.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    // Stay one CSS pixel inside each edge to avoid browser coordinate rounding.
    const points = [
      [0, 0],
      [-23, 0],
      [23, 0],
      [0, -23],
      [0, 23],
    ].map(([dx = 0, dy = 0]) => {
      const hit = document.elementFromPoint(
        rect.left + rect.width / 2 + dx,
        rect.top + rect.height / 2 + dy,
      );
      return !!hit && (hit === el || el.contains(hit));
    });
    return {
      label: el.getAttribute('aria-label') ?? el.textContent,
      x: rect.x,
      y: rect.y,
      height: rect.height,
      width: rect.width,
      fontSize: Number.parseFloat(style.fontSize),
      visibleToken: style.getPropertyValue('--shell-item-h').trim(),
      hitToken: style.getPropertyValue('--hit-target').trim(),
      points,
    };
  });
  expect.soft(measured.height).toBeGreaterThanOrEqual(48);
  expect.soft(measured.width).toBeGreaterThanOrEqual(48);
  expect.soft(measured.fontSize).toBeGreaterThanOrEqual(14);
  expect.soft(measured.visibleToken).toBe('36px');
  expect.soft(Number.parseFloat(measured.hitToken)).toBeGreaterThanOrEqual(48);
  expect.soft(measured.points, JSON.stringify(measured)).not.toContain(false);
}

for (const width of [320, 1024, 1366]) {
  test.describe(`coarse sidebar at ${width}px`, () => {
    test.use({ hasTouch: true, viewport: { width, height: 900 } });

    test('menu targets stay reachable in solid and rail views', async ({ page }, testInfo) => {
      await openSidebar(page);
      expect(await page.evaluate(() => matchMedia('(any-pointer: coarse)').matches)).toBe(true);
      const items = page.locator('.shell-sb .shell-item');
      expect(await items.count()).toBeGreaterThan(0);
      for (const item of await items.all()) await expectTouchTarget(item);

      const toggle = page.getByRole('button', { name: 'Dar görünüme geç' });
      if (width >= 1024) {
        await expect(toggle).toBeVisible();
        await expectTouchTarget(toggle);
        await page.locator('.shell-sb-scroll').evaluate((el) => el.scrollTo(0, 0));
        await page.screenshot({ path: testInfo.outputPath(`menu-${width}.png`) });
        const bounds = await toggle.boundingBox();
        if (!bounds) throw new Error('Sidebar toggle has no bounds');
        await page.touchscreen.tap(bounds.x + bounds.width / 2, bounds.y + 1);
        await expect(page.locator('.shell-sb')).toHaveAttribute('data-variant', 'rail');
        await expectTouchTarget(page.getByRole('button', { name: 'Geniş görünüme geç' }));
        for (const item of await items.all()) await expectTouchTarget(item);
      }

      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        width,
      );
    });
  });
}

for (const width of [1024, 1366]) {
  test.describe(`fine sidebar at ${width}px`, () => {
    test.use({ hasTouch: false, viewport: { width, height: 900 } });

    test('mouse controls retain their 36px size', async ({ page }) => {
      await openSidebar(page);
      expect(await page.evaluate(() => matchMedia('(any-pointer: coarse)').matches)).toBe(false);
      for (const item of await page.locator('.shell-sb .shell-item, .shell-tg').all()) {
        const bounds = await item.boundingBox();
        expect(bounds?.height).toBe(36);
      }
      await expect(page.locator('.shell-tg')).toHaveCSS('width', '36px');
      await page.getByRole('button', { name: 'Dar görünüme geç' }).click();
      await expect(page.locator('.shell-sb')).toHaveAttribute('data-variant', 'rail');
      await page.getByRole('button', { name: 'Geniş görünüme geç' }).click();
      await expect(page.locator('.shell-sb')).toHaveAttribute('data-variant', 'solid');
    });
  });
}
