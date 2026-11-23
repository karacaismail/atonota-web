import { expect, test, type Response } from '../../../tests/setup/playwright-fixtures';

test('login does not download AI Studio, Ant Design X, or table code', async ({ page }) => {
  await page.addInitScript(() => {
    const fetchFromPage = window.fetch.bind(window);
    window.fetch = (input, init) => {
      const url = new URL(input instanceof Request ? input.url : input, location.href);
      if (url.pathname === '/api/method/frappe.auth.get_logged_user') {
        return Promise.resolve(Response.json({ message: 'Guest' }));
      }
      return fetchFromPage(input, init);
    };
  });

  const scripts: Response[] = [];
  const requestedPaths: string[] = [];
  page.on('request', (request) => {
    const { pathname } = new URL(request.url());
    if (pathname.startsWith('/assets/') && pathname.endsWith('.js')) requestedPaths.push(pathname);
  });
  page.on('response', (response) => {
    const { pathname } = new URL(response.url());
    if (pathname.startsWith('/assets/') && pathname.endsWith('.js')) scripts.push(response);
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Oturum açın' })).toBeVisible();
  await page.waitForLoadState('networkidle');

  expect(requestedPaths.length).toBeGreaterThan(0);
  expect(requestedPaths.filter((path) => /\/(?:antd-x|AiStudioPage)-/.test(path))).toEqual([]);
  // rc-table's internal hook survives minification even when the chunk name changes.
  const tableScripts = await Promise.all(
    scripts.map(async (script) =>
      (await script.text()).includes('rc-table-internal-hook') ? script.url() : null,
    ),
  );
  expect(tableScripts.filter(Boolean)).toEqual([]);
});
