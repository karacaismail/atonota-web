import AxeBuilder from '@axe-core/playwright';
import type { Locator, Page } from '@playwright/test';
import { expect, test } from '../../../tests/setup/playwright-fixtures';

/**
 * Ana sayfa (Bekleyenler). Veri sahte sunucunun `get_home_summary` ucundan gelir.
 * Senaryo adı sayfa açılmadan önce `sessionStorage` içine yazılır (`src/mocks/scenarios.ts`).
 * Varsayılan veride tek açık talep vardır: ORNEK-IZIN-0001, Örnek Kişi.
 */
const SCENARIO_KEY = 'atonota.mock-senaryo';

async function open(page: Page, scenario?: string) {
  if (scenario) {
    await page.addInitScript(({ key, value }) => sessionStorage.setItem(key, value), {
      key: SCENARIO_KEY,
      value: scenario,
    });
  }
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Bekleyenler' })).toBeVisible();
}

const pendingList = (page: Page) => page.getByRole('list', { name: /Onayınızı bekleyen/ });

function row(page: Page, who: string): Locator {
  return pendingList(page).getByRole('listitem').filter({ hasText: who });
}

async function settle(page: Page) {
  await page.evaluate(async () => {
    await Promise.all(
      document
        .getAnimations()
        .filter((a) => Number.isFinite(a.effect?.getComputedTiming().endTime))
        .map((a) => a.finished.catch(() => undefined)),
    );
  });
}

const coarse = (page: Page) => page.evaluate(() => matchMedia('(any-pointer: coarse)').matches);

