import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const PRIMARY_RGB = 'rgb(0, 170, 204)';

/** Gerçek öğe kutularıyla yatay taşma (px). Pseudo-element dokunma katmanı sayılmaz. */
async function overflow(page: Page): Promise<number> {
  return page.evaluate(() => {
    const limit = document.documentElement.clientWidth;
    let worst = document.documentElement.scrollWidth - limit;
    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('*'))) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      worst = Math.max(worst, r.right - limit, -r.left);
    }
    return Math.round(worst * 100) / 100;
  });
}

test.describe('temel kapılar', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Atonota' })).toBeVisible();
  });

  test('sayfa yatay taşmaz', async ({ page }) => {
    expect(await overflow(page)).toBeLessThanOrEqual(0);
    await page.getByText('Koyu', { exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect(await overflow(page)).toBeLessThanOrEqual(0);
  });

  test('tema düğmesi açık, koyu ve sistem seçeneklerini uygular', async ({ page }) => {
    const html = page.locator('html');
    await page.getByText('Koyu', { exact: true }).click();
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await expect(html).toHaveCSS('color-scheme', 'dark');
    await page.getByText('Açık', { exact: true }).click();
    await expect(html).toHaveAttribute('data-theme', 'light');
    await page.getByText('Sistem', { exact: true }).click();
    await expect(html).toHaveAttribute('data-theme', /light|dark/);
    await page.reload();
    expect(await page.evaluate(() => localStorage.getItem('atonota.theme-mode'))).toBe('system');
  });

  test('yazı tipi Outfit ve metin en az 12 px', async ({ page }) => {
    const family = await page.locator('body').evaluate((el) => getComputedStyle(el).fontFamily);
    expect(family).toContain('Outfit');
    const tooSmall = await page.evaluate(() =>
      Array.from(document.querySelectorAll('main *'))
        .filter(
          (el) =>
            el.childNodes.length &&
            Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent?.trim()),
        )
        .map((el) => parseFloat(getComputedStyle(el).fontSize))
        .filter((px) => px < 12),
    );
    expect(tooSmall).toEqual([]);
  });

  test('kontrol yükseklikleri 36, 42 ve 48 px', async ({ page }) => {
    const h = async (id: string) => (await page.getByTestId(id).boundingBox())?.height ?? 0;
    expect(Math.round(await h('btn-sm'))).toBe(36);
    expect(Math.round(await h('btn-md'))).toBe(42);
    expect(Math.round(await h('btn-lg'))).toBe(48);
  });

  test('odak göstergesi: klavye modu Tab ile açılır, çevreleyen halka yok', async ({ page }) => {
    const html = page.locator('html');
    await expect(html).not.toHaveAttribute('data-focus-mode', 'keyboard');

    // Fare odağı göstergeyi açmaz
    await page.getByTestId('btn-sm').click();
    await expect(html).not.toHaveAttribute('data-focus-mode', 'keyboard');

    // WebKit tıklamada butona odak vermez; başlangıcı sabitle. Programatik odak modu açmaz.
    await page.getByTestId('btn-sm').focus();
    await expect(html).not.toHaveAttribute('data-focus-mode', 'keyboard');

    await page.keyboard.press('Tab');
    await expect(html).toHaveAttribute('data-focus-mode', 'keyboard');

    // Chromium bir sonraki butona, WebKit (Safari kuralı) bir sonraki giriş alanına geçer.
    const focused = page.locator(':focus');
    await expect(focused).toHaveCount(1);
    const readFocus = () =>
      focused.evaluate((el) => {
        // Gösterge odaklanan öğede ya da onu saran kontrolde (input sarmalayıcı) olur.
        const chain: Element[] = [el];
        let p = el.parentElement;
        while (p && chain.length < 4) {
          chain.push(p);
          p = p.parentElement;
        }
        return {
          testId: el.getAttribute('data-testid'),
          shadows: chain.map((n) => getComputedStyle(n).boxShadow),
          noOutline: chain.every((n) => {
            const s = getComputedStyle(n);
            return s.outlineStyle === 'none' || s.outlineWidth === '0px';
          }),
        };
      });
    const hasIndicator = (shadows: string[]) =>
      shadows.some((s) => s.includes(PRIMARY_RGB) && s.includes('inset'));
    // Alt kenarda tek çizgi: inset gölge, birincil renk. antd gölge geçişi bitene kadar bekle.
    await expect
      .poll(async () => hasIndicator((await readFocus()).shadows), { timeout: 3000 })
      .toBe(true);
    const styles = await readFocus();
    // Çevreleyen outline yok: odaklanan öğede ve sarmalayıcılarda
    expect(styles.noOutline, 'odaklanan: ' + styles.testId).toBe(true);

    // pointerdown modu kapatır
    await page.mouse.click(5, 5);
    await expect(html).not.toHaveAttribute('data-focus-mode', 'keyboard');
  });

  test('ok tuşu klavye modunu açmaz', async ({ page }) => {
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('html')).not.toHaveAttribute('data-focus-mode', 'keyboard');
  });

  test('dokunma alanı: %12 genişleme, pasif kontrol hariç, bitişik kenar 0', async ({ page }) => {
    const md = page.getByTestId('btn-md');
    await expect(md).toHaveClass(/\bhit\b/);
    await expect(md).toHaveAttribute('data-hit-ok', '1');
    const info = await md.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const after = getComputedStyle(el, '::after');
      return {
        h: r.height,
        w: r.width,
        top: parseFloat(after.top),
        left: parseFloat(after.left),
        position: getComputedStyle(el).position,
        hit: el.getAttribute('data-hit') ?? '',
      };
    });
    const [t, , , l] = info.hit.split(' ').map(Number);
    // R1 + R2: üst/alt h·0.06; sol/sağ w·0.06 (komşu yoksa)
    expect(t).toBeCloseTo(info.h * 0.06, 1);
    expect(l ?? 0).toBeLessThanOrEqual(info.w * 0.06 + 0.01);
    // R7: ::after negatif offset ile dışa taşar; kutu konumlu
    expect(info.position).not.toBe('static');
    expect(info.top).toBeLessThan(0);
    expect(info.left).toBeLessThan(0);

    // R6: pasif buton genişlemez
    await expect(page.getByTestId('btn-disabled')).not.toHaveClass(/\bhit\b/);

    // R4: Space.Compact ortak kenar 0
    const leftHit = (await page.getByTestId('compact-left').getAttribute('data-hit')) ?? '';
    const rightHit = (await page.getByTestId('compact-right').getAttribute('data-hit')) ?? '';
    expect(Number(leftHit.split(' ')[1])).toBe(0);
    expect(Number(rightHit.split(' ')[3])).toBe(0);

    // R9: input sarmalayıcıya uygulanır
    const wrapper = page.locator('.ant-input-affix-wrapper').first();
    await expect(wrapper).toHaveClass(/\bhit\b/);
    await expect(page.getByTestId('input-md')).not.toHaveClass(/\bhit\b/);
  });

  test('dropdown ve select listesi tarayıcı yerel select değildir', async ({ page }) => {
    expect(await page.locator('select').count()).toBe(0);
  });

  test('axe: erişilebilirlik ihlali yok', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  async function switchToDark(page: Page) {
    // Renk geçişleri bitmeden axe ölçmesin: azaltılmış hareket tercihi geçişleri kapatır.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.getByText('Koyu', { exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    // antd renk geçişi bitene kadar bekle: koyu buton zemini #34343B.
    await expect(page.getByTestId('btn-sm')).toHaveCSS('background-color', 'rgb(52, 52, 59)');
  }

  test('axe: koyu temada erişilebilirlik ihlali yok (birincil buton hariç)', async ({ page }) => {
    await switchToDark(page);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .exclude('.ant-btn-primary')
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('bilinen sapma: koyu birincil buton metni AA kontrastının altında', async ({ page }) => {
    // Kaynak karar: metin #00aacc %85, zemin #00aacc %14. Ölçülen kontrast 4.24:1, AA 4.5:1 ister.
    // Karar proje sahibinindir. Bu test sapma giderilince kendiliğinden "beklenmedik geçti" verir.
    test.fail();
    await switchToDark(page);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .include('.ant-btn-primary')
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
