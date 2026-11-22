import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const pageCases: [string, string][] = [
  ['account', 'Hesap'],
  ['administration', 'Yönetim'],
  ['hr', 'İzin talepleri'],
  ['site-plan', 'Site ve plan'],
  ['ai-operations', 'Yapay zekâ işlemleri'],
];
for (const [path, title] of pageCases) {
  test(`${path}: readable without page overflow`, async ({ page }) => {
    await page.goto(`/${path}`);
    await expect(page.getByRole('heading', { name: title, exact: true, level: 1 })).toBeVisible();
    const layout = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      page: document.documentElement.scrollWidth,
    }));
    expect(layout.page).toBeLessThanOrEqual(layout.viewport);
    const fontSizes = await page.locator('.module-page').evaluate((root) =>
      Array.from(root.querySelectorAll('p, h1, h2, label, button, td, th, dd, dt, a'))
        .filter((element) => element.getBoundingClientRect().width > 0)
        .map((element) => Number.parseFloat(getComputedStyle(element).fontSize)),
    );
    expect(fontSizes.every((size) => size >= 12)).toBe(true);
    expect((await new AxeBuilder({ page }).include('.module-page').analyze()).violations).toEqual(
      [],
    );
  });
}

test('account route does not load unrelated module screens', async ({ page }) => {
  const scripts: string[] = [];
  page.on('request', (request) => {
    if (request.resourceType() === 'script') scripts.push(request.url());
  });
  await page.goto('/account');
  await expect(page.getByRole('heading', { name: 'Hesap', exact: true, level: 1 })).toBeVisible();
  expect(scripts.filter((url) => /ai-operations|administration|site-plan/.test(url))).toEqual([]);
});

test('a leave approval requires review and keeps the original record version', async ({ page }) => {
  const writes: unknown[] = [];
  const leave = {
    name: 'leave-example',
    status: 'Open',
    docstatus: 0,
    modified: '2026-11-23 10:00:00.000001',
    employee_name: 'Örnek Kişi',
    leave_type: 'Yıllık izin',
  };
  await page.route('**/api/resource/Leave%20Application*', (route) =>
    route.fulfill({
      json: { data: route.request().url().includes('leave-example') ? leave : [leave] },
    }),
  );
  await page.route('**/api/method/hrms_tr.api.approve_leave', (route) => {
    writes.push(route.request().postDataJSON());
    return route.fulfill({ json: { message: { name: leave.name } } });
  });
  await page.goto('/hr');
  await page.getByRole('button', { name: 'İncele', exact: true }).click();
  await expect(page.getByRole('button', { name: 'İzni onayla', exact: true })).toBeDisabled();
  expect(writes).toEqual([]);
  await page.getByLabel('İzin talebini okudum ve onaylıyorum.').check();
  await page.getByRole('button', { name: 'İzni onayla', exact: true }).click();
  await expect(
    page.getByText('Sunucu işlemi kabul etti. Güncel kayıt için sayfayı yenileyin.'),
  ).toBeVisible();
  expect(writes).toEqual([{ name: leave.name, version: leave.modified }]);
});
