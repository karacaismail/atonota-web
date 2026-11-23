import type { Locator, Page } from '@playwright/test';
import { expect, test } from '../../../../tests/setup/playwright-fixtures';

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

/** Odaktaki öğe düğmeye göre nerededir? Listenin içi, düğmeden önce, sonra ya da hiçbir öğe. */
async function focusAfter(page: Page, button: Locator) {
  return button.evaluate((node) => {
    const active = document.activeElement;
    if (!active || active === document.body) return 'none';
    if (active.closest('.ant-dropdown')) return 'menu';
    if (active === node) return 'button';
    return node.compareDocumentPosition(active) & Node.DOCUMENT_POSITION_FOLLOWING
      ? 'after'
      : 'before';
  });
}

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

test.describe('çalışma alanı menüsü: Tab ve fareyle açma (Ö-1, K-1)', () => {
  test('ilk Tab menüyü kapatır ve odağı düğmeden sonraki öğeye taşır', async ({
    page,
    browserName,
  }) => {
    const button = await switcher(page);
    await button.focus();
    await page.keyboard.press('Enter');
    await expect(menu(page).getByRole('menuitem').first()).toBeFocused();

    await page.keyboard.press('Tab');

    await expect(menu(page)).toBeHidden();
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    // Odak listede ve gövdede kalmaz. Sayfada düğmeden sonra gelen bir öğeye geçer.
    expect(await focusAfter(page, button)).toBe('after');
    if (browserName === 'chromium') {
      // Chromium düğmeleri Tab sırasına alır. Geri Tab düğmeye döner.
      // Böylece odağın düğmeden hemen sonraki öğede olduğu görülür.
      await page.keyboard.press('Shift+Tab');
      await expect(button).toBeFocused();
    }
  });

  test('Shift+Tab menüyü kapatır ve odak listede kalmaz', async ({ page }) => {
    const button = await switcher(page);
    await button.focus();
    await page.keyboard.press('Enter');
    await expect(menu(page).getByRole('menuitem').first()).toBeFocused();

    await page.keyboard.press('Shift+Tab');

    await expect(menu(page)).toBeHidden();
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    // Masaüstünde düğme sayfanın ilk öğesidir. Odak o zaman tarayıcıya geçer.
    expect(await focusAfter(page, button)).not.toBe('after');
    expect(await focusAfter(page, button)).not.toBe('menu');
  });

  for (const [key, index] of [
    ['ArrowDown', 'first'],
    ['ArrowUp', 'last'],
  ] as const) {
    test(`fareyle açılan menüde ${key} odağı ${index === 'first' ? 'ilk' : 'son'} öğeye taşır`, async ({
      page,
    }) => {
      const button = await switcher(page);
      await button.click();
      await expect(menu(page)).toBeVisible();

      await page.keyboard.press(key);

      const items = menu(page).getByRole('menuitem');
      await expect(index === 'first' ? items.first() : items.last()).toBeFocused();
      await expect(menu(page)).toBeVisible();
    });
  }
});

test.describe('çalışma alanı menüsü: fareyle açılınca Tab (inceleme 2, K-1)', () => {
  for (const key of ['Tab', 'Shift+Tab']) {
    test(`fareyle açılan menüde ilk ${key} menüyü kapatır`, async ({ page }) => {
      const button = await switcher(page);
      await button.click();
      await expect(menu(page)).toBeVisible();

      await page.keyboard.press(key);

      await expect(menu(page)).toBeHidden();
      await expect(button).toHaveAttribute('aria-expanded', 'false');
      expect(await focusAfter(page, button)).not.toBe('menu');
    });
  }

  test('fareyle açılan menüde Tab odağı düğmeden sonraki öğeye taşır', async ({
    page,
    browserName,
  }) => {
    // Chromium tıklanan düğmeye odak verir. WebKit vermez; orada odağın yeri tarayıcıya kalır.
    test.skip(browserName !== 'chromium', 'Yalnız Chromium tıklanan düğmeye odak verir.');
    const button = await switcher(page);
    await button.click();
    await expect(menu(page)).toBeVisible();
    await expect(button).toBeFocused();

    await page.keyboard.press('Tab');

    await expect(menu(page)).toBeHidden();
    expect(await focusAfter(page, button)).toBe('after');
  });
});

test.describe('çalışma alanı menüsü: fareyle seçim (inceleme 1, K-3)', () => {
  test('fareyle seçimden sonra odak gövdeye düşmez', async ({ page }) => {
    const button = await switcher(page);
    await button.click();
    await expect(menu(page)).toBeVisible();
    const before = await focusAfter(page, button);
    // Tarayıcı tıklanan öğeye odak verdi mi? Chromium verir, WebKit vermeyebilir.
    await page.evaluate(() => {
      const store = window as unknown as { __focusInMenu: boolean };
      store.__focusInMenu = false;
      document.addEventListener('focusin', (event) => {
        if ((event.target as Element | null)?.closest('.ant-dropdown')) store.__focusInMenu = true;
      });
    });

    await menu(page).getByRole('menuitem').nth(1).click();

    await expect(menu(page)).toBeHidden();
    await expect(button).toContainText('Örnek Şirket B');
    const focusWasInMenu = await page.evaluate(
      () => (window as unknown as { __focusInMenu: boolean }).__focusInMenu,
    );
    if (focusWasInMenu) {
      // Odak listedeydi. Liste kapanınca odak tetik düğmesine döner.
      await expect(button).toBeFocused();
    } else {
      // Odak listede değildi. Seçim odağa dokunmaz.
      expect(await focusAfter(page, button)).toBe(before);
    }
  });
});
