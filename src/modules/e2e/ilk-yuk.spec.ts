import { expect, test } from '../../../tests/setup/playwright-fixtures';

import { MOCK_SCENARIO_KEY } from '../../mocks/scenarios';
import { moduleRegistrations } from '../registry';

/**
 * İlk yük bütçesi: giriş ekranı modül kayıt listesini indirmez.
 * Kayıt listesi her modül sayfasının yolunu ve parça listesini taşır. Yalnız kabuk onu kullanır.
 * Giriş ekranı yalnız modül istemcisini (`src/modules/client.ts`) ister.
 * Bu yüzden `src/shell/view-data/modules.ts` istemciyi doğrudan dosyasından alır.
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

  // Kayıt listesindeki yollar parçada metin olarak durur. Örnek: `/administration/ai-providers`.
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
