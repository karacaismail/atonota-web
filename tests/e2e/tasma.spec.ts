import { expect, test, type Page } from '@playwright/test';

const DEMO = '/_demo/foundation';

/**
 * Yatay taşma (px). Üç ölçüm birlikte:
 * 1. belge genişliği, 2. öğe kutularının ekran dışına çıkması,
 * 3. içeriği kutusunu aşan öğeler (kesilen metin). `[data-scroll-x]` kapsayıcıları kendi içinde kayar ve sayılmaz.
 */
export async function overflow(page: Page): Promise<{ worst: number; offenders: string[] }> {
  return page.evaluate(() => {
    // Dokunma alanı katmanı (::after) içerik değildir; ölçüm sırasında kapatılır.
    const probe = document.createElement('style');
    probe.textContent = '.hit::after { display: none !important; }';
    document.head.appendChild(probe);
    const limit = document.documentElement.clientWidth;
    let worst = document.documentElement.scrollWidth - limit;
    const offenders: string[] = [];
    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('*'))) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      // Kaydırma kapsayıcısının içindekiler kayarak erişilir; kapsayıcının kendisi ölçülür.
      const scroller = el.closest('[data-scroll-x]');
      if (scroller && scroller !== el) continue;
      const outside = Math.max(r.right - limit, -r.left);
      if (outside > 0.5)
        offenders.push(`${el.tagName.toLowerCase()} kutu ${outside.toFixed(1)}px dışarıda`);
      worst = Math.max(worst, outside);
      if (scroller) continue;
      const inner = el.scrollWidth - el.clientWidth;
      if (inner > 1 && el.clientWidth > 0) {
        offenders.push(`${el.tagName.toLowerCase()} içerik ${inner}px taşıyor`);
        worst = Math.max(worst, inner);
      }
    }
    probe.remove();
    return { worst: Math.round(worst * 100) / 100, offenders: offenders.slice(0, 8) };
  });
}

test.describe('yatay taşma', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(DEMO);
    await expect(page.getByRole('heading', { level: 1, name: 'Atonota' })).toBeVisible();
  });

  test('sayfa açık ve koyu temada yatay taşmaz', async ({ page }) => {
    const light = await overflow(page);
    expect(light.worst, light.offenders.join('; ')).toBeLessThanOrEqual(0);
    await page.getByRole('radiogroup', { name: 'Tema' }).getByText('Koyu', { exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    const dark = await overflow(page);
    expect(dark.worst, dark.offenders.join('; ')).toBeLessThanOrEqual(0);
  });

  test('dedektör kesilen metni yakalar (negatif kontrol)', async ({ page }) => {
    await page.evaluate(() => {
      const p = document.createElement('p');
      p.id = 'tasma-probe';
      p.textContent = 'A'.repeat(400);
      document.querySelector('main')?.appendChild(p);
    });
    const withProbe = await overflow(page);
    expect(withProbe.worst).toBeGreaterThan(0);
    expect(withProbe.offenders.join(' ')).toContain('içerik');
    await page.evaluate(() => document.getElementById('tasma-probe')?.remove());
    expect((await overflow(page)).worst).toBeLessThanOrEqual(0);
  });

  test('geniş tablo kendi kapsayıcısında kayar, sayfa taşmaz', async ({ page }) => {
    const container = page.getByTestId('wide-table');
    await expect(container).toBeVisible();
    const scrollable = await container.evaluate((el) => {
      const s = el.querySelector<HTMLElement>('[data-scroll-x]') ?? (el as HTMLElement);
      return { inner: s.scrollWidth - s.clientWidth, overflowX: getComputedStyle(s).overflowX };
    });
    const viewport = page.viewportSize()!;
    // Telefon genişliklerinde sütun en küçük genişlikleri toplamı ekranı aşar; tablo kaymalıdır.
    if (viewport.width < 600) {
      expect(scrollable.inner).toBeGreaterThan(0);
      expect(['auto', 'scroll']).toContain(scrollable.overflowX);
    }
    const result = await overflow(page);
    expect(result.worst, result.offenders.join('; ')).toBeLessThanOrEqual(0);
    // Tablo başlıkları sözcük ortasından bölünmez
    const broken = await container.evaluate((el) =>
      Array.from(el.querySelectorAll('th')).some(
        (th) => getComputedStyle(th).wordBreak === 'break-all',
      ),
    );
    expect(broken).toBe(false);
  });
});
