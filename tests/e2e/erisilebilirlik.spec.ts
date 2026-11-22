import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

const PRIMARY_RGB = 'rgb(0, 170, 204)';

/** Klavye durakları: odaklanan öğe ve göstergeyi taşıması gereken görünür kontrol. */
function stops(
  page: Page,
): { name: string; focus: Locator; indicator: Locator; inner?: Locator }[] {
  const input = page.getByTestId('input-md');
  const selectInput = page.locator('.ant-select-selection-search-input').first();
  return [
    { name: 'düğme', focus: page.getByTestId('btn-md'), indicator: page.getByTestId('btn-md') },
    {
      name: 'giriş',
      focus: input,
      indicator: page.locator('.ant-input-affix-wrapper').first(),
      inner: input,
    },
    {
      name: 'açılır liste',
      focus: selectInput,
      indicator: page.locator('.ant-select-selector').first(),
      inner: selectInput,
    },
  ];
}

/** Hesaplanmış box-shadow listesini parçalara ayırır. */
function splitShadows(value: string): string[] {
  if (!value || value === 'none') return [];
  return value.split(/,(?![^(]*\))/).map((s) => s.trim());
}

/** Tek kenarlı gösterge: iç gölge, x 0, y negatif, bulanıklık 0, yayılma 0, birincil renk. */
function isBottomBarOnly(shadow: string): boolean {
  if (!shadow.includes(PRIMARY_RGB) || !shadow.includes('inset')) return false;
  const nums = shadow.replace(/rgba?\([^)]*\)/, '').match(/-?\d+(?:\.\d+)?px/g) ?? [];
  const [x, y, blur, spread] = nums.map((n) => parseFloat(n));
  return x === 0 && (y ?? 0) < 0 && (blur ?? 0) === 0 && (spread ?? 0) === 0;
}

async function openKeyboardMode(page: Page) {
  await page.keyboard.press('Tab');
  await expect(page.locator('html')).toHaveAttribute('data-focus-mode', 'keyboard');
}

test.describe('odak göstergesi: üç durak', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Atonota' })).toBeVisible();
  });

  test('düğme, giriş ve açılır listede tek kenarlı gösterge; çevreleyen gölge yok', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openKeyboardMode(page);
    for (const stop of stops(page)) {
      await stop.focus.focus();
      await expect(stop.focus, stop.name).toBeFocused();
      await expect
        .poll(
          async () =>
            splitShadows(
              await stop.indicator.evaluate((el) => getComputedStyle(el).boxShadow),
            ).some(isBottomBarOnly),
          { message: stop.name },
        )
        .toBe(true);
      const parts = splitShadows(
        await stop.indicator.evaluate((el) => getComputedStyle(el).boxShadow),
      );
      const primaryParts = parts.filter((p) => p.includes(PRIMARY_RGB));
      expect(primaryParts, `${stop.name}: ${parts.join(' | ')}`).toHaveLength(1);
      expect(primaryParts.every(isBottomBarOnly), stop.name).toBe(true);
      const outline = await stop.indicator.evaluate((el) => {
        const s = getComputedStyle(el);
        return s.outlineStyle === 'none' || s.outlineWidth === '0px';
      });
      expect(outline, `${stop.name}: outline`).toBe(true);
      if (stop.inner) {
        const innerShadow = await stop.inner.evaluate((el) => getComputedStyle(el).boxShadow);
        expect(innerShadow, `${stop.name}: iç öğe`).not.toContain(PRIMARY_RGB);
      }
    }
  });

  test('yüksek kontrast: Tab odağı her denetimde 2 px CanvasText çizgisiyle görünür', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'forced-colors emülasyonu yalnız Chromium');
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await openKeyboardMode(page);
    for (const stop of stops(page)) {
      await stop.focus.focus();
      await expect(stop.focus, stop.name).toBeFocused();
      await expect(stop.indicator, stop.name).toHaveCSS('outline-style', 'solid');
      await expect(stop.indicator, stop.name).toHaveCSS('outline-width', '2px');
      if (stop.inner) {
        await expect(stop.inner, `${stop.name}: iç öğe`).toHaveCSS('outline-style', 'none');
      }
    }
    // Not: Chromium yüksek kontrastta odaklanan öğeye her zaman sistem halkası çizer.
    // Bu tarayıcı güvencesidir; mod kapalıyken yalnız bizim 2 px kuralımız uygulanmaz.
  });
});

test.describe('koyu birincil düğme kontrastı', () => {
  test('normal, üzerine gelme ve basılı durumlar en az 4.5:1', async ({ page }) => {
    await page.goto('/');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.getByRole('radiogroup', { name: 'Tema' }).getByText('Koyu', { exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    const btn = page.getByTestId('btn-md');
    const measure = () =>
      btn.evaluate((el) => {
        const parse = (c: string) => {
          const m = c.match(/[\d.]+/g) ?? [];
          return { r: +m[0]!, g: +m[1]!, b: +m[2]!, a: m[3] === undefined ? 1 : +m[3] };
        };
        const blend = (f: ReturnType<typeof parse>, b: ReturnType<typeof parse>) => ({
          r: f.a * f.r + (1 - f.a) * b.r,
          g: f.a * f.g + (1 - f.a) * b.g,
          b: f.a * f.b + (1 - f.a) * b.b,
          a: 1,
        });
        const lum = (c: { r: number; g: number; b: number }) => {
          const ch = (v: number) => {
            const x = v / 255;
            return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
          };
          return 0.2126 * ch(c.r) + 0.7152 * ch(c.g) + 0.0722 * ch(c.b);
        };
        const page = parse(getComputedStyle(document.body).backgroundColor);
        const bg = blend(parse(getComputedStyle(el).backgroundColor), page);
        const fg = blend(parse(getComputedStyle(el).color), bg);
        const [l1, l2] = [lum(fg), lum(bg)].sort((a, b) => b - a);
        return Math.round(((l1! + 0.05) / (l2! + 0.05)) * 100) / 100;
      });
    const bgOf = () => btn.evaluate((el) => getComputedStyle(el).backgroundColor);
    const rest = await measure();
    const restBg = await bgOf();
    expect(rest, 'normal').toBeGreaterThanOrEqual(4.5);
    await btn.hover();
    await expect.poll(bgOf, { message: 'üzerine gelme zemini değişir' }).not.toBe(restBg);
    const hoverBg = await bgOf();
    await expect.poll(measure, { message: 'üzerine gelme' }).toBeGreaterThanOrEqual(4.5);
    const box = (await btn.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await expect.poll(bgOf, { message: 'basılı zemin değişir' }).not.toBe(hoverBg);
    await expect.poll(measure, { message: 'basılı' }).toBeGreaterThanOrEqual(4.5);
    await page.mouse.up();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .include('.ant-btn-primary')
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
