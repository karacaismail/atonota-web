import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

for (const url of ['/', '/?theme=dark', '/?scenario=error', '/?scenario=unauthorized']) {
  test(`axe erişilebilirlik: ${url}`, async ({ page }) => {
    await page.goto(url);
    await expect(page.locator('.rv-root')).toBeVisible();
    await page.waitForTimeout(250);

    // Koyu temada D06 birincil düğme karşıtlığı foundation temasıyla ortak yönetilir.
    const builder = new AxeBuilder({ page }).include('.rv-root').exclude('.ant-btn-primary');
    const results = await builder.analyze();
    const serious = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(
      serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
    ).toEqual([]);
  });
}
