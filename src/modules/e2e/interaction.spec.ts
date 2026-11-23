import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('access form keeps its draft when resized and its branded dropdown opens', async ({
  page,
}) => {
  await page.goto('/administration');
  await page.getByLabel('Kayıt türü', { exact: true }).fill('Example Proposal Template');
  await page.getByLabel('Kayıt', { exact: true }).fill('example-record');
  const select = page.getByRole('combobox');
  await select.press('ArrowDown');
  await expect(select).toHaveAttribute('aria-expanded', 'true');
  await page.locator('.ant-select-dropdown').evaluate(async (element) => {
    await Promise.all(
      element
        .getAnimations({ subtree: true })
        .map((animation) => animation.finished.catch(() => undefined)),
    );
  });
  expect((await new AxeBuilder({ page }).include('.module-page').analyze()).violations).toEqual([]);
  await select.press('Escape');
  // The dropdown closes with the project's motion (500 ms). While it leaves it still sits at its
  // old absolute position, so the viewport is resized only after it is hidden.
  await expect(page.locator('.ant-select-dropdown')).toBeHidden();
  const field = page.getByLabel('Kayıt', { exact: true });
  await field.focus();
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(field).toBeFocused();
  await expect(field).toHaveValue('example-record');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
});

test('keyboard focus remains visible without a surrounding ring', async ({ page }) => {
  await page.goto('/hr');
  const button = page.getByRole('button', { name: 'Yenile', exact: true });
  await expect(button).toBeVisible();
  await page.keyboard.press('Tab');
  await button.focus();
  await expect(button).toBeFocused();
  const styles = await button.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      outline: style.outlineStyle,
      shadow: style.boxShadow,
      mode: document.documentElement.dataset['focusMode'],
    };
  });
  expect(styles.mode).toBe('keyboard');
  expect(styles.outline).toBe('none');
  expect(styles.shadow).toMatch(/0px -[1-9][\d.]*px 0px 0px inset/);
  await button.hover();
  await button.click();
  // A pointer press only turns the visual mode off: the engine removes the attribute.
  await expect(page.locator('html')).not.toHaveAttribute('data-focus-mode', /./);
});
