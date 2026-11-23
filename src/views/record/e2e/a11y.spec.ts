import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

for (const url of ['/', '/?theme=dark', '/?scenario=error', '/?scenario=unauthorized']) {
  test(`axe erişilebilirlik: ${url}`, async ({ page }) => {
    await page.goto(url);
    await expect(page.locator('.rv-header-title, .rv-state-card').first()).toBeVisible();

    const builder = new AxeBuilder({ page }).include('.rv-root');
    const results = await builder.analyze();
    const serious = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(
      serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
    ).toEqual([]);
  });
}
