import type { Page } from '@playwright/test';
import { expect, test } from '../../../../tests/setup/playwright-fixtures';

/**
 * Record harness page. The e2e build serves the page at this path (vite.config.ts, e2eInputs).
 * Tests run in the root Playwright gate; there is no separate config file (AGENTS.md).
 */
const HARNESS = '/src/views/record/harness/';

async function overflowX(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

const isPhoneWidth = (page: Page): boolean => {
  const vp = page.viewportSize();
  return Boolean(vp && vp.width <= 767);
};

test.describe('kayıt formu yerleşimi ve 320 px uyumu', () => {
  test('sayfa yatay taşmaz; telefonda tek sütun, geniş ekranda iki sütun olur', async ({
    page,
  }) => {
    await page.goto(HARNESS);
    await expect(page.getByRole('heading', { level: 1, name: 'Örnek Kişi' })).toBeVisible();
    expect(await overflowX(page)).toBeLessThanOrEqual(0);

    const colCount = await page
      .locator('.rv-section-grid')
      .first()
      .evaluate((el) => getComputedStyle(el).gridTemplateColumns.trim().split(/\s+/).length);

    if (isPhoneWidth(page)) {
      expect(colCount).toBe(1);
    } else {
      expect(colCount).toBe(2);
    }
  });

  test('alt tablodaki Tutar alanı 320 px dahil okunur genişliktedir ve tablo kendi kutusunda kayar', async ({
    page,
  }) => {
    await page.goto(HARNESS);
    await expect(page.getByRole('heading', { level: 1, name: 'Örnek Kişi' })).toBeVisible();

    const amountInput = page.locator('.rv-table-cell--num input').first();
    await expect(amountInput).toBeVisible();
    const box = await amountInput.boundingBox();
    expect(box).not.toBeNull();
    // Major 4: even at 320 px the number input must stay readable in width (not 0 px).
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(72);
    expect(await overflowX(page)).toBeLessThanOrEqual(0);
  });
});

test.describe('imza alanı ve bağlantı araması', () => {
  test('imza tuvali birden çok çizgiyi ve sağ yarıdaki çizimi korur', async ({ page }) => {
    await page.goto(HARNESS);
    await expect(page.getByRole('heading', { level: 1, name: 'Örnek Kişi' })).toBeVisible();
    const canvas = page.getByRole('img', { name: 'Onay İmzası' });
    await canvas.scrollIntoViewIfNeeded();

    // Under load the layout can still change after the first paint. The stroke then lands in
    // the old box (review 2, K-1). The canvas position and size must settle before drawing. The
    // canvas pixel size must also match its displayed size and the screen density.
    const layout = () =>
      canvas.evaluate((el) => {
        const c = el as HTMLCanvasElement;
        const rect = c.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        return {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          synced:
            c.width === Math.round(Math.round(rect.width) * dpr) &&
            c.height === Math.round(Math.round(rect.height) * dpr),
        };
      });
    let previous = '';
    await expect
      .poll(async () => {
        const now = await layout();
        const key = JSON.stringify(now);
        const stable = now.synced && now.width > 0 && key === previous;
        previous = key;
        return stable;
      })
      .toBe(true);
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    // First stroke in the left half
    await page.mouse.move(box.x + box.width * 0.15, box.y + box.height * 0.3);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.35, box.y + box.height * 0.5, { steps: 6 });
    await page.mouse.up();

    // Second stroke in the right half (must not be clipped on a 1440 px wide canvas)
    await page.mouse.move(box.x + box.width * 0.65, box.y + box.height * 0.35);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.88, box.y + box.height * 0.65, { steps: 6 });
    await page.mouse.up();

    // Ink is read by polling, not a single read. The drawing may appear on the next frame.
    const ink = () =>
      canvas.evaluate((el) => {
        const c = el as HTMLCanvasElement;
        const ctx = c.getContext('2d');
        if (!ctx || c.width === 0 || c.height === 0) {
          return { leftInk: 0, rightInk: 0 };
        }
        const midX = Math.floor(c.width / 2);
        const leftData = ctx.getImageData(0, 0, midX, c.height).data;
        const rightData = ctx.getImageData(midX, 0, c.width - midX, c.height).data;
        let leftInk = 0;
        let rightInk = 0;
        for (let i = 3; i < leftData.length; i += 4) {
          if ((leftData[i] ?? 0) > 0) leftInk += 1;
        }
        for (let i = 3; i < rightData.length; i += 4) {
          if ((rightData[i] ?? 0) > 0) rightInk += 1;
        }
        return { leftInk, rightInk };
      });

    await expect.poll(async () => (await ink()).leftInk, 'sol yarıda mürekkep').toBeGreaterThan(10);
    await expect
      .poll(async () => (await ink()).rightInk, 'sağ yarıda mürekkep')
      .toBeGreaterThan(10);
    await expect(page.getByText('İmza alındı')).toBeVisible();
    await expect(page.getByText('1 kaydedilmemiş değişiklik')).toBeVisible();
  });

  // Each behaviour has its own test. Under load Linux WebKit delays frames by seconds.
  // Steps chained in one test add up their time (review 1, S-1). The expectations are unchanged.
  test('yazarak imzalama gerçek tarayıcıda PNG üretir', async ({ page }) => {
    await page.goto(HARNESS);
    await expect(page.getByRole('heading', { level: 1, name: 'Örnek Kişi' })).toBeVisible();

    // Minor 1: signing by typing must produce a PNG in a real browser
    await page.getByText('Yazarak imzala').click();
    await page.getByLabel('İmza metni').fill('Örnek İmza');
    await page.getByRole('button', { name: 'İmzayı uygula' }).click();
    await expect(page.getByText('İmza alındı')).toBeVisible();
    await expect(
      page.locator('[data-fieldname="signature"] img.rv-attach-preview'),
    ).toHaveAttribute('src', /^data:image\/png;base64,/);
  });

  test('bölüm kartında dekoratif kenarlık yoktur', async ({ page }) => {
    await page.goto(HARNESS);
    await expect(page.getByRole('heading', { level: 1, name: 'Örnek Kişi' })).toBeVisible();

    // Minor 12: the section card must have no decorative border (only shadow / surface tone)
    const cardBorderTop = await page
      .locator('.rv-section-card')
      .first()
      .evaluate((el) => getComputedStyle(el).borderTopWidth);
    expect(cardBorderTop).toBe('0px');
  });

  test('bağlantı araması hata alınca hata metni ve Yeniden dene gösterir', async ({ page }) => {
    await page.goto(`${HARNESS}?linkError=1`);
    await expect(page.getByRole('heading', { level: 1, name: 'Örnek Kişi' })).toBeVisible();

    const deptSelector = page.locator('[data-fieldname="department"] .ant-select-selector');
    await deptSelector.scrollIntoViewIfNeeded();
    await deptSelector.click();
    await expect(page.getByText('Arama sunucusuna ulaşılamadı.')).toBeVisible();
    await expect(page.getByText('Eşleşen kayıt yok')).toBeHidden();

    await page.getByRole('button', { name: 'Yeniden dene' }).click();
    await expect(
      page.locator('.ant-select-dropdown').getByText('Mühendislik', { exact: true }),
    ).toBeVisible();
    await expect(
      page.locator('.ant-select-dropdown').getByText('Operasyon', { exact: true }),
    ).toBeVisible();
  });
});

