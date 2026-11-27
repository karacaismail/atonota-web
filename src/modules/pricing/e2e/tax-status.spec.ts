import { expect, test } from '../../../../tests/setup/playwright-fixtures';
import type { Locator } from '@playwright/test';

// Demo path (AGENTS.md, src/shell/routes.ts). Opens only in the e2e build.
const demo = '/_demo/tax-status';

const PARTS = ['name', 'amount', 'unit', 'tax'] as const;
const STATUSES = [
  'calculated',
  'zero_rated',
  'exempt',
  'reverse_charge',
  'not_calculated',
  'service_unavailable',
] as const;

async function box(locator: Locator) {
  const bounds = await locator.boundingBox();
  if (!bounds) throw new Error('Expected an element with a visible layout box');
  return bounds;
}

function overlaps(a: { x: number; y: number; width: number; height: number }, b: typeof a) {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

/** Checks that plan name, price, unit and tax text are visible together inside the card. */
async function fourPartsTogether(card: Locator, viewport: { width: number; height: number }) {
  const cardBox = await box(card);
  expect(cardBox.x).toBeGreaterThanOrEqual(0);
  expect(cardBox.x + cardBox.width).toBeLessThanOrEqual(viewport.width + 0.5);
  // The whole card fits on one screen, so the four parts can be seen together.
  expect(cardBox.height).toBeLessThanOrEqual(viewport.height);
  const boxes: Awaited<ReturnType<typeof box>>[] = [];
  for (const part of PARTS) {
    const item = card.getByTestId(`plan-price-${part}`);
    await expect(item).toBeVisible();
    const b = await box(item);
    expect(b.x).toBeGreaterThanOrEqual(cardBox.x - 0.5);
    expect(b.x + b.width).toBeLessThanOrEqual(cardBox.x + cardBox.width + 0.5);
    const style = await item.evaluate((el) => {
      const s = getComputedStyle(el);
      return {
        fontSize: parseFloat(s.fontSize),
        overflowWrap: s.overflowWrap,
        clipped: el.scrollWidth > el.clientWidth + 1,
        ellipsis: s.textOverflow === 'ellipsis',
      };
    });
    expect(style.fontSize).toBeGreaterThanOrEqual(14);
    expect(style.overflowWrap).not.toBe('anywhere');
    expect(style.clipped).toBe(false);
    expect(style.ellipsis).toBe(false);
    boxes.push(b);
  }
  boxes.forEach((a, i) => {
    boxes.slice(i + 1).forEach((b, k) => {
      expect(overlaps(a, b), `${PARTS[i]} overlaps ${PARTS[i + 1 + k]}`).toBe(false);
    });
  });
}

test.describe('tax status text at narrow widths (AJA-1761, test 3)', () => {
  for (const lang of ['en', 'tr']) {
    test(`320 px page and 260 px side panel show four parts together (${lang})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 320, height: 568 });
      await page.goto(`${demo}?lang=${lang}`);
      const viewport = { width: 320, height: 568 };
      for (const area of ['page', 'panel'] as const) {
        const region = page.getByTestId(`tax-demo-${area}`);
        if (area === 'panel') expect((await box(region)).width).toBeLessThanOrEqual(260.5);
        for (const status of STATUSES) {
          const card = region.getByTestId(`plan-price-${status}`);
          await card.scrollIntoViewIfNeeded();
          await fourPartsTogether(card, viewport);
        }
      }
      // The page itself never scrolls sideways.
      const sideways = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(sideways).toBe(false);
    });
  }

  test('tax service down: no zero amount and a next step', async ({ page }) => {
    await page.goto(`${demo}?lang=en`);
    const card = page.getByTestId('tax-demo-panel').getByTestId('plan-price-service_unavailable');
    await expect(card.getByTestId('plan-price-tax')).not.toContainText(/0[.,]00/);
    await expect(card.getByTestId('plan-price-next-step')).toBeVisible();
    await expect(card).toHaveAccessibleName('Plan A');
  });
});
