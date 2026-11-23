import { expect, test } from '@playwright/test';
import type { Locator } from '@playwright/test';

const demo = '/src/components/controls/demo/harness/';

async function box(locator: Locator) {
  const bounds = await locator.boundingBox();
  if (!bounds) throw new Error('Expected an element with a visible layout box');
  return bounds;
}

test.beforeEach(async ({ page }) => {
  await page.goto(demo);
});

test('controls match the locked height and font size', async ({ page }) => {
  for (const [size, height, fontSize] of [
    ['small', 36, 14],
    ['middle', 42, 16],
    ['large', 48, 18],
  ] as const) {
    const row = page.getByTestId(`row-${size}`);
    for (const [surface, text] of [
      ['.ant-btn', '.ant-btn'],
      ['.ant-input-affix-wrapper', '.ant-input'],
      ['.ant-select-selector', '.ant-select-selection-item'],
      ['.ant-input-number', '.ant-input-number-input'],
    ] as const) {
      await expect(row.locator(surface), `${size} ${surface}`).toHaveCSS('height', `${height}px`);
      await expect(row.locator(text), `${size} ${text}`).toHaveCSS('font-size', `${fontSize}px`);
    }
    await expect(page.getByTestId(`link-${size}`)).toHaveCSS('font-size', `${fontSize}px`);
  }

  await expect(page.getByTestId('card')).toHaveCSS('border-radius', '10px');
});

test('choice controls match the locked height and font size', async ({ page }) => {
  // Source: control-size-config.json choice.C3 and the per-control antdTheme blocks.
  for (const [control, height, fontSize] of [
    ['.ant-checkbox-wrapper', 32, 14],
    ['.ant-radio-button-wrapper', 32, 14],
    ['.atonota-switch', 28, 14],
    ['.ant-switch', 24, 14],
    ['.ant-segmented', 32, 16],
    ['.ant-tag', 24, 12],
  ] as const) {
    const target = page.locator(control).first();
    await expect.soft(target, control).toHaveCSS('height', `${height}px`, { timeout: 1000 });
    await expect.soft(target, control).toHaveCSS('font-size', `${fontSize}px`, { timeout: 1000 });
  }
  await expect(page.locator('.ant-checkbox-inner')).toHaveCSS('width', '20px');
  for (const control of ['.ant-checkbox-wrapper', '.ant-radio-button-wrapper', '.ant-switch']) {
    await expect(page.locator(control).first(), control).toHaveClass(/\bhit\b/);
  }
});

for (const style of ['İşlemler', 'shortcut', 'described', 'selectable', 'searchable']) {
  test(`${style} menu handles arrows, Space, Enter and Escape`, async ({ page }) => {
    const trigger = page.getByRole('button', { name: style, exact: true });
    await trigger.focus();
    await page.keyboard.press('Space');

    const menu = page.getByRole('menu');
    const role = style === 'selectable' ? 'menuitemradio' : 'menuitem';
    const edit = menu.getByRole(role, { name: /^Düzenle/ });
    const copy = menu.getByRole(role, { name: /^Kopyala/ });
    if (style === 'selectable') {
      await expect(edit).toHaveAttribute('aria-checked', 'false');
      await expect(copy).toHaveAttribute('aria-checked', 'true');
    }
    if (style === 'searchable') {
      await expect(page.getByRole('textbox', { name: 'Menüde ara' })).toBeFocused();
      await page.keyboard.press('ArrowDown');
    }
    await expect(edit).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(copy).toBeFocused();
    await page.keyboard.press('ArrowUp');
    await expect(edit).toBeFocused();
    await page.keyboard.press('Space');
    await expect(page.getByTestId('action')).toHaveText('edit');
    await expect(trigger).toBeFocused();

    await page.keyboard.press('Enter');
    if (style === 'searchable') {
      await page.getByRole('textbox', { name: 'Menüde ara' }).fill('KOPYALA');
      await expect(edit).toHaveCount(0);
      await page.keyboard.press('ArrowDown');
    } else {
      await expect(edit).toBeFocused();
      await page.keyboard.press('ArrowDown');
    }
    await expect(copy).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('action')).toHaveText('copy');

    await page.keyboard.press('Enter');
    await expect(menu).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(trigger).toBeFocused();
  });
}

