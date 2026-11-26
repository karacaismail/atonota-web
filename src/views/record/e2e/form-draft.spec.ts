import AxeBuilder from '@axe-core/playwright';
import type { Locator } from '@playwright/test';
import { expect, test } from '../../../../tests/setup/playwright-fixtures';

const FORM = '/src/views/record/harness/?scenario=leave-prefill&assist=1';

/** Resolves a CSS colour token to the browser's computed rgb() form. */
async function tokenColor(field: Locator, token: string): Promise<string> {
  return field.evaluate((el, name) => {
    const probe = document.createElement('i');
    probe.style.color = `var(${name})`;
    el.append(probe);
    const value = getComputedStyle(probe).color;
    probe.remove();
    return value;
  }, token);
}

test('an empty date field looks empty; a filled date uses the normal text colour', async ({
  page,
}) => {
  await page.goto(FORM);
  const start = page.getByLabel(/Başlangıç tarihi/);
  await expect(start).toBeVisible();
  const placeholder = await tokenColor(start.locator('xpath=..'), '--rv-color-text-placeholder');
  const text = await tokenColor(start.locator('xpath=..'), '--rv-color-text');
  expect(placeholder).not.toBe(text);
  // WebKit draws today's date inside an empty field. The text colour makes it look like a hint.
  await expect(start).toHaveCSS('color', placeholder);
  await start.fill('2026-11-27');
  await expect(start).toHaveCSS('color', text);
});

test('the date field shows a single calendar icon that opens the picker', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'Only Chromium draws its own calendar icon.');
  await page.goto(FORM);
  const start = page.getByLabel(/Başlangıç tarihi/);
  await expect(start).toBeVisible();
  // Chromium draws its own icon inside the input's right edge. Count dark pixels there.
  // The token icon sits outside the input element, in the antd suffix.
  const png = (await start.screenshot({ animations: 'disabled' })).toString('base64');
  const nativeIconPixels = await page.evaluate(async (data) => {
    const img = new Image();
    img.src = `data:image/png;base64,${data}`;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Missing canvas context');
    ctx.drawImage(img, 0, 0);
    const edge = Math.round(32 * window.devicePixelRatio);
    const px = ctx.getImageData(img.width - edge, 0, edge, img.height).data;
    let count = 0;
    for (let i = 0; i < px.length; i += 4) {
      const light = ((px[i] ?? 0) + (px[i + 1] ?? 0) + (px[i + 2] ?? 0)) / 3;
      if (light < 128) count += 1;
    }
    return count;
  }, png);
  expect(nativeIconPixels).toBe(0);
  const wrapper = start.locator('xpath=ancestor::*[contains(@class,"ant-input-affix-wrapper")][1]');
  await expect(wrapper.locator('svg')).toHaveCount(1);
  await start.evaluate((el) => {
    const input = el as HTMLInputElement & { pickerCalls?: number };
    input.pickerCalls = 0;
    input.showPicker = () => {
      input.pickerCalls = (input.pickerCalls ?? 0) + 1;
    };
  });
  await wrapper.locator('.ant-input-suffix').click();
  expect(await start.evaluate((el) => (el as { pickerCalls?: number }).pickerCalls)).toBe(1);
});

test('name and balance read as text, and the form ends with its actions', async ({ page }) => {
  await page.goto(FORM);
  const name = page.getByRole('textbox', { name: 'Ad' });
  await expect(name).toHaveText('Örnek Kişi 1');
  await expect(name).toHaveAttribute('aria-readonly', 'true');
  await expect(page.locator('[data-fieldname="employee_name"] input')).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Kalan yıllık izin' })).toHaveText('8,5 gün');
  await expect(page.locator('.rv-root .ant-select-selection-placeholder')).toHaveCount(0);

  const actions = page.locator('.rv-form-actions');
  await expect(actions.getByRole('button')).toHaveText(['Vazgeç', 'Talebi gönder']);
  await expect(page.getByRole('button', { name: 'Talebi gönder' })).toHaveCount(1);

  for (const width of [320, 360, 375, 390]) {
    await page.setViewportSize({ width, height: 800 });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `${width} px`).toBeLessThanOrEqual(0);
  }

  await page.getByRole('button', { name: 'Vazgeç' }).click();
  await expect(page.locator('main')).toHaveAttribute('data-cancel-calls', '1');
});

test('unsaved changes stop "Vazgeç" until the user confirms', async ({ page }) => {
  await page.goto(FORM);
  await page.getByLabel('Açıklama').fill('Örnek açıklama');
  await page.getByRole('button', { name: 'Vazgeç' }).click();
  const guard = page.getByRole('alert');
  await expect(guard).toContainText('Kaydedilmemiş değişiklikleriniz var.');
  await expect(page.locator('main')).toHaveAttribute('data-cancel-calls', '0');
  await guard.getByRole('button', { name: 'Kaydetmeden çık' }).click();
  await expect(page.locator('main')).toHaveAttribute('data-cancel-calls', '1');
});

test('empty select says "Seçin" and the form passes axe', async ({ page }) => {
  await page.goto('/src/views/record/harness/?scenario=leave');
  await expect(
    page.locator('[data-fieldname="leave_type"] .ant-select-selection-placeholder'),
  ).toHaveText('Seçin');
  await page.getByRole('button', { name: 'Talebi gönder' }).click();
  await expect(page.getByText('İzin türünü seçin.')).toBeVisible();
  await expect(page.getByText('Başlangıç tarihini yazın.')).toBeVisible();
  const result = await new AxeBuilder({ page }).include('.rv-root').analyze();
  expect(result.violations).toEqual([]);
});
