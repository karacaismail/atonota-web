import type { Locator, Page } from '@playwright/test';
import { expect, test } from '../../../tests/setup/playwright-fixtures';

const DEMO = '/_demo/shell';

async function settle(page: Page) {
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

async function openMenu(page: Page) {
  const button = page.getByRole('button', { name: 'Menüyü aç' });
  if (await button.isVisible()) await button.click();
  await expect(page.getByRole('navigation', { name: 'Ana gezinme' })).toBeVisible();
  await settle(page);
}

// Composite the actual translucent backgrounds before comparing rendered text.
async function badgeContrast(badge: Locator) {
  return badge.evaluate((el) => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');
    const parents: Element[] = [];
    for (let node: Element | null = el; node; node = node.parentElement) parents.unshift(node);
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 1, 1);
    for (const node of parents) {
      ctx.fillStyle = getComputedStyle(node).backgroundColor;
      ctx.fillRect(0, 0, 1, 1);
      // The sliding hover surface is a sibling, painted behind the menu item.
      const glide = node.querySelector(':scope > .shell-glide');
      if (glide) {
        const a = el.getBoundingClientRect();
        const b = glide.getBoundingClientRect();
        const x = a.left + a.width / 2;
        const y = a.top + a.height / 2;
        if (x >= b.left && x <= b.right && y >= b.top && y <= b.bottom) {
          ctx.globalAlpha = Number(getComputedStyle(glide).opacity);
          ctx.fillStyle = getComputedStyle(glide).backgroundColor;
          ctx.fillRect(0, 0, 1, 1);
          ctx.globalAlpha = 1;
        }
      }
    }
    const luminance = () => {
      const rgb = [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3).map((c) => {
        const v = c / 255;
        return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      });
      return (rgb[0] ?? 0) * 0.2126 + (rgb[1] ?? 0) * 0.7152 + (rgb[2] ?? 0) * 0.0722;
    };
    const background = luminance();
    ctx.fillStyle = getComputedStyle(el).color;
    ctx.fillRect(0, 0, 1, 1);
    const foreground = luminance();
    return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
  });
}

for (const colorScheme of ['light', 'dark'] as const) {
  test(`badge contrast in every state: ${colorScheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto(DEMO);
    await expect(page.locator('.shell')).toBeVisible();
    await openMenu(page);
    const item = page.locator('button.shell-item').filter({ hasText: 'Satış' });
    const badge = item.locator('.shell-badge');
    await expect(badge).toHaveText('12');
    for (const state of ['rest', 'hover', 'focus', 'selected'] as const) {
      if (state === 'hover') await item.hover();
      if (state === 'focus') {
        await page.keyboard.press('Tab');
        await item.focus();
      }
      // Exercise both selection selectors without navigating away from the demo fixture.
      if (state === 'selected') await item.evaluate((el) => el.setAttribute('data-active', 'true'));
      await settle(page);
      const ratio = await badgeContrast(badge);
      await test.info().attach(`badge-${colorScheme}-${state}`, {
        body: JSON.stringify({ colorScheme, state, ratio }),
        contentType: 'application/json',
      });
      expect.soft(ratio, `${colorScheme}: ${state}`).toBeGreaterThanOrEqual(4.5);
    }
    const link = page.locator('a.shell-item').filter({ hasText: 'Teklifler' });
    await expect(link).toBeVisible();
    await link.evaluate((el) => el.setAttribute('aria-current', 'page'));
    await settle(page);
    expect(
      await badgeContrast(link.locator('.shell-badge')),
      'selected link',
    ).toBeGreaterThanOrEqual(4.5);
  });
}

test.describe('touch targets', () => {
  // WebKit's 320 project otherwise emulates a mouse. Width alone does not imply touch.
  test.use({ hasTouch: true });

  async function checkTarget(page: Page, target: Locator) {
    await target.scrollIntoViewIfNeeded();
    await settle(page);
    const measurement = await target.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const size = Number.parseFloat(getComputedStyle(el).getPropertyValue('--hit-target'));
      const layer = getComputedStyle(
        el,
        el.matches('.shell-iconbtn, .ant-segmented-item') ? '::before' : '::after',
      );
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      const offset = size / 2 - 0.25;
      const points = [-offset, 0, offset].flatMap((dx) =>
        [-offset, 0, offset].map((dy) => {
          const hit = document.elementFromPoint(x + dx, y + dy);
          return { dx, dy, reachable: !!hit && (hit === el || el.contains(hit)) };
        }),
      );
      return {
        size,
        points,
        hitWidth: Number.parseFloat(layer.width),
        hitHeight: Number.parseFloat(layer.height),
        height: rect.height,
        width: rect.width,
        text: el.textContent,
      };
    });
    expect(measurement.size).toBeGreaterThanOrEqual(48);
    expect.soft(measurement.hitWidth).toBeGreaterThanOrEqual(measurement.size);
    expect.soft(measurement.hitHeight).toBeGreaterThanOrEqual(measurement.size);
    await test.info().attach('touch-target', {
      body: JSON.stringify(measurement),
      contentType: 'application/json',
    });
    expect
      .soft(
        measurement.points.filter((p) => !p.reachable),
        JSON.stringify(measurement),
      )
      .toEqual([]);
    return measurement;
  }

  test('menu and toolbar have reachable 48 px targets without enlarging their visible height', async ({
    page,
  }) => {
    await page.goto(DEMO);
    await expect(page.locator('.shell')).toBeVisible();
    const menu = page.getByRole('button', { name: 'Menüyü aç' });
    if (await menu.isVisible()) {
      const measured = await checkTarget(page, menu);
      expect(measured.height).toBe(42);
      const rect = await menu.boundingBox();
      if (!rect) throw new Error('Menu has no bounds');
      await page.touchscreen.tap(rect.x + rect.width / 2, rect.y + rect.height / 2 - 23);
      await expect(page.getByRole('dialog', { name: 'Menü' })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog', { name: 'Menü' })).toBeHidden();
    }
    for (const target of [
      page.locator('.shell-hd-search'),
      page.getByRole('button', { name: 'Filtre', exact: true }),
    ]) {
      const measured = await checkTarget(page, target);
      expect(measured.height).toBe(42);
    }
    const search = page.locator('.shell-hd-search');
    const searchBounds = await search.boundingBox();
    if (!searchBounds) throw new Error('Search has no bounds');
    await page.touchscreen.tap(searchBounds.x + searchBounds.width / 2, searchBounds.y - 2);
    await expect(search.locator('input')).toBeFocused();
    const views = page.locator('.shell-hd-vsw .ant-segmented-item');
    await expect(views).toHaveCount(7);
    for (const view of await views.all()) {
      const measured = await checkTarget(page, view);
      expect(measured.height).toBe(38);
      expect(measured.width).toBe(46);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      page.viewportSize()?.width ?? 0,
    );
  });

  test('command modes have reachable 48 px targets and activate at the outer edge', async ({
    page,
  }) => {
    await page.goto(DEMO);
    await expect(page.locator('.shell')).toBeVisible();
    await openMenu(page);
    const modes = page.locator('.shell-cmd-box .ant-segmented-item');
    await expect(modes).toHaveCount(3);
    for (const mode of await modes.all()) {
      const measured = await checkTarget(page, mode);
      expect(measured.height).toBeLessThan(48);
      const rect = await mode.boundingBox();
      if (!rect) throw new Error('Mode has no bounds');
      await page.touchscreen.tap(rect.x + rect.width / 2, rect.y + rect.height / 2 - 23);
      await expect(mode.locator('input')).toBeChecked();
    }
  });
});
