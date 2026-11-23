import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

const isCompact = (page: Page) => {
  const v = page.viewportSize();
  return !!v && (v.width <= 767 || v.height <= 499);
};

/** Çalışma alanı düğmesi. Telefonda düğme menü çekmecesinin içindedir. */
async function switcher(page: Page) {
  await page.goto('/');
  if (isCompact(page)) {
    await page.getByRole('button', { name: 'Menüyü aç' }).click();
    await expect(page.getByRole('dialog', { name: 'Menü' })).toBeVisible();
  }
  const button = page.locator('button.shell-ws').first();
  await expect(button).toBeVisible();
  return button;
}

const menu = (page: Page) => page.getByRole('menu', { name: 'Çalışma alanları' });

test.describe('çalışma alanı menüsü klavyeyle (Ö8)', () => {
  for (const key of ['Enter', ' ', 'ArrowDown']) {
    test(`${key === ' ' ? 'Space' : key} menüyü açar ve odağı ilk öğeye taşır`, async ({
      page,
    }) => {
      const button = await switcher(page);
      await expect(button).toHaveAttribute('aria-haspopup', 'menu');
      await expect(button).toHaveAttribute('aria-expanded', 'false');
      await button.focus();
      await page.keyboard.press(key);

      await expect(menu(page)).toBeVisible();
      await expect(button).toHaveAttribute('aria-expanded', 'true');
      const items = menu(page).getByRole('menuitem');
      await expect(items.first()).toBeFocused();
    });
  }

  test('oklar öğeler arasında gezer, Escape kapatır ve odağı düğmeye verir', async ({ page }) => {
    const button = await switcher(page);
    await button.focus();
    await page.keyboard.press('Enter');
    const items = menu(page).getByRole('menuitem');
    await expect(items.first()).toBeFocused();

    await page.keyboard.press('ArrowDown');
    await expect(items.nth(1)).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(items.nth(2)).toBeFocused();
    await page.keyboard.press('ArrowUp');
    await expect(items.nth(1)).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(menu(page)).toBeHidden();
    await expect(button).toBeFocused();
    await expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  test('Enter öğeyi seçer, menüyü kapatır ve odağı düğmeye verir', async ({ page }) => {
    const button = await switcher(page);
    await button.focus();
    await page.keyboard.press('Enter');
    const items = menu(page).getByRole('menuitem');
    await expect(items.first()).toBeFocused();
    await page.keyboard.press('ArrowDown');
    // Menü odağı bir kare sonra taşır. Enter, odak ikinci öğeye geçince basılır.
    await expect(items.nth(1)).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(menu(page)).toBeHidden();
    await expect(button).toBeFocused();
    await expect(button).toContainText('Örnek Şirket B');
  });
});
