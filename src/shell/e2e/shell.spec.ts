import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

const isCompact = (page: Page) => {
  const v = page.viewportSize();
  return !!v && (v.width <= 767 || v.height <= 499);
};

async function overflowX(page: Page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

/** Sahte sunucunun tanıdığı liste: tablo gerçekten çizilir. `/satis/teklif` hata ekranını açar. */
const LIST = `/ornek/${encodeURIComponent('örnek-kayıt')}`;

const PAGES = ['/', '/satis/teklif', LIST, '/asistan', '/satis/teklif/TEK-0003'];

test.describe('yatay taşma', () => {
  for (const url of PAGES) {
    test(`taşma yok: ${url}`, async ({ page }) => {
      await page.goto(url);
      await expect(page.locator('.shell')).toBeVisible();
      await page.waitForTimeout(400);
      expect(await overflowX(page)).toBeLessThanOrEqual(0);
    });
  }

  test('telefonda açık çekmece taşma yapmaz', async ({ page }) => {
    test.skip(!isCompact(page), 'yalnız telefon kabuğu');
    await page.goto('/satis/teklif');
    await page.getByRole('button', { name: 'Menüyü aç' }).click();
    await expect(page.getByRole('dialog', { name: 'Menü' })).toBeVisible();
    await page.getByRole('button', { name: 'Satış', exact: true }).click();
    await expect(page.getByRole('group', { name: 'Satış' })).toBeVisible();
    expect(await overflowX(page)).toBeLessThanOrEqual(0);
  });
});

test.describe('klavye ile flyout', () => {
  test('odak açar, sağ ok içeri girer, Escape kapatır', async ({ page }) => {
    test.skip(isCompact(page), 'telefonda panel çekmece içinde açılır');
    await page.goto('/');
    const parent = page.getByRole('button', { name: 'Satış', exact: true });
    await parent.focus();
    const fly = page.getByRole('group', { name: 'Satış' });
    await expect(fly).toBeVisible();
    await expect(page.locator('body')).toHaveAttribute('data-focus-dim', 'on');

    // F1: sidebar sağ kenarına 8 px boşlukla bitişir.
    // F6 hareketi bitince ölçülür.
    await expect(fly).toHaveCSS('opacity', '1');
    await page.waitForTimeout(250);
    const sb = await page.locator('.shell-sb').boundingBox();
    const fb = await fly.boundingBox();
    expect(sb && fb && Math.round(fb.x - (sb.x + sb.width))).toBe(8);

    // F2: panel merkezi üst öğe merkezine denk gelir (taşma yoksa).
    const pb = await parent.boundingBox();
    if (pb && fb) {
      expect(Math.abs(fb.y + fb.height / 2 - (pb.y + pb.height / 2))).toBeLessThanOrEqual(1);
    }

    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('link', { name: /^Teklifler/ })).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('link', { name: 'Siparişler' })).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(fly).toBeHidden();
    await expect(parent).toBeFocused();
    await expect(page.locator('body')).not.toHaveAttribute('data-focus-dim', 'on');
  });

  test('klavyeyle gezinince odak göstergesi halka değildir', async ({ page }) => {
    test.skip(isCompact(page), 'geniş ekran');
    await page.goto('/');
    // Tembel sayfa gelene kadar beklenir. Sonra odak denetlenir.
    await expect(page.getByRole('heading', { level: 1, name: 'Ana sayfa' })).toBeVisible();
    // WebKit, Safari gibi Tab ile bağlantı ve düğmeleri atlar. Bu yüzden
    // menünün kendi aşağı ok gezinmesi kullanılır. Bu yol her motorda aynıdır.
    // Rota bağlantıları "Ana sayfa" ile "Satış" arasındadır. Rota listesinin son
    // parametresiz satırı "AI Studio" bağlantısıdır. "Satış" düğmesi ondan hemen sonradır.
    await page.getByRole('link', { name: 'AI Studio' }).focus();
    await page.keyboard.press('ArrowDown');
    const next = page.getByRole('button', { name: 'Satış', exact: true });
    await expect(next).toBeFocused();
    await expect(next).toHaveCSS('outline-style', 'none');
    await expect
      .poll(() => next.evaluate((el) => getComputedStyle(el, '::after').opacity))
      .toBe('1');
  });

  test('fare ile üzerine gelince açılır, ayrılınca kapanır', async ({ page }) => {
    test.skip(isCompact(page), 'telefonda hover yok');
    await page.goto('/');
    await page.getByRole('button', { name: 'Stok', exact: true }).hover();
    await expect(page.getByRole('group', { name: 'Stok' })).toBeVisible();
    await page.mouse.move(900, 600);
    await expect(page.getByRole('group', { name: 'Stok' })).toBeHidden();
  });
});