test.describe('odak kuralları', () => {
  test('fare tıklamasında klavye odak modu açılmaz, yalnız Tab ile açılır', async ({ page }) => {
    await page.goto(HARNESS);
    const root = page.locator('.rv-root');
    await expect(root).toHaveAttribute('data-rv-kbd', 'false');

    const input = page.getByLabel(/Çalışan Adı/);
    await input.click();
    await expect(root).toHaveAttribute('data-rv-kbd', 'false');

    await page.keyboard.press('Tab');
    await expect(root).toHaveAttribute('data-rv-kbd', 'true');
  });

  test('klavye odağında çevreleyen halka olmamalı ve görünür alt çizgi olmalı', async ({
    page,
  }) => {
    await page.goto(HARNESS);
    await expect(page.getByRole('heading', { level: 1, name: 'Örnek Kişi' })).toBeVisible();

    // The focus indicator arrives with a transition. Measure at the transition's end value.
    const inspectFocusedChain = async () =>
      page.evaluate(() => {
        // Animations are not awaited; they jump to their end value (`finish()`). Waiting depends
        // on paint frames. Linux WebKit paints in software. There the locked card shadow
        // (`layer7`) makes one frame take seconds. The 2-second poll then ran out
        // (PR #3 CI failure).
        // `getAnimations()` computes style at once. A new transition also enters this list.
        // Only finite animations are skipped. An infinite animation (like a loading icon)
        // does not end with `finish()`; it throws (review 2, S4).
        for (const animation of document.getAnimations()) {
          const end = animation.effect?.getComputedTiming().endTime;
          if (typeof end === 'number' && Number.isFinite(end)) animation.finish();
        }
        const root = document.querySelector('.rv-root');
        const active = document.activeElement;
        if (!root || !active || !root.contains(active)) {
          return { insideRoot: false, visibleOutlines: [], spreadRings: [], hasUnderline: false };
        }

        const splitShadowLayers = (raw: string): string[] => {
          if (!raw || raw === 'none') return [];
          const out: string[] = [];
          let depth = 0;
          let current = '';
          for (const ch of raw) {
            if (ch === '(') depth += 1;
            if (ch === ')') depth = Math.max(0, depth - 1);
            if (ch === ',' && depth === 0) {
              out.push(current.trim());
              current = '';
            } else {
              current += ch;
            }
          }
          if (current.trim()) out.push(current.trim());
          return out;
        };

        const visibleOutlines: string[] = [];
        const spreadRings: string[] = [];
        let hasUnderline = false;

        let node: Element | null = active;
        let stoppedControlWalk = false;
        while (node && root.contains(node)) {
          const style = getComputedStyle(node);
          const outlineW = Number.parseFloat(style.outlineWidth) || 0;
          if (style.outlineStyle !== 'none' && outlineW > 0) {
            visibleOutlines.push(`${node.tagName}:${style.outlineStyle}:${style.outlineWidth}`);
          }

          if (
            node.classList.contains('rv-section-card') ||
            node.classList.contains('rv-header') ||
            node.classList.contains('rv-body') ||
            node.classList.contains('rv-root')
          ) {
            stoppedControlWalk = true;
          }

          if (!stoppedControlWalk) {
            const layers = splitShadowLayers(style.boxShadow);
            for (const layer of layers) {
              const withoutColors = layer.replace(/rgba?\([^)]+\)/g, '').trim();
              const isInset = /\binset\b/.test(withoutColors);
              const nums = (withoutColors.match(/-?\d+(?:\.\d+)?px/g) ?? []).map((v) =>
                Number.parseFloat(v),
              );
              const [offX = 0, offY = 0, blur = 0, spread = 0] = nums;
              const alphaMatch = /rgba\([^)]*,\s*([\d.]+)\)/.exec(layer);
              const isTransparent = alphaMatch
                ? Number.parseFloat(alphaMatch[1] ?? '1') === 0
                : false;
              if (isInset && offX === 0 && offY < 0 && blur === 0) {
                if (!isTransparent) {
                  hasUnderline = true;
                }
              } else if (!isInset && (spread > 0 || (offX === 0 && offY === 0 && blur > 0))) {
                spreadRings.push(`${node.tagName}:${layer}`);
              }
            }
          }

          node = node.parentElement;
        }

        return { insideRoot: true, visibleOutlines, spreadRings, hasUnderline };
      });

    let visitedCount = 0;
    for (let step = 0; step < 60; step += 1) {
      await page.keyboard.press('Tab');
      const check = await inspectFocusedChain();
      if (!check.insideRoot) {
        if (visitedCount > 0) {
          break;
        }
        continue;
      }
      visitedCount += 1;
      expect(check.visibleOutlines, `Tab adımı ${step} outline bulundu`).toEqual([]);
      expect(check.spreadRings, `Tab adımı ${step} çevreleyen gölge bulundu`).toEqual([]);
      // antd adds the focus class on the next paint for some controls. Wait briefly for it.
      await expect
        .poll(async () => (await inspectFocusedChain()).hasUnderline, {
          message: `Tab adımı ${step} alt çizgi göstergesi eksik`,
          timeout: 2_000,
        })
        .toBe(true);
      const settled = await inspectFocusedChain();
      expect(settled.visibleOutlines, `Tab adımı ${step} outline bulundu`).toEqual([]);
      expect(settled.spreadRings, `Tab adımı ${step} çevreleyen gölge bulundu`).toEqual([]);
    }

    expect(visitedCount).toBeGreaterThanOrEqual(5);

    // WebKit may skip buttons and select items on Tab; also check them with direct focus
    for (const target of [
      page.getByRole('button', { name: 'Sonraki kayıt' }),
      page.getByRole('checkbox', { name: 'Ödendi' }),
    ]) {
      await target.focus();
      await expect
        .poll(async () => (await inspectFocusedChain()).hasUnderline, { timeout: 2_000 })
        .toBe(true);
      const check = await inspectFocusedChain();
      expect(check.visibleOutlines).toEqual([]);
      expect(check.spreadRings).toEqual([]);
    }
  });
});
