import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { SAMPLE_KEYCLOAK_URL, SAMPLE_USER, sampleLogoutUrl } from '../../mocks/fixtures';
import { MOCK_SCENARIO_KEY } from '../../mocks/scenarios';

const isCompact = (page: Page) => {
  const v = page.viewportSize();
  return !!v && (v.width <= 767 || v.height <= 499);
};

const SIGN_OUT_ERROR = 'Oturum kapatılamadı. Oturumunuz açık. Biraz sonra yeniden deneyin.';

/** Sahte sunucu bu senaryoyla açılır. Ad sayfa açılmadan önce oturum deposuna yazılır. */
async function useScenario(page: Page, name: string) {
  await page.addInitScript(([key, value]) => sessionStorage.setItem(key, value), [
    MOCK_SCENARIO_KEY,
    name,
  ] as const);
}

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

  test('tarayıcı testi sahte sunucunun Keycloak kökünü kullanır', async () => {
    expect(new URL(sampleLogoutUrl.logout_url).origin).toBe(SAMPLE_KEYCLOAK_URL);
  });

  test('çıkış isteği başarısız olursa hata metni görünür ve oturum açık kalır (K-2)', async ({
    page,
  }) => {
    await useScenario(page, 'cikis-hatasi');
    await openSidebar(page);
    await page.getByRole('button', { name: 'Oturumu kapat' }).last().click();

    const alert = page.getByRole('alert').filter({ hasText: SIGN_OUT_ERROR });
    await expect(alert).toBeVisible();
    await expect(page.locator('.shell-user').last()).toContainText(SAMPLE_USER);
    await expect(page).not.toHaveURL(/kimlik\.example\.test/);
  });

  test('dar kipte çıkış hatası gözle görünen bir uyarıda çıkar (Ö-2)', async ({ page }) => {
    test.skip(isCompact(page), 'Dar kip yalnız geniş ekranda vardır. Telefonda menü çekmecededir.');
    await useScenario(page, 'cikis-hatasi');
    await openSidebar(page);
    await page.getByRole('button', { name: 'Dar görünüme geç' }).click();
    await page.getByRole('button', { name: 'Oturumu kapat' }).click();

    await expect(page.locator('.ant-message').getByText(SIGN_OUT_ERROR)).toBeVisible();
    // Ekran okuyucu metni yine bir kez duyar.
    await expect(page.getByRole('alert').filter({ hasText: SIGN_OUT_ERROR })).toHaveCount(1);
  });

  test('başka kökenli çıkış adresine gidilmez, giriş ekranı not gösterir (Ö-3, K-3)', async ({
    page,
  }) => {
    const foreign: string[] = [];
    await page.route('https://baska.example.test/**', (route) => {
      foreign.push(route.request().url());
      return route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<title>Yabancı</title>',
      });
    });
    await useScenario(page, 'cikis-yabanci-adres');
    await openSidebar(page);
    await page.getByRole('button', { name: 'Oturumu kapat' }).last().click();

    await expect(page.getByRole('heading', { name: 'Oturum açın' })).toBeVisible();
    await expect(page.getByRole('main', { name: 'Oturum açın' }).getByRole('status')).toHaveText(
      'Panelden çıktınız. Kimlik oturumunuz açık kalmış olabilir.',
    );
    expect(foreign).toEqual([]);
    expect(new URL(page.url()).hostname).not.toBe('baska.example.test');
  });
});
