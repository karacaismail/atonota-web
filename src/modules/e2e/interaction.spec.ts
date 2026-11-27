import { expect, test } from '../../../tests/setup/playwright-fixtures';
import AxeBuilder from '@axe-core/playwright';

test('access form keeps its draft when resized and its branded dropdown opens', async ({
  page,
}) => {
  await page.goto('/administration');
  // The page also has a role picker. The test only uses the "Explain access" form.
  const form = page.getByRole('region', { name: 'Erişimi açıkla' });
  await form.getByLabel('Kayıt türü', { exact: true }).fill('Example Proposal Template');
  await form.getByLabel('Kayıt', { exact: true }).fill('example-record');
  const select = form.getByRole('combobox', { name: 'İşlem' });
  await select.press('ArrowDown');
  await expect(select).toHaveAttribute('aria-expanded', 'true');
  // Every running animation settles first: the dropdown motion and the submit button's
  // disabled-to-enabled colour transition. axe measures the blended colours of a transition
  // that is still running (for example #c8e1e7 behind the button label) and reports contrast.
  await page.evaluate(async () => {
    await Promise.all(
      document.getAnimations().map((animation) => animation.finished.catch(() => undefined)),
    );
  });
  expect((await new AxeBuilder({ page }).include('.module-page').analyze()).violations).toEqual([]);
  await select.press('Escape');
  // The dropdown closes with the project's motion (500 ms). While it leaves it still sits at its
  // old absolute position, so the viewport is resized only after it is hidden.
  await expect(page.locator('.ant-select-dropdown')).toBeHidden();
  const field = form.getByLabel('Kayıt', { exact: true });
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

test('a long leave heading wraps inside the review', async ({ page }) => {
  // The e2e build answers the API from the MSW worker, so `page.route` cannot inject a record.
  // The review of a sample leave is opened and its heading text is replaced with a 120-character
  // name in the DOM. The wrapping rule is CSS, so the real stylesheet is what gets exercised.
  const name = 'A'.repeat(120);
  await page.goto('/hr');
  const record = page.locator('.module-record', { hasText: 'ORNEK-IZIN-0001' });
  await record.getByRole('button', { name: 'İncele', exact: true }).click();
  const heading = page.getByRole('heading', { name: 'ORNEK-IZIN-0001', exact: true, level: 2 });
  await expect(heading).toBeVisible();
  await heading.evaluate((element, text) => {
    element.textContent = text;
  }, name);
  const long = page.getByRole('heading', { name, exact: true, level: 2 });
  await expect(long).toHaveCSS('overflow-wrap', 'break-word');
  expect(await long.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
});
