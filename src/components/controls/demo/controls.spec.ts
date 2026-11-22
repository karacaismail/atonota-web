import { expect, test } from '@playwright/test';

const demo = '/src/components/controls/demo/';

test('controls match the locked height and font size', async ({ page }) => {
  await page.goto(demo);
  const sizes = [
    ['small', 36, 14],
    ['middle', 42, 16],
    ['large', 48, 18],
  ] as const;

  for (const [size, height, fontSize] of sizes) {
    for (const control of ['button', 'input', 'select', 'number']) {
      const target = page.getByTestId(`${control}-${size}`);
      await expect(target).toHaveCSS('height', `${height}px`);
      await expect(target).toHaveCSS('font-size', `${fontSize}px`);
    }
    await expect(page.getByTestId(`link-${size}`)).toHaveCSS('font-size', `${fontSize}px`);
  }

  for (const [control, height, fontSize] of [
    ['checkbox', 32, 14],
    ['radio', 32, 14],
    ['switch', 28, 14],
    ['tabs', 32, 16],
    ['tag', 24, 12],
  ] as const) {
    const target = page.getByTestId(control);
    await expect(target).toHaveCSS('height', `${height}px`);
    await expect(target).toHaveCSS('font-size', `${fontSize}px`);
  }
  await expect(page.getByTestId('card')).toHaveCSS('border-radius', '10px');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    await page.evaluate(() => window.innerWidth),
  );
});

test('keyboard focus, selection and menu dismissal work', async ({ page }) => {
  await page.goto(demo);
  const trigger = page.getByRole('button', { name: 'İşlemler' });
  await page.keyboard.press('Tab');
  await expect(trigger).toBeFocused();

  await page.keyboard.press('Enter');
  await expect(page.getByRole('menu')).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menu')).toBeHidden();
  await expect(trigger).toBeFocused();

  await page.keyboard.press('Tab');
  const checkbox = page.getByRole('checkbox', { name: 'Seç' });
  await expect(checkbox).toBeFocused();
  await page.keyboard.press('Space');
  await expect(checkbox).toBeChecked();
  await page.keyboard.press('Shift+Tab');
  await expect(trigger).toBeFocused();
});

test('keyboard focus has no surrounding outline', async ({ page }) => {
  await page.goto(demo);
  const trigger = page.getByRole('button', { name: 'İşlemler' });
  await page.keyboard.press('Tab');
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveCSS('outline-style', 'none');
});
