import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '../../../tests/setup/playwright-fixtures';
import type { Page } from '@playwright/test';

async function settle(page: Page) {
  await page.evaluate(async () => {
    await Promise.all(
      document
        .getAnimations()
        .filter((animation) => Number.isFinite(animation.effect?.getComputedTiming().endTime))
        .map((animation) => animation.finished.catch(() => undefined)),
    );
  });
}

test('identity stays readable with no page overflow', async ({ page }) => {
  await page.goto('/');
  const identity = page.getByRole('banner', { name: 'Kimlik şeridi' });
  await expect(identity).toContainText('Kiracı');
  await expect(identity).toContainText('Deneme');
  await expect(identity).toContainText('KipSor');
  const measurements = await identity.evaluate((root) => ({
    sizes: Array.from(root.querySelectorAll('dt, dd')).map((element) =>
      parseFloat(getComputedStyle(element).fontSize),
    ),
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  expect(Math.min(...measurements.sizes)).toBeGreaterThanOrEqual(14);
  expect(measurements.overflow).toBeLessThanOrEqual(0);
  await expect(
    page.getByRole('link', { name: 'İzin talepleri', includeHidden: true }),
  ).toBeAttached();
  await settle(page);
  expect((await new AxeBuilder({ page }).include('.shell').analyze()).violations).toEqual([]);
});

test('grouped navigation supports forward and reverse keyboard travel', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.shell')).toBeVisible();
  const menu = page.getByRole('button', { name: 'Menüyü aç' });
  if (await menu.isVisible()) await menu.click();
  const nav = page.getByRole('navigation', { name: 'Ana gezinme' });
  for (const name of ['Bakmak ve onaylamak', 'İnsan kaynakları', 'Yönetim']) {
    await expect(nav.getByRole('heading', { name })).toBeVisible();
  }
  const links = nav.getByRole('link');
  const hrefs = await links.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute('href')),
  );
  expect(new Set(hrefs).size).toBe(hrefs.length);
  await links.first().focus();
  for (let i = 1; i < (await links.count()); i += 1) {
    await page.keyboard.press('Tab');
    await expect(links.nth(i)).toBeFocused();
  }
  for (let i = (await links.count()) - 2; i >= 0; i -= 1) {
    await page.keyboard.press('Shift+Tab');
    await expect(links.nth(i)).toBeFocused();
  }
  const focus = await links.first().evaluate((element) => ({
    outline: getComputedStyle(element).outlineStyle,
    indicator: getComputedStyle(element, '::after').opacity,
  }));
  expect(focus.outline).toBe('none');
  expect(focus.indicator).toBe('1');
  const smallText = await nav.evaluate((root) =>
    Array.from(root.querySelectorAll('a, h2, span'))
      .filter((element) => element.getBoundingClientRect().width > 0)
      .filter((element) => parseFloat(getComputedStyle(element).fontSize) < 14)
      .map((element) => element.textContent),
  );
  expect(smallText).toEqual([]);
  await settle(page);
  expect((await new AxeBuilder({ page }).include('.shell').analyze()).violations).toEqual([]);
});

test('test and live labels have distinct surfaces in both themes', async ({ page }) => {
  for (const theme of ['light', 'dark']) {
    const surfaces: string[] = [];
    for (const [environment, label] of [
      ['example', 'Deneme'],
      ['live', 'Canlı'],
    ] as const) {
      await page.goto(`/src/shell/identity/harness/?environment=${environment}&theme=${theme}`);
      const identity = page.getByRole('banner', { name: 'Kimlik şeridi' });
      await expect(identity).toContainText('Örnek Şirket');
      await expect(identity).toContainText(label);
      await settle(page);
      surfaces.push(
        await identity
          .locator('.shell-environment')
          .evaluate((element) => getComputedStyle(element).backgroundColor),
      );
      expect((await new AxeBuilder({ page }).include('.shell').analyze()).violations).toEqual([]);
    }
    expect(surfaces[0]).not.toBe(surfaces[1]);
  }
});

test('identity survives resizing and enlarged text without losing the command mode', async ({
  page,
}, info) => {
  test.skip(!info.project.name.endsWith('desktop'), 'one transition journey per browser engine');
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/src/shell/identity/harness/?tenant=long');
  await page.getByRole('button', { name: 'Menüyü aç' }).click();
  await page
    .locator('.shell-cmd .ant-segmented-item-label')
    .getByText('Ara', { exact: true })
    .click();
  await page.keyboard.press('Escape');
  const identity = page.getByRole('banner', { name: 'Kimlik şeridi' });
  for (const [width, height] of [
    [320, 740],
    [360, 740],
    [375, 740],
    [390, 844],
    [844, 390],
    [1024, 768],
    [1366, 900],
  ] as const) {
    await page.setViewportSize({ width, height });
    await expect(identity).toContainText('KipAra');
    await expect(identity).toContainText('Örnek Şirket');
    await expect(identity).toContainText('Deneme');
    await settle(page);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      ),
    ).toBeLessThanOrEqual(0);
  }
  await page.setViewportSize({ width: 320, height: 740 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  await expect(identity).toContainText('KipAra');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ),
  ).toBeLessThanOrEqual(0);
});