test('Tab enables a single focus indicator and pointer input turns it off', async ({
  page,
  browserName,
}) => {
  const trigger = page.getByRole('button', { name: 'İşlemler' });
  const next = page.getByRole('button', { name: 'shortcut' });
  await trigger.focus();
  if (browserName === 'webkit') {
    await page.keyboard.press('Tab');
    await trigger.focus();
  }
  await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
  await expect(next).toBeFocused();
  await expect(next).toHaveCSS('outline-style', 'none');
  const indicator = () => next.evaluate((element) => getComputedStyle(element, '::before').content);
  expect(await indicator()).toBe('""');
  await page.keyboard.press(browserName === 'webkit' ? 'Alt+Shift+Tab' : 'Shift+Tab');
  await expect(trigger).toBeFocused();
  await next.click();
  await expect(next).toHaveCSS('outline-style', 'none');
  expect(await indicator()).toBe('none');
});

test('dropdown animation uses the shared motion and honors reduced motion', async ({ page }) => {
  const trigger = page.getByRole('button', { name: 'İşlemler' });
  const popup = page.locator('.atonota-dropdown-popup');
  await trigger.click();
  await expect(popup).toHaveCSS('animation-name', 'atonota-dropdown-in');
  await expect(popup).toHaveCSS('animation-duration', '0.5s');
  await expect(popup).toHaveCSS('animation-timing-function', 'cubic-bezier(0.2, 0.9, 0.3, 1.15)');
  await page.keyboard.press('Escape');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(popup).toHaveCSS('animation-name', 'atonota-dropdown-out');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await trigger.click();
  await expect(popup).toHaveCSS('animation-name', 'none');
});

test('open menu with long text stays inside the viewport', async ({ page }) => {
  await page.getByRole('button', { name: 'İşlemler' }).click();
  const item = page.getByRole('menuitem', { name: /Bu kaydın daha önce/ });
  await expect(item).toBeVisible();
  const popup = page.locator('.atonota-dropdown-popup');
  await expect(popup).toHaveCSS('animation-name', 'atonota-dropdown-in');
  await expect(popup).toHaveCSS('animation-name', 'none');
  const bounds = await box(item);
  const popupBounds = await box(popup);
  const width = await page.evaluate(() => window.innerWidth);
  for (const area of [popupBounds, bounds]) {
    expect(area.x).toBeGreaterThanOrEqual(0);
    expect(area.x + area.width).toBeLessThanOrEqual(width);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    width,
  );
});

test('select joins its popup and form controls retain the inset shadow', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const row = page.getByTestId('row-small');
  const selector = row.locator('.ant-select-selector');
  await selector.click();
  const popup = page.locator('.atonota-select-popup');
  await expect(popup).toBeVisible();
  const above = (await popup.getAttribute('class'))?.includes('placement-top');
  await expect(selector).toHaveCSS(
    above ? 'border-top-left-radius' : 'border-bottom-left-radius',
    '0px',
  );
  const selectorBounds = await box(selector);
  const popupBounds = await box(popup);
  const gap = above
    ? selectorBounds.y - popupBounds.y - popupBounds.height
    : popupBounds.y - selectorBounds.y - selectorBounds.height;
  expect(Math.abs(gap)).toBeLessThanOrEqual(1);
  for (const surface of [
    selector,
    row.locator('.ant-input-affix-wrapper'),
    row.locator('.ant-input-number'),
  ]) {
    await expect(surface).toHaveCSS('box-shadow', /inset/);
  }
  await popup.getByText('Kapalı', { exact: true }).click();
  await expect(selector).toHaveText('Kapalı');
  await expect(popup).toBeHidden();
});