test.describe('ana sayfa: Bekleyenler', () => {
  test('dört adımda onay: aç, gör, Onayla, Onaylandı', async ({ page }) => {
    await open(page, 'ana-sayfa-iki-bekleyen');
    const item = row(page, 'Örnek Kişi 3');
    await expect(item).toBeVisible();
    await item.getByRole('button', { name: /Onayla/ }).click();
    await expect(item.getByText('Onaylandı')).toBeVisible();
    await expect(page.getByRole('status', { name: 'Karar sonucu' })).toHaveText(
      'Örnek Kişi 3: Örnek Yıllık İzin onaylandı.',
    );
    await expect(
      page.getByRole('heading', { level: 2, name: 'Onayınızı bekleyen 1 izin talebi var' }),
    ).toBeVisible();
    // Sunucu kararı yazdı: son değişikliklerde onay görünür.
    await page.reload();
    await expect(row(page, 'Örnek Kişi 3')).toHaveCount(0);
  });

  test('klavyeyle ret: Tab ile düğmeye gelinir, Enter ile reddedilir', async ({ page }) => {
    await open(page);
    const item = row(page, 'Örnek Kişi');
    const reject = item.getByRole('button', { name: /Reddet/ });
    await expect(reject).toBeVisible();
    const approve = item.getByRole('button', { name: /Onayla/ });
    await approve.focus();
    await page.keyboard.press('Tab');
    await expect(reject).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(item.getByText('Reddedildi')).toBeVisible();
    await expect(page.getByRole('status', { name: 'Karar sonucu' })).toHaveText(
      'Örnek Kişi: Örnek Yıllık İzin reddedildi.',
    );
    await expect(
      page.getByText('Onayınızı bekleyen iş yok. Yeni talep gelince burada görünür.'),
    ).toBeVisible();
  });

  test('dokunmayla onay', async ({ page }) => {
    test.skip(!(await page.evaluate(() => 'ontouchstart' in window)), 'dokunma yok');
    await open(page);
    const item = row(page, 'Örnek Kişi');
    await item.getByRole('button', { name: /Onayla/ }).tap();
    await expect(item.getByText('Onaylandı')).toBeVisible();
  });

  test('bekleyen talep yoksa ekran açıkça yazar, "Kayıt yok" demez', async ({ page }) => {
    await open(page, 'ana-sayfa-bos');
    await expect(
      page.getByText('Onayınızı bekleyen iş yok. Yeni talep gelince burada görünür.'),
    ).toBeVisible();
    await expect(page.getByText('Kayıt yok')).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 2, name: 'Sorunlu kayıtlar' })).toBeVisible();
  });

  test('sunucu hata verirse hata yazılır ve yeniden denenir', async ({ page }) => {
    await open(page, 'ana-sayfa-hata');
    await expect(page.getByRole('alert')).toContainText('Bir sorun çıktı');
    await expect(page.getByRole('button', { name: 'Yeniden dene' })).toBeVisible();
    await expect(page.getByText('Kayıt yok')).toHaveCount(0);
  });

  test('eski sürümle onay hata verir, talep listede kalır', async ({ page }) => {
    await open(page, 'ana-sayfa-eski-surum');
    const item = row(page, 'Örnek Kişi');
    await item.getByRole('button', { name: /Onayla/ }).click();
    await expect(item.getByRole('alert')).toContainText('Bu kaydı başka biri değiştirdi');
    await expect(item.getByRole('button', { name: /Onayla/ })).toBeVisible();
    await expect(item.getByText('Onaylandı')).toHaveCount(0);
  });

  test('bölüm sırası taslaktaki gibidir', async ({ page }) => {
    await open(page);
    await expect(page.getByRole('heading', { level: 2 })).toHaveText([
      /Onayınızı bekleyen/,
      'Sorunlu kayıtlar',
      'Son değişiklikler',
      'Özet sayılar',
    ]);
  });

  test('sahte ilerleme yoktur', async ({ page }) => {
    await page.route('**/api/method/hrms_tr.api.get_home_summary*', () => undefined);
    await page.goto('/');
    await expect(page.getByText('Bekleyen işler yükleniyor.')).toBeVisible();
    await expect(page.getByRole('progressbar')).toHaveCount(0);
    const text = (await page.locator('.shell-body').innerText()).trim();
    expect(text).not.toMatch(/%|\d{1,2}[:.]\d{2}/);
  });

  test('yatay taşma yoktur', async ({ page }) => {
    await open(page, 'ana-sayfa-iki-bekleyen');
    await expect(row(page, 'Örnek Kişi 3')).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('dokunmalı ekranda düğmelerin dokunma alanı en az 48 px', async ({ page }) => {
    await open(page);
    test.skip(!(await coarse(page)), 'yalnız dokunmalı işaretçi');
    const item = row(page, 'Örnek Kişi');
    for (const button of [
      item.getByRole('button', { name: /Onayla/ }),
      item.getByRole('button', { name: /Reddet/ }),
      page.getByRole('button', { name: 'Yeni izin talebi' }),
    ]) {
      const box = await button.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(48);
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(48);
    }
  });

  test('yazı Outfit, en küçük metin 14 px, gövde 16 px', async ({ page }) => {
    await open(page, 'ana-sayfa-iki-bekleyen');
    await expect(row(page, 'Örnek Kişi 3')).toBeVisible();
    const r = await page.locator('.shell-home').evaluate((root) => {
      const sizes: number[] = [];
      const fonts = new Set<string>();
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const el = n.parentElement;
        if (!el || !n.textContent?.trim()) continue;
        const cs = getComputedStyle(el);
        if (cs.position === 'absolute' && cs.clip === 'rect(0px, 0px, 0px, 0px)') continue;
        sizes.push(Number.parseFloat(cs.fontSize));
        fonts.add(cs.fontFamily.split(',')[0]?.replace(/['"]/g, '').trim() ?? '');
      }
      const meta = root.querySelector('.shell-home-who');
      return {
        min: Math.min(...sizes),
        fonts: [...fonts],
        body: meta ? Number.parseFloat(getComputedStyle(meta).fontSize) : 0,
      };
    });
    expect(r.min).toBeGreaterThanOrEqual(14);
    expect(r.body).toBe(16);
    expect(r.fonts).toEqual(['Outfit Variable']);
  });

  test('klavye odağı tek göstergedir, çevreleyen halka yoktur', async ({ page }) => {
    await open(page);
    const approve = row(page, 'Örnek Kişi').getByRole('button', { name: /Onayla/ });
    await expect(approve).toBeVisible();
    await settle(page);
    // Klavye modu Tab ile açılır. Odak önceki düğmeden Tab ile gelir.
    await page.getByRole('button', { name: 'Yeni izin talebi' }).focus();
    await approve.focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    await expect(approve).toBeFocused();
    const s = await approve.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { outline: cs.outlineStyle, shadow: cs.boxShadow };
    });
    // Merkezi gösterge alttaki iç çizgidir (`src/design/css-variables.ts`). Halka yoktur.
    expect(s.outline).toBe('none');
    expect(s.shadow).toMatch(/inset/);
    expect(s.shadow).not.toMatch(/0px 0px 0px [1-9]/);
  });

  test('kavisli vurgu kenarı yoktur', async ({ page }) => {
    await open(page, 'ana-sayfa-iki-bekleyen');
    await expect(row(page, 'Örnek Kişi 3')).toBeVisible();
    const offenders = await page.locator('.shell-home').evaluate((root) =>
      [...root.querySelectorAll('*')]
        .filter((el) => {
          const cs = getComputedStyle(el);
          const radius = Number.parseFloat(cs.borderTopLeftRadius) > 0;
          const widths = [
            cs.borderTopWidth,
            cs.borderRightWidth,
            cs.borderBottomWidth,
            cs.borderLeftWidth,
          ].map(Number.parseFloat);
          const one = widths.filter((w) => w > 0).length;
          return radius && one > 0 && one < 4;
        })
        .map((el) => el.className),
    );
    expect(offenders).toEqual([]);
  });

  test('reduced motion tercihinde hareket durur', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page);
    await row(page, 'Örnek Kişi')
      .getByRole('button', { name: /Onayla/ })
      .click();
    await expect(row(page, 'Örnek Kişi').getByText('Onaylandı')).toBeVisible();
    const running = await page.locator('.shell-home').evaluate((root) =>
      root
        .getAnimations({ subtree: true })
        .filter((a) => a.playState === 'running')
        .map((a) => (a as CSSAnimation).animationName ?? 'geçiş'),
    );
    expect(running).toEqual([]);
  });

  test('axe hata vermez', async ({ page }) => {
    await open(page, 'ana-sayfa-iki-bekleyen');
    await expect(row(page, 'Örnek Kişi 3')).toBeVisible();
    await settle(page);
    const r = await new AxeBuilder({ page }).include('.shell-home').analyze();
    expect(
      r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
    ).toEqual([]);
  });
});