test.describe('telefon kabuğu', () => {
  test('çekmece açılır, flyout dokunmayla açılır, sayfaya gider', async ({ page }) => {
    test.skip(!isCompact(page), 'yalnız telefon kabuğu');
    await page.goto('/');
    await page.getByRole('button', { name: 'Menüyü aç' }).click();
    const drawer = page.getByRole('dialog', { name: 'Menü' });
    await expect(drawer).toBeVisible();
    await page.getByRole('button', { name: 'Satış', exact: true }).click();
    await page.getByRole('link', { name: 'Siparişler' }).click();
    await expect(page).toHaveURL(/\/satis\/siparis$/);
    await expect(drawer).toBeHidden();
    // Liste rotası tanımı sunucudan ister. Menüdeki örnek gruplar sahte sunucuda kayıtlı değildir.
    // Sahte sunucu yetki reddi verir. Sayfa tanım hatasını ve yeniden deneme düğmesini gösterir.
    await expect(page.getByRole('alert')).toContainText('Liste tanımı alınamadı');
    await expect(page.getByRole('button', { name: 'Yeniden dene' })).toBeVisible();
  });

  test('Escape çekmeceyi kapatır ve odak menü düğmesine döner', async ({ page }) => {
    test.skip(!isCompact(page), 'yalnız telefon kabuğu');
    await page.goto('/');
    const menu = page.getByRole('button', { name: 'Menüyü aç' });
    await menu.click();
    await expect(page.getByRole('dialog', { name: 'Menü' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Menü' })).toBeHidden();
    await expect(menu).toBeFocused();
  });
});

test.describe('yön değişimi', () => {
  test('telefonda açık panel ve odak korunur', async ({ page }) => {
    test.skip(!isCompact(page), 'yalnız telefon kabuğu');
    const v = page.viewportSize();
    test.skip(!v, '');
    if (!v) return;
    await page.goto('/');
    await page.getByRole('button', { name: 'Menüyü aç' }).click();
    await page.getByRole('button', { name: 'Satış', exact: true }).click();
    const link = page.getByRole('link', { name: 'Siparişler' });
    await link.focus();
    await page.setViewportSize({ width: v.height, height: v.width });
    await expect(page.getByRole('group', { name: 'Satış' })).toBeVisible();
    await expect(link).toBeFocused();
    await page.setViewportSize(v);
    await expect(page.getByRole('group', { name: 'Satış' })).toBeVisible();
    await expect(link).toBeFocused();
    expect(await overflowX(page)).toBeLessThanOrEqual(0);
  });

  test('geniş ekranda açık flyout ve odak korunur', async ({ page }) => {
    test.skip(isCompact(page), 'geniş ekran');
    await page.goto('/');
    await page.getByRole('button', { name: 'Satış', exact: true }).focus();
    await page.keyboard.press('ArrowRight');
    const link = page.getByRole('link', { name: /^Teklifler/ });
    await expect(link).toBeFocused();
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.getByRole('group', { name: 'Satış' })).toBeVisible();
    await expect(link).toBeFocused();
    await page.setViewportSize({ width: 1024, height: 768 });
    await expect(page.getByRole('group', { name: 'Satış' })).toBeVisible();
    await expect(link).toBeFocused();
  });
});

test.describe('header ve sayfalar', () => {
  test('liste rotası views-collection görünümünü çizer', async ({ page }) => {
    // Uygulama girişi liste rotasını ortak API istemcisine bağlar. Adres parçası DocType adına
    // çevrilir: `örnek-kayıt` -> `Örnek Kayıt`. Sahte sunucu yalnız bu türü verir.
    await page.goto(LIST);
    await expect(page.getByRole('heading', { level: 1, name: 'Kayıtlar' })).toBeAttached();
    await expect(page.getByText('ORNEK-0001').first()).toBeVisible();
    await expect(page.getByText('TEK-0001')).toHaveCount(0);
  });

  test('sahte sunucuda olmayan liste tanım hatasını gösterir', async ({ page }) => {
    await page.goto('/satis/teklif');
    await expect(page.getByRole('alert')).toContainText('Liste tanımı alınamadı');
    await expect(page.getByText('TEK-0001')).toHaveCount(0);
  });

  test('kayıt rotası views-record görünümünü çizer; kabuğun örnek formu çizilmez', async ({
    page,
  }) => {
    // Uygulama girişi kayıt rotasını `RecordView` bileşenine bağlar. Adres parçası DocType adına
    // çevrilir (`teklif` -> `Teklif`). Sahte sunucu bu türün tanımını vermez (403). Görünüm
    // erişim reddi durumunu gösterir. Kabuğun örnek formu yalnız bağlantısız deneme sayfasındadır.
    await page.goto('/satis/teklif/TEK-0003');
    const state = page.locator('.rv-state-card[role="alert"]');
    await expect(state).toContainText('Erişim izni yok');
    await expect(state).toContainText('Bu kaydı görüntüleme yetkiniz bulunmuyor.');
    await expect(page.getByText('3 / 24')).toHaveCount(0);
    await expect(page.getByLabel('Başlık')).toHaveCount(0);
  });

  for (const url of ['/satis/teklif', LIST]) {
    test(`metin boyutu kaynak alt sınırın altına inmez: ${url}`, async ({ page }) => {
      await page.goto(url);
      await page.waitForTimeout(400);
      const min = await page.evaluate(() => {
        let m = Infinity;
        for (const el of document.querySelectorAll<HTMLElement>('.shell *')) {
          if (!el.childNodes.length) continue;
          const hasText = [...el.childNodes].some(
            (n) => n.nodeType === 3 && (n.textContent ?? '').trim(),
          );
          if (!hasText || el.closest('.shell-vh')) continue;
          const r = el.getBoundingClientRect();
          if (!r.width) continue;
          m = Math.min(m, parseFloat(getComputedStyle(el).fontSize));
        }
        return m;
      });
      expect(min).toBeGreaterThanOrEqual(12);
    });
  }
});

test.describe('kayan hover zemini (G1–G3)', () => {
  const glide = (page: Page) => page.locator('.shell-sb .shell-glide').first();

  async function centerY(page: Page, name: string) {
    const b = await page.getByRole('button', { name, exact: true }).boundingBox();
    return b ? b.y + b.height / 2 : 0;
  }

  async function glideCenterY(page: Page) {
    const b = await glide(page).boundingBox();
    return b ? b.y + b.height / 2 : -1;
  }

  /** Yazı tipi gelmeden ölçülen öğe konumu sonra kayar. Zemin eski konuma yerleşmiş olur. */
  async function fontsReady(page: Page) {
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
  }

  test('G1: zemin üzerine gelinen öğeye kayar', async ({ page }) => {
    test.skip(isCompact(page), 'telefonda hover yok');
    await page.goto('/satis/teklif');
    await fontsReady(page);
    await page.getByRole('button', { name: 'Stok', exact: true }).hover();
    await expect(glide(page)).toHaveAttribute('data-on', 'true');
    await page.getByRole('button', { name: 'Muhasebe', exact: true }).hover();
    await expect.poll(() => glideCenterY(page)).toBeCloseTo(await centerY(page, 'Muhasebe'), 0);
  });

  test('G3: listeden çıkınca zemin solar', async ({ page }) => {
    test.skip(isCompact(page), 'telefonda hover yok');
    await page.goto('/satis/teklif');
    await page.getByRole('button', { name: 'Stok', exact: true }).hover();
    await expect(glide(page)).toHaveAttribute('data-on', 'true');
    await page.mouse.move(900, 700);
    await expect(glide(page)).toHaveAttribute('data-on', 'false');
  });

  test('G1: flyout panelinde zemin öğeler arasında kayar', async ({ page }) => {
    test.skip(isCompact(page), 'telefonda hover yok');
    await page.goto('/satis/teklif');
    await fontsReady(page);
    await page.getByRole('button', { name: 'Satış', exact: true }).hover();
    const fly = page.getByRole('group', { name: 'Satış' });
    const flyGlide = fly.locator('.shell-glide');
    const first = fly.getByRole('link').nth(0);
    const second = fly.getByRole('link').nth(1);
    await first.hover();
    await expect(flyGlide).toHaveAttribute('data-on', 'true');
    await second.hover();
    const target = await second.boundingBox();
    await expect
      .poll(async () => {
        const b = await flyGlide.boundingBox();
        return b ? b.y + b.height / 2 : -1;
      })
      .toBeCloseTo(target ? target.y + target.height / 2 : 0, 0);
  });

  test('G3: klavye odağı zemini taşır', async ({ page }) => {
    test.skip(isCompact(page), 'geniş ekran');
    await page.goto('/satis/teklif');
    await fontsReady(page);
    await page.getByRole('button', { name: 'Stok', exact: true }).focus();
    await page.keyboard.press('Escape');
    await expect(glide(page)).toHaveAttribute('data-on', 'true');
    await expect.poll(() => glideCenterY(page)).toBeCloseTo(await centerY(page, 'Stok'), 0);
  });
});
