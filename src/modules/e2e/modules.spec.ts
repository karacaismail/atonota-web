import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { object, text } from '../contracts';

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
    expect(fontSizes.every((size) => size >= 14)).toBe(true);
    expect((await new AxeBuilder({ page }).include('.module-page').analyze()).violations).toEqual(
      [],
    );
  });
}

test('account only requests its production assets and shared dependencies', async ({ page }) => {
  const response = await page.request.get('/.vite/manifest.json');
  expect(response.ok()).toBe(true);
  const manifest = object(await response.json());
  const collect = (key: string, seen = new Set<string>()): Set<string> => {
    if (seen.has(key)) return new Set();
    seen.add(key);
    const entry = object(manifest[key]);
    const assets = new Set([text(entry['file'])]);
    if (Array.isArray(entry['css'])) for (const css of entry['css']) assets.add(text(css));
    if (Array.isArray(entry['imports']))
      for (const dependency of entry['imports'])
        for (const asset of collect(text(dependency), seen)) assets.add(asset);
    return assets;
  };
  const entryKey = 'src/modules/account/Page.tsx';
  const allowed = new Set([...collect('index.html'), ...collect(entryKey)]);
  const forbidden = new Set<string>();
  for (const [id] of pageCases)
    if (id !== 'account')
      for (const asset of collect(`src/modules/${id}/Page.tsx`))
        if (!allowed.has(asset)) forbidden.add(asset);
  const requests: string[] = [];
  page.on('request', (request) => requests.push(new URL(request.url()).pathname.slice(1)));
  await page.goto('/account');
  await expect(page.getByRole('heading', { name: 'Hesap', exact: true, level: 1 })).toBeVisible();
  expect(requests).toContain(text(object(manifest[entryKey])['file']));
  expect(requests.filter((path) => forbidden.has(path))).toEqual([]);
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
