import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '../../../../tests/setup/playwright-fixtures';

const FORM = '/src/views/record/harness/?scenario=leave-prefill';

for (const theme of ['light', 'dark']) {
  test(`new leave shows actual defaults and linked sources (${theme})`, async ({
    page,
  }, testInfo) => {
    await page.goto(`${FORM}&theme=${theme}`);
    const name = page.getByLabel('Ad', { exact: true });
    await expect(name).toHaveValue('Örnek Kişi 1');
    await expect(name).toHaveAccessibleDescription('Personel kaydından geldi.');
    const balance = page.getByLabel('Kalan yıllık izin');
    // Intl may separate the unit with a regular, nonbreaking or narrow nonbreaking space.
    await expect(balance).toHaveValue(/^8,5[ \u00a0\u202f]gün$/);
    await expect(balance).toHaveAttribute('readonly', '');
    await expect(balance).toHaveAccessibleDescription('İzin kayıtlarından hesaplandı.');
    await page.getByLabel('Açıklama').fill('Örnek açıklama');
    await expect(page.getByLabel('Açıklama')).toHaveAccessibleDescription(
      'Yöneticiniz bu metni okur.',
    );
    const measures = await page.locator('.rv-root').evaluate((root) => ({
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      small: [...root.querySelectorAll<HTMLElement>('*')]
        .filter(
          (element) =>
            element.getClientRects().length &&
            [...element.childNodes].some(
              (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
            ) &&
            parseFloat(getComputedStyle(element).fontSize) < 14,
        )
        .map((element) => element.textContent),
      sources: [...root.querySelectorAll('.rv-field-source')].map((note) => {
        const control = note.closest('.rv-field')?.querySelector('[aria-describedby]');
        return {
          linked: control?.getAttribute('aria-describedby')?.split(' ').includes(note.id),
          below: control
            ? note.getBoundingClientRect().top >= control.getBoundingClientRect().bottom
            : false,
        };
      }),
    }));
    expect(measures.overflow).toBeLessThanOrEqual(0);
    expect(measures.small).toEqual([]);
    expect(measures.sources).toEqual(
      Array.from({ length: 3 }, () => ({ linked: true, below: true })),
    );
    expect((await new AxeBuilder({ page }).include('.rv-root').analyze()).violations).toEqual([]);
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: testInfo.outputPath(`new-leave-${theme}.png`), fullPage: true });
  });
}

test('missing data stays empty and zero remains a sourced value', async ({ page }) => {
  await page.goto(`${FORM}&context=empty`);
  await expect(page.getByLabel('Ad', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Kalan yıllık izin')).toHaveValue('');
  await expect(page.locator('.rv-field-source')).toHaveCount(0);
  await page.goto(`${FORM}&context=zero`);
  await expect(page.getByLabel('Kalan yıllık izin')).toHaveValue(/^0[ \u00a0\u202f]gün$/);
  await expect(page.getByLabel('Kalan yıllık izin')).toHaveAccessibleDescription(
    'İzin kayıtlarından hesaplandı.',
  );
});
for (const context of ['network', 'forbidden', 'unauthenticated', 'validation']) {
  test(`optional context failure keeps the new form usable (${context})`, async ({ page }) => {
    await page.goto(`${FORM}&context=${context}`);
    await expect(page.getByLabel('Ad', { exact: true })).toHaveValue('');
    await expect(page.getByLabel('Kalan yıllık izin')).toHaveValue('');
    await expect(page.locator('.rv-field-source')).toHaveCount(0);
    await page.getByLabel('Açıklama').fill('İzin talebim.');
    await expect(page.getByLabel('Açıklama')).toHaveValue('İzin talebim.');
    await expect(page.getByRole('button', { name: 'Talebi gönder' })).toBeEnabled();
  });
}

test('changing a prefilled choice removes its source and resize retains the draft', async ({
  page,
}) => {
  await page.goto(FORM);
  const type = page.getByRole('combobox', { name: /İzin türü/ });
  await expect(type).toHaveAccessibleDescription('İzin türü kaydından geldi.');
  await page.locator('[data-fieldname="leave_type"] .ant-select-selector').click();
  await expect(type).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('.ant-select-item-option-active')).toHaveText('Yıllık izin');
  await type.press('ArrowDown');
  await expect(page.locator('.ant-select-item-option-active')).toHaveText('Mazeret izni');
  await type.press('Enter');
  await type.press('Escape');
  await expect(type).not.toHaveAccessibleDescription('İzin türü kaydından geldi.');
  const note = page.getByLabel('Açıklama');
  await note.fill('Örnek açıklama');
  await note.press('Tab');
  await note.press('Shift+Tab');
  await note.focus();
  await page.setViewportSize({ width: 568, height: 320 });
  await expect(note).toHaveValue('Örnek açıklama');
  await expect(note).toBeFocused();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const focus = await note.evaluate((element) => {
    const style = getComputedStyle(element);
    return { outline: style.outlineStyle, shadow: style.boxShadow };
  });
  expect(focus.outline).toBe('none');
  expect(focus.shadow).toContain('inset');
});