test('split actions stay separate and use the shared hit-area engine', async ({
  page,
  hasTouch,
}) => {
  const primary = page.getByRole('button', { name: 'Dışa aktar', exact: true });
  const trigger = page.getByRole('button', { name: 'Dışa aktarma seçenekleri' });
  await expect(primary).toHaveClass(/\bhit\b/);
  const extension = await primary.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      desiredHeight: rect.height * 0.06,
      top: parseFloat(style.getPropertyValue('--hit-t')) - parseFloat(style.borderTopWidth),
      right: parseFloat(style.getPropertyValue('--hit-r')) - parseFloat(style.borderRightWidth),
    };
  });
  expect(extension.top).toBeCloseTo(extension.desiredHeight, 1);
  expect(extension.right).toBeCloseTo(0, 1);
  await expect(page.locator('.ant-input-affix-wrapper').first()).toHaveClass(/\bhit\b/);
  await expect(page.locator('.atonota-number').first()).toHaveClass(/\bhit\b/);
  await expect(page.getByTestId('link-small')).toHaveClass(/\bhit\b/);
  const bounds = await box(primary);
  const pointer = hasTouch ? page.touchscreen : page.mouse;
  if ('tap' in pointer) await pointer.tap(bounds.x + bounds.width / 2, bounds.y - 1);
  else await pointer.click(bounds.x + bounds.width / 2, bounds.y - 1);
  await expect(page.getByTestId('action')).toHaveText('export');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await trigger.click();
  await page.getByRole('menuitem', { name: 'Düzenle' }).click();
  await expect(page.getByTestId('action')).toHaveText('edit');
});

test('form surfaces retain the shared inset shadow in dark mode', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const row = page.getByTestId('row-small');
  for (const control of ['.ant-input-affix-wrapper', '.ant-select-selector', '.ant-input-number']) {
    await expect(row.locator(control)).toHaveCSS(
      'box-shadow',
      /inset rgb\(0, 0, 0\)|rgb\(0, 0, 0\).*inset/,
    );
  }
});

test('forced colors outlines the focused control only in keyboard mode', async ({
  page,
  browserName,
}) => {
  test.skip(browserName === 'webkit', 'Playwright WebKit on macOS does not emulate forced colors');
  await page.emulateMedia({ forcedColors: 'active' });
  const trigger = page.getByRole('button', { name: 'İşlemler' });
  const next = page.getByRole('button', { name: 'shortcut' });
  await trigger.focus();
  await expect(trigger).toHaveCSS('outline-style', 'none');
  await page.keyboard.press('Tab');
  await expect(next).toBeFocused();
  await expect(next).toHaveCSS('outline-style', 'solid');
  await expect(next).toHaveCSS('outline-width', '2px');
  await next.click();
  await expect(next).toHaveCSS('outline-style', 'none');
});

for (const scheme of ['light', 'dark'] as const) {
  test(`danger menu item keeps 4.5:1 contrast on hover in ${scheme} mode`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', scheme);
    await page.getByRole('button', { name: 'İşlemler' }).click();
    const item = page.getByRole('menuitem', { name: 'Sil' });
    await item.hover();
    const colors = await item.evaluate((element) => {
      const style = getComputedStyle(element);
      return { text: style.color, background: style.backgroundColor };
    });
    const ratio = await page.evaluate(({ text, background }) => {
      const luminance = (value: string) => {
        const [r = 0, g = 0, b = 0] = (value.match(/[\d.]+/g) ?? []).slice(0, 3).map((part) => {
          const channel = Number(part) / 255;
          return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const [high = 0, low = 0] = [luminance(text), luminance(background)].sort((a, b) => b - a);
      return (high + 0.05) / (low + 0.05);
    }, colors);
    expect(colors.text).toBe('rgb(255, 255, 255)');
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
}
