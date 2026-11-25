// "Müşteriler" sayfası tarayıcıda (G-169, G-170, AJA-834).
// Sayfa 320 pikselde yatay taşmaz. Yazı en az 14 pikseldir. Yeni müşteri isteği gönderilir.
import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

import { expect, test } from '../../../tests/setup/playwright-fixtures';

async function useRole(page: Page, scenario: string) {
  await page.addInitScript(
    (value) => sessionStorage.setItem('atonota.mock-senaryo', value),
    scenario,
  );
}

async function expectReadableLayout(page: Page) {
  // Renk geçişi bitmeden karşıtlık ölçülmez. Örnek: düğme etkin olunca rengi yavaşça değişir.
  await page.waitForFunction(() =>
    document.getAnimations().every((animation) => animation.playState !== 'running'),
  );
  const layout = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    page: document.documentElement.scrollWidth,
  }));
  expect(layout.page).toBeLessThanOrEqual(layout.viewport);
  const fontSizes = await page.locator('.module-page').evaluate((root) =>
    Array.from(root.querySelectorAll('p, h1, h2, label, button, input, dd, dt, [role="alert"]'))
      .filter((element) => element.getBoundingClientRect().width > 0)
      .map((element) => Number.parseFloat(getComputedStyle(element).fontSize)),
  );
  expect(fontSizes.length).toBeGreaterThan(0);
  expect(fontSizes.every((size) => size >= 14)).toBe(true);
  expect((await new AxeBuilder({ page }).include('.module-page').analyze()).violations).toEqual([]);
}

test('"Reseller Admin" müşteri listesini görür ve yeni müşteri isteği gönderir', async ({
  page,
}) => {
  await useRole(page, 'rol-reseller-admin');
  await page.goto('/customers');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Müşteriler', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('musteri-a.example.test')).toBeVisible();
  await expect(page.getByText('Çalışıyor')).toBeVisible();
  await expect(page.getByText('Kuruluyor')).toBeVisible();
  await expectReadableLayout(page);

  await page.getByRole('button', { name: 'Yeni müşteri isteği', exact: true }).click();
  await page.getByLabel('Müşteri adı').fill('Örnek Müşteri');
  await page.getByLabel('İletişim adresi').fill('yeni.musteri@example.test');
  await expectReadableLayout(page);
  await page.getByRole('button', { name: 'İsteği gönder' }).click();
  await expect(page.getByText(/İsteğiniz gönderildi.*RCR-0001/)).toBeVisible();
  await expectReadableLayout(page);
});

test('"Reseller Assistant" listeyi okur ve istek düğmesini görmez', async ({ page }) => {
  await useRole(page, 'rol-reseller-assistant');
  await page.goto('/customers');
  await expect(page.getByText('musteri-b.example.test')).toBeVisible();
  await expect(page.getByText(/yalnız okuyabilirsiniz/i)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Yeni müşteri isteği' })).toHaveCount(0);
  await expectReadableLayout(page);
});

test('kiracı hesabı "Müşteriler" sayfasında yetki notunu görür', async ({ page }) => {
  await useRole(page, 'rol-tenant-admin');
  await page.goto('/customers');
  await expect(page.getByText(/Bu sayfayı açma yetkiniz yok/)).toBeVisible();
  const layout = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    page: document.documentElement.scrollWidth,
  }));
  expect(layout.page).toBeLessThanOrEqual(layout.viewport);
});
