import { expect, test } from '../../../tests/setup/playwright-fixtures';

/**
 * "İletişim" listesi (AJA-812, G-63). Sahte sunucu gerçek Communication şemasının
 * bir parçasını verir: boş seçim seçeneği, Dynamic Link, Code ve Text Editor alanı.
 * İki menü grubu da aynı türü açar: "Müşteri Yönetimi" ve "E-posta".
 */
for (const path of ['/crm/Communication', '/email/Communication']) {
  test(`${path} listesi açılır ve sayfa yana taşmaz`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1, name: 'Communication' })).toBeAttached();
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(page.getByText('ILETISIM-0001').first()).toBeVisible();
    // Zengin metin düz metin olarak görünür; HTML etiketi ekrana yazılmaz.
    await expect(page.getByText('<strong>')).toHaveCount(0);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
}
