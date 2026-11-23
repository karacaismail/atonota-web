import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { SAMPLE_USER, sampleLogoutUrl } from '../../mocks/fixtures';

const isCompact = (page: Page) => {
  const v = page.viewportSize();
  return !!v && (v.width <= 767 || v.height <= 499);
};

/** Yan menüyü görünür yapar. Telefonda menü çekmecenin içindedir. */
async function openSidebar(page: Page) {
  await page.goto('/');
  await expect(page.locator('.shell')).toBeVisible();
  if (isCompact(page)) {
    await page.getByRole('button', { name: 'Menüyü aç' }).click();
    await expect(page.getByRole('dialog', { name: 'Menü' })).toBeVisible();
  }
}

test.describe('oturumu kapatma (B1)', () => {
  test('kullanıcı kartı oturumdaki kişiyi gösterir, örnek kişiyi göstermez', async ({ page }) => {
    await openSidebar(page);
    const card = page.locator('.shell-user').last();
    await expect(card).toContainText(SAMPLE_USER);
    await expect(card).not.toContainText('Yönetici');
  });

  test('"Oturumu kapat" düğmesi sahte sunucunun Keycloak çıkış adresine gider', async ({
    page,
  }) => {
    // Keycloak sahte bir köktür. Tarayıcı oraya gidince boş bir sayfa döner.
    await page.route('https://kimlik.example.test/**', (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: '<title>Çıkış</title>' }),
    );
    await openSidebar(page);
    const button = page.getByRole('button', { name: 'Oturumu kapat' }).last();
    await expect(button).toBeVisible();
    await button.click();
    await expect(page).toHaveURL(sampleLogoutUrl.logout_url);
  });
});
