import { expect, test } from '../../../tests/setup/playwright-fixtures';
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
  // The signed-in account page always renders inside the shell.
  const allowed = new Set([
    ...collect('index.html'),
    ...collect('src/shell/index.ts'),
    ...collect(entryKey),
  ]);
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
  // The e2e build serves the API from the MSW service worker. `page.route` cannot see requests the
  // worker answers, so the test uses the sample leave `ORNEK-IZIN-0001` (Open, docstatus 0).
  // The mock rejects an approval whose `version` differs from the record's `modified`
  // (TimestampMismatchError, 417). A success message therefore proves the original version was sent.
  // Writes are counted from the page's own requests. The worker answers them, but the page
  // still issues them, so no approval request may leave before the consent box is checked.
  const writes: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('hrms_tr.api.approve_leave')) writes.push(request.method());
  });
  await page.goto('/hr');
  const record = page.locator('.module-record', { hasText: 'ORNEK-IZIN-0001' });
  await expect(record).toContainText('Açık');
  await record.getByRole('button', { name: 'İncele', exact: true }).click();
  const approve = page.getByRole('button', { name: 'İzni onayla', exact: true });
  await expect(approve).toBeDisabled();
  await page.getByLabel('İzin talebini okudum ve onaylıyorum.').check();
  expect(writes).toEqual([]);
  await approve.click();
  await expect(
    page.getByText('Sunucu işlemi kabul etti. Güncel kayıt için sayfayı yenileyin.'),
  ).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(writes).toEqual(['POST']);
  // The list refreshes after the write: the mock now reports the record as approved.
  await expect(record).toContainText('Onaylandı');
});
