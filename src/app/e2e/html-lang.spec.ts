/**
 * `<html lang>` and `<html dir>` follow the user language in the boot data (IC-14, AJA-1364).
 * The tests were written before the code.
 *
 * The mock server provides the language. Before the page opens, the test writes a scenario name to
 * session storage (`src/mocks/scenarios.ts`). The sample user's language is `tr`.
 */
import { expect, test, type Page } from '../../../tests/setup/playwright-fixtures';

/** Mock server scenario key. Source: `MOCK_SCENARIO_KEY` in `src/mocks/scenarios.ts`. */
const SCENARIO_KEY = 'atonota.mock-senaryo';

async function openPanel(page: Page, scenario?: string) {
  if (scenario) {
    await page.addInitScript(([key, value]) => sessionStorage.setItem(key, value), [
      SCENARIO_KEY,
      scenario,
    ] as const);
  }
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 });
}

const root = (page: Page) => page.locator('html');

test.describe('<html> lang ve dir', () => {
  test('açılış verisinde dil tr olunca lang tr-TR ve dir ltr olur', async ({ page }) => {
    await openPanel(page);
    await expect(root(page)).toHaveAttribute('lang', 'tr-TR');
    await expect(root(page)).toHaveAttribute('dir', 'ltr');
  });

  test('açılış verisinde dil en olunca lang en-GB olur ve :lang(en) eşleşir', async ({ page }) => {
    await openPanel(page, 'dil-en');
    await expect(root(page)).toHaveAttribute('lang', 'en-GB');
    await expect(root(page)).toHaveAttribute('dir', 'ltr');
    expect(await page.evaluate(() => document.documentElement.matches(':lang(en)'))).toBe(true);
  });

  test('dil verisi gelmezse lang en-GB ve dir ltr olur; lang boş kalmaz', async ({ page }) => {
    await openPanel(page, 'dil-yok');
    await expect(root(page)).toHaveAttribute('lang', 'en-GB');
    await expect(root(page)).toHaveAttribute('dir', 'ltr');
  });

  test('sağdan sola sahte dil seçilince dir rtl olur, antd da sağdan sola çizer', async ({
    page,
  }) => {
    await openPanel(page, 'dil-sahte-rtl');
    await expect(root(page)).toHaveAttribute('dir', 'rtl');
    await expect(root(page)).toHaveAttribute('lang', 'ar-XB');
    await expect(page.locator('[class*="ant-"][class*="-rtl"]').first()).toBeAttached();
  });
});
