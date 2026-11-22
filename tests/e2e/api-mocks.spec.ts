import { expect, test } from '@playwright/test';

// Tarayıcıdaki sahte sunucu (MSW) testleri. Derleme `VITE_API_MOCKS=on` ile yapılır.

test('sahte sunucu açıkken ekranda “Örnek veri” yazar', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('status').filter({ hasText: 'Örnek veri' })).toBeVisible();
});

test('kayıtlı API ucu sahte sunucudan yanıt alır', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('status').filter({ hasText: 'Örnek veri' })).toBeVisible();

  const user = await page.evaluate(async () => {
    const response = await fetch('/api/method/frappe.auth.get_logged_user');
    return ((await response.json()) as { message: string }).message;
  });

  expect(user).toBe('ornek.kisi@example.test');
});

test('eşleşmeyen API isteği arka uca ulaşmaz', async ({ page, context }) => {
  const reachedNetwork: string[] = [];
  await context.route('**/api/**', async (route) => {
    reachedNetwork.push(route.request().url());
    await route.abort();
  });
  await page.goto('/');
  await expect(page.getByRole('status').filter({ hasText: 'Örnek veri' })).toBeVisible();

  // MSW eşleşmeyen isteği ağa bırakmaz. İsteği hata yanıtıyla ya da ağ hatasıyla bitirir.
  const status = await page.evaluate(async () => {
    try {
      return (await fetch('/api/method/bilinmeyen.uc')).status;
    } catch {
      return 0;
    }
  });

  expect(status === 0 || status >= 500).toBe(true);
  expect(reachedNetwork).toEqual([]);
});
