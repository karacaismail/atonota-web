import { expect, test } from '@playwright/test';

test('shared keyboard mode shows one underline without an internal checkbox ring', async ({
  page,
}, testInfo) => {
  await page.goto('/src/views/collection/preview/');
  await expect(page.getByText('EXAMPLE-001', { exact: true })).toBeVisible();
  await page.keyboard.press('Tab');
  const checkbox = page.getByRole('checkbox', { name: 'EXAMPLE-001 seç', exact: true });
  await checkbox.focus();
  const control = page.locator('.collection-checkbox').filter({ has: checkbox });
  const indicators = await control.evaluate((root) =>
    [root, ...root.querySelectorAll('*')].map((element) => {
      const style = getComputedStyle(element);
      return {
        outline: style.outlineStyle,
        width: parseFloat(style.outlineWidth),
        shadow: style.boxShadow,
      };
    }),
  );
  await testInfo.attach('focus-indicators', {
    body: JSON.stringify(indicators),
    contentType: 'application/json',
  });
  expect(indicators.filter((item) => item.outline !== 'none' && item.width > 0)).toEqual([]);
  expect(indicators[0]?.shadow).not.toBe('none');
  const scroller = page.getByRole('region', { name: 'Kayıt tablosu yatay kaydırma' });
  await scroller.focus();
  const scrollFocus = await scroller.evaluate((element) => ({
    outline: getComputedStyle(element).outlineStyle,
    shadow: getComputedStyle(element).boxShadow,
  }));
  expect(scrollFocus.outline).toBe('none');
  expect(scrollFocus.shadow).not.toBe('none');
});
