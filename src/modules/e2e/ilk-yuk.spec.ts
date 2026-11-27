import { expect, test } from '../../../tests/setup/playwright-fixtures';

import { MOCK_SCENARIO_KEY } from '../../mocks/scenarios';
import { moduleRegistrations } from '../registry';

/**
 * Initial load budget: the sign-in screen does not download the module registry.
 * The registry carries every module page's path and chunk list. Only the shell uses it.
 * The sign-in screen only needs the module client (`src/modules/client.ts`).
 * That is why `src/shell/view-data/modules.ts` imports the client directly from its file.
 */
test('login screen does not download the module registry', async ({ page }) => {
  await page.addInitScript(([key, value]) => sessionStorage.setItem(key, value), [
    MOCK_SCENARIO_KEY,
    'oturum-kapali',
  ] as const);
  const scripts: string[] = [];
  page.on('response', (response) => {
    if (response.request().resourceType() === 'script') scripts.push(response.url());
  });
  await page.goto('/panel');
  await expect(page.getByRole('heading', { name: 'Oturum açın' })).toBeVisible();
  await page.waitForLoadState('networkidle');

  // The registry paths appear as text in the chunk. Example: `/administration/ai-providers`.
  const paths = moduleRegistrations.map((registration) => registration.path);
  const found: string[] = [];
  for (const url of scripts) {
    const body = await (await page.request.get(url)).text();
    for (const path of paths)
      for (const quote of ['`', "'", '"'])
        if (body.includes(`${quote}${path}${quote}`)) found.push(`${url}: ${path}`);
  }
  expect(scripts.length).toBeGreaterThan(0);
  expect(found).toEqual([]);
});
