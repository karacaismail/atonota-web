import AxeBuilder from '@axe-core/playwright';
import { isBottomBarOnly as isBottomBar, splitShadows, tokenColor } from '../setup/odak-gostergesi';
import { expect, test, type Locator, type Page } from '../setup/playwright-fixtures';

const DEMO = '/_demo/foundation';

/** Odak göstergesi rengi tokendan okunur (`--focus-indicator-color`); testte renk yazılmaz. */
let FOCUS_RGB = '';

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

/** Odak renginde tek alt çizgi mi? Ortak denetim: `tests/setup/odak-gostergesi.ts`. */
function isBottomBarOnly(shadow: string): boolean {
  return isBottomBar(shadow, FOCUS_RGB);
}

async function openKeyboardMode(page: Page) {
  await page.keyboard.press('Tab');
  await expect(page.locator('html')).toHaveAttribute('data-focus-mode', 'keyboard');
}

/**
 * Uygulama hazır olana kadar bekler: yazı tipleri yüklendi, açılış hareketleri bitti ve dokunma
 * alanı motoru düğmeyi işledi (`data-hit`). Yük altında odak bu adımlar bitmeden verilince
 * sayfa yerleşirken odak kayboluyordu.
 */
async function appReady(page: Page) {
  await expect(page.getByRole('heading', { level: 1, name: 'Atonota' })).toBeVisible();
  await expect(page.getByTestId('btn-md')).toHaveAttribute('data-hit', /./);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      document.getAnimations().map((animation) => animation.finished.catch(() => undefined)),
    );
  });
}

/**
 * Deneme sayfasını açar. Azaltılmış hareket sayfa yüklenmeden önce ayarlanır. Sayfa açıkken
 * ayarlanırsa tema yeniden kurulur; o sırada verilen odak yük altında kaybolabiliyordu.
 */
async function openDemo(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(DEMO);
  await appReady(page);
}

/**
 * Dokunmatik profilde (`hover: none`, örneğin `iphone-13`) üzerine gelme durumu yoktur.
 * O profilde üzerine gelme zemininin ya da yazısının değişmesi beklenmez.
 * Kontrast ölçümü yine yapılır. Masaüstü profillerinde renk değişimi zorunludur.
 * Daraltma test adında "dokunmatikte renk değişimi beklenmez" diye yazılıdır.
 * Koşu raporuna da not düşülür (inceleme 2, K1).
 */
async function canHover(page: Page): Promise<boolean> {
  const hoverable = await page.evaluate(() => window.matchMedia('(hover: hover)').matches);
  if (!hoverable) {
    test.info().annotations.push({
      type: 'daraltma',
      description: 'Dokunmatik profil: üzerine gelme renk değişimi beklenmedi. Kontrast ölçüldü.',
    });
  }
  return hoverable;
}

test.describe('odak göstergesi: üç durak', () => {
  test.beforeEach(async ({ page }) => {
    await openDemo(page);
    FOCUS_RGB = await tokenColor(page, '--focus-indicator-color');
  });

  test('metin bağlantısında klavye odağı 2 px vurgu rengi alt çizgi olur; halka yok', async ({
    page,
  }) => {
    const link = page.getByRole('link', { name: 'yardım sayfasına' });
    const look = () =>
      link.evaluate((el) => {
        const s = getComputedStyle(el);
        return {
          color: s.textDecorationColor,
          thickness: s.textDecorationThickness,
          line: s.textDecorationLine,
          outline: s.outlineStyle === 'none' || s.outlineWidth === '0px',
          shadow: s.boxShadow,
        };
      });
    const rest = await look();
    expect(rest.line, 'dinlenmede altı çizili').toBe('underline');
    await openKeyboardMode(page);
    await link.focus();
    await expect(link).toBeFocused();
    const focused = await look();
    expect(focused.line).toBe('underline');
    // Açık temada vurgu rengi #00aacc değildir (AJA-997); değer tokendan gelir.
    expect(FOCUS_RGB, 'açık temada odak rengi birincil renk değildir').not.toBe(
      await tokenColor(page, '--color-primary'),
    );
    expect(focused.color, 'odak çizgisi vurgu rengi').toBe(FOCUS_RGB);
    expect(focused.thickness, 'odak çizgisi 2 px').toBe('2px');
    // Bağlantı ve odak aynı vurgu rengini kullanır (AJA-997). Gösterge çizgiyi kalınlaştırır.
    expect(
      focused.thickness !== rest.thickness || focused.color !== rest.color,
      'odak görünümü dinlenmeden farklı',
    ).toBe(true);
    expect(focused.outline, 'çevreleyen halka yok').toBe(true);
    expect(focused.shadow).toBe('none');
  });

  test('düğme, giriş ve açılır listede tek kenarlı gösterge; çevreleyen gölge yok', async ({
    page,
  }) => {
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
      const primaryParts = parts.filter((p) => p.includes(FOCUS_RGB));
      expect(primaryParts, `${stop.name}: ${parts.join(' | ')}`).toHaveLength(1);
      expect(primaryParts.every(isBottomBarOnly), stop.name).toBe(true);
      const outline = await stop.indicator.evaluate((el) => {
        const s = getComputedStyle(el);
        return s.outlineStyle === 'none' || s.outlineWidth === '0px';
      });
      expect(outline, `${stop.name}: outline`).toBe(true);
      if (stop.inner) {
        const innerShadow = await stop.inner.evaluate((el) => getComputedStyle(el).boxShadow);
        expect(innerShadow, `${stop.name}: iç öğe`).not.toContain(FOCUS_RGB);
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

/**
 * Düğmenin kontrastını tarayıcıda ölçer. Zemin, düğmenin altındaki ilk saydam olmayan atanın
 * (kart, pencere ya da sayfa) hesaplanmış arka planıdır; yarı saydam katmanlar sırayla bindirilir.
 */
async function measureContrast(btn: Locator): Promise<number> {
  return btn.evaluate((el) => {
    const parse = (c: string) => {
      const m = c.match(/[\d.]+/g) ?? [];
      return { r: +m[0]!, g: +m[1]!, b: +m[2]!, a: m[3] === undefined ? 1 : +m[3] };
    };
    type Rgba = ReturnType<typeof parse>;
    const blend = (f: Rgba, b: Rgba): Rgba => ({
      r: f.a * f.r + (1 - f.a) * b.r,
      g: f.a * f.g + (1 - f.a) * b.g,
      b: f.a * f.b + (1 - f.a) * b.b,
      a: 1,
    });
    const lum = (c: Rgba) => {
      const ch = (v: number) => {
        const x = v / 255;
        return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * ch(c.r) + 0.7152 * ch(c.g) + 0.0722 * ch(c.b);
    };
    // Atalardan aşağı doğru: en alttaki saydam olmayan zeminden başlayıp katmanları bindir.
    const layers: Rgba[] = [];
    for (let node = el.parentElement; node; node = node.parentElement) {
      const c = parse(getComputedStyle(node).backgroundColor);
      if (c.a > 0) layers.unshift(c);
      if (c.a >= 1) break;
    }
    let surface: Rgba = parse(getComputedStyle(document.body).backgroundColor);
    if (surface.a < 1) surface = { r: 255, g: 255, b: 255, a: 1 };
    for (const layer of layers) surface = blend(layer, surface);
    const bg = blend(parse(getComputedStyle(el).backgroundColor), surface);
    const fg = blend(parse(getComputedStyle(el).color), bg);
    const [l1, l2] = [lum(fg), lum(bg)].sort((a, b) => b - a);
    return Math.round(((l1! + 0.05) / (l2! + 0.05)) * 100) / 100;
  });
}

async function switchToDark(page: Page) {
  await page.getByRole('radiogroup', { name: 'Tema' }).getByText('Koyu', { exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
}

/**
 * Tehlikeli birincil düğme (`type="primary" danger`). antd bu düğmeye de `ant-btn-primary` sınıfını
 * verir. Projenin birincil düğme kuralları onu dışarıda bırakır: zemin kırmızı kalır, metin beyazdır,
 * kontrast iki temada ve üç durumda en az 4.5:1 olur.
 */
test.describe('tehlikeli birincil düğme', () => {
  for (const theme of ['açık', 'koyu'] as const) {
    test(`${theme} temada kırmızı zemin, beyaz metin ve en az 4.5:1 (dokunmatikte renk değişimi beklenmez)`, async ({
      page,
    }) => {
      await openDemo(page);
      if (theme === 'koyu') await switchToDark(page);
      const btn = page.getByTestId('btn-danger-primary');
      const primaryBtn = page.getByTestId('btn-md');
      const bgOf = () => btn.evaluate((el) => getComputedStyle(el).backgroundColor);
      const colorOf = () => btn.evaluate((el) => getComputedStyle(el).color);
      const channels = (rgb: string) => (rgb.match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
      const restBg = await bgOf();
      const primaryBg = await primaryBtn.evaluate((el) => getComputedStyle(el).backgroundColor);
      expect(restBg, 'tehlikeli düğme birincil düğmeyle aynı görünmez').not.toBe(primaryBg);
      const [r, g, b] = channels(restBg);
      expect(r, `zemin kırmızıdır: ${restBg}`).toBeGreaterThan(g!);
      expect(r, `zemin kırmızıdır: ${restBg}`).toBeGreaterThan(b!);
      expect(await colorOf(), 'metin beyaz').toBe('rgb(255, 255, 255)');
      expect(await measureContrast(btn), 'normal').toBeGreaterThanOrEqual(4.5);
      const hoverable = await canHover(page);
      await btn.hover();
      if (hoverable) {
        await expect.poll(bgOf, { message: 'üzerine gelme zemini değişir' }).not.toBe(restBg);
      }
      expect(await colorOf(), 'üzerine gelmede metin beyaz').toBe('rgb(255, 255, 255)');
      await expect
        .poll(() => measureContrast(btn), { message: 'üzerine gelme' })
        .toBeGreaterThanOrEqual(4.5);
      const hoverBg = await bgOf();
      const box = (await btn.boundingBox())!;
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await expect.poll(bgOf, { message: 'basılı zemin değişir' }).not.toBe(hoverBg);
      await expect
        .poll(() => measureContrast(btn), { message: 'basılı' })
        .toBeGreaterThanOrEqual(4.5);
      await page.mouse.up();
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2aa'])
        .include('.ant-btn-dangerous')
        .analyze();
      expect(results.violations).toEqual([]);
    });
  }
});

/**
 * Kenarlıklı, metin ve bağlantı türü tehlike düğmesi. antd bu türlerde tehlike rengini yazı rengi
 * yapar. Yazı rengi düz düğmenin zemininden ayrı türetilir: yerleşim, panel ve yükseltilmiş zeminde,
 * dinlenme, üzerine gelme ve basılı durumda en az 4.5:1 verir. Düz düğmenin zemini değişmez.
 */
test.describe('tehlike düğmesi türleri: kenarlıklı, metin ve bağlantı', () => {
  const kinds = [
    { name: 'kenarlıklı', id: 'btn-danger-outlined' },
    { name: 'metin', id: 'btn-danger-text' },
    { name: 'bağlantı', id: 'btn-danger-link' },
    { name: 'kart içinde metin', id: 'btn-card-danger-text' },
  ] as const;
  for (const theme of ['açık', 'koyu'] as const) {
    test(`${theme} temada yazı her türde ve durumda en az 4.5:1 (dokunmatikte renk değişimi beklenmez)`, async ({
      page,
    }) => {
      await openDemo(page);
      if (theme === 'koyu') await switchToDark(page);
      const channels = (rgb: string) => (rgb.match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
      const solidBg = await page
        .getByTestId('btn-danger-primary')
        .evaluate((el) => getComputedStyle(el).backgroundColor);
      const hoverable = await canHover(page);
      for (const kind of kinds) {
        const btn = page.getByTestId(kind.id);
        const colorOf = () => btn.evaluate((el) => getComputedStyle(el).color);
        const restColor = await colorOf();
        const [r, g, b] = channels(restColor);
        expect(r, `${kind.name}: yazı kırmızıdır: ${restColor}`).toBeGreaterThan(g!);
        expect(r, `${kind.name}: yazı kırmızıdır: ${restColor}`).toBeGreaterThan(b!);
        expect(restColor, `${kind.name}: yazı rengi düz zemin rengi değildir`).not.toBe(solidBg);
        expect(await measureContrast(btn), `${kind.name}: normal`).toBeGreaterThanOrEqual(4.5);
        await btn.hover();
        if (hoverable) {
          await expect
            .poll(colorOf, { message: `${kind.name}: üzerine gelme rengi değişir` })
            .not.toBe(restColor);
        }
        await expect
          .poll(() => measureContrast(btn), { message: `${kind.name}: üzerine gelme` })
          .toBeGreaterThanOrEqual(4.5);
        const box = (await btn.boundingBox())!;
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await expect
          .poll(() => measureContrast(btn), { message: `${kind.name}: basılı` })
          .toBeGreaterThanOrEqual(4.5);
        await page.mouse.up();
        await page.mouse.move(0, 0);
      }
      // Pencere (yükseltilmiş zemin) içindeki metin türü tehlike düğmesi.
      await page.getByTestId('modal-open').click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      const modalBtn = page.getByTestId('btn-modal-danger-text');
      expect(await measureContrast(modalBtn), 'pencere: normal').toBeGreaterThanOrEqual(4.5);
      await modalBtn.hover();
      await expect
        .poll(() => measureContrast(modalBtn), { message: 'pencere: üzerine gelme' })
        .toBeGreaterThanOrEqual(4.5);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2aa'])
        .include('.ant-btn-dangerous')
        .analyze();
      expect(results.violations).toEqual([]);
    });
  }
});

test.describe('koyu birincil düğme kontrastı', () => {
  test.beforeEach(async ({ page }) => {
    await openDemo(page);
    await switchToDark(page);
  });

  test('sayfa zemininde normal, üzerine gelme ve basılı durumlar en az 4.5:1 (dokunmatikte renk değişimi beklenmez)', async ({
    page,
  }) => {
    const btn = page.getByTestId('btn-md');
    const bgOf = () => btn.evaluate((el) => getComputedStyle(el).backgroundColor);
    const restBg = await bgOf();
    // Zemin düz renktir: saydamlık yok.
    expect(restBg, 'zemin saydam değil').toMatch(/^rgb\(/);
    expect(await measureContrast(btn), 'normal').toBeGreaterThanOrEqual(4.5);
    const hoverable = await canHover(page);
    await btn.hover();
    if (hoverable) {
      await expect.poll(bgOf, { message: 'üzerine gelme zemini değişir' }).not.toBe(restBg);
    }
    const hoverBg = await bgOf();
    await expect
      .poll(() => measureContrast(btn), { message: 'üzerine gelme' })
      .toBeGreaterThanOrEqual(4.5);
    const box = (await btn.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await expect.poll(bgOf, { message: 'basılı zemin değişir' }).not.toBe(hoverBg);
    await expect
      .poll(() => measureContrast(btn), { message: 'basılı' })
      .toBeGreaterThanOrEqual(4.5);
    await page.mouse.up();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .include('.ant-btn-primary')
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('klavyeyle basılı (Space) durum en az 4.5:1', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'WebKit klavyeyle basılıyken :active uygulamaz');
    const btn = page.getByTestId('btn-md');
    await openKeyboardMode(page);
    await btn.focus();
    await expect(btn).toBeFocused();
    const restBg = await btn.evaluate((el) => getComputedStyle(el).backgroundColor);
    // Koyu temada basılı birincil düğme metni %100 birincil renktir (`--primary-text-hover`).
    const pressedText = await tokenColor(page, '--primary-text-hover');
    await page.keyboard.down('Space');
    try {
      await expect
        .poll(() => btn.evaluate((el) => getComputedStyle(el).backgroundColor), {
          message: 'klavyeyle basılı zemin değişir',
        })
        .not.toBe(restBg);
      await expect
        .poll(() => btn.evaluate((el) => getComputedStyle(el).color), {
          message: 'metin %100 olur',
        })
        .toBe(pressedText);
      expect(await measureContrast(btn), 'klavyeyle basılı').toBeGreaterThanOrEqual(4.5);
    } finally {
      await page.keyboard.up('Space');
    }
  });

  test('kart (panel zemini) içindeki birincil düğme en az 4.5:1', async ({ page }) => {
    const card = page.getByTestId('demo-card');
    await card.scrollIntoViewIfNeeded();
    const btn = page.getByTestId('btn-card-primary');
    const cardBg = await card.evaluate((el) => getComputedStyle(el).backgroundColor);
    const pageBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(cardBg, 'kart zemini sayfa zemininden farklı').not.toBe(pageBg);
    expect(await measureContrast(btn), 'normal').toBeGreaterThanOrEqual(4.5);
    await btn.hover();
    await expect
      .poll(() => measureContrast(btn), { message: 'üzerine gelme' })
      .toBeGreaterThanOrEqual(4.5);
    const box = (await btn.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await expect
      .poll(() => measureContrast(btn), { message: 'basılı' })
      .toBeGreaterThanOrEqual(4.5);
    await page.mouse.up();
  });

  test('pencere (yükseltilmiş zemin) içindeki birincil düğme en az 4.5:1', async ({ page }) => {
    await page.getByTestId('modal-open').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    const btn = page.getByTestId('btn-modal-primary');
    await expect(btn).toBeVisible();
    const modalBg = await dialog
      .locator('.ant-modal-content')
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    const pageBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(modalBg, 'pencere zemini sayfa zemininden farklı').not.toBe(pageBg);
    expect(await measureContrast(btn), 'normal').toBeGreaterThanOrEqual(4.5);
    await btn.hover();
    await expect
      .poll(() => measureContrast(btn), { message: 'üzerine gelme' })
      .toBeGreaterThanOrEqual(4.5);
    const box = (await btn.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await expect
      .poll(() => measureContrast(btn), { message: 'basılı' })
      .toBeGreaterThanOrEqual(4.5);
    await page.mouse.up();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .include('.ant-modal')
      .analyze();
    expect(results.violations.filter((v) => v.id === 'color-contrast')).toEqual([]);
  });
});

test.describe('yer tutucu ve açık seçim metni', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`${theme === 'dark' ? 'koyu' : 'açık'} tema: yer tutucu ve açık Select metni en az 4.5:1`, async ({
      page,
    }) => {
      await openDemo(page);
      if (theme === 'dark') {
        await page
          .getByRole('radiogroup', { name: 'Tema' })
          .getByText('Koyu', { exact: true })
          .click();
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
      }
      const contrast = (fg: string, bg: string) =>
        page.evaluate(
          ([f, b]) => {
            const parse = (c: string) => {
              const m = c.match(/[\d.]+/g) ?? [];
              return { r: +m[0]!, g: +m[1]!, b: +m[2]!, a: m[3] === undefined ? 1 : +m[3] };
            };
            const lum = (c: { r: number; g: number; b: number }) => {
              const ch = (v: number) => {
                const x = v / 255;
                return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
              };
              return 0.2126 * ch(c.r) + 0.7152 * ch(c.g) + 0.0722 * ch(c.b);
            };
            const B = parse(b);
            const F = parse(f);
            const blended = {
              r: F.a * F.r + (1 - F.a) * B.r,
              g: F.a * F.g + (1 - F.a) * B.g,
              b: F.a * F.b + (1 - F.a) * B.b,
            };
            const [l1, l2] = [lum(blended), lum(B)].sort((x, y) => y - x);
            return Math.round(((l1! + 0.05) / (l2! + 0.05)) * 100) / 100;
          },
          [fg, bg] as const,
        );
      // Giriş alanı yer tutucusu
      const input = page.getByTestId('input-md');
      const wrapper = page.locator('.ant-input-affix-wrapper').first();
      const placeholderColor = await input.evaluate(
        (el) => getComputedStyle(el, '::placeholder').color,
      );
      const inputBg = await wrapper.evaluate((el) => getComputedStyle(el).backgroundColor);
      expect(await contrast(placeholderColor, inputBg), 'yer tutucu').toBeGreaterThanOrEqual(4.5);
      // Select yer tutucusu
      const select = page.getByTestId('select-md');
      await select.evaluate((el) => el.scrollIntoView({ block: 'start' }));
      const selectorBg = await select
        .locator('.ant-select-selector')
        .evaluate((el) => getComputedStyle(el).backgroundColor);
      const phColor = await select
        .locator('.ant-select-selection-placeholder')
        .evaluate((el) => getComputedStyle(el).color);
      expect(await contrast(phColor, selectorBg), 'select yer tutucu').toBeGreaterThanOrEqual(4.5);
      // Fareyle açılmış Select'te seçili metin
      await select.click();
      await expect(page.locator('.ant-select-dropdown')).toBeVisible();
      await page.locator('.ant-select-item-option', { hasText: 'Orta' }).click();
      await expect(page.locator('.ant-select-dropdown')).toBeHidden();
      await select.click();
      await expect(page.locator('.ant-select-dropdown')).toBeVisible();
      const itemColor = await select
        .locator('.ant-select-selection-item')
        .evaluate((el) => getComputedStyle(el).color);
      expect(
        await contrast(itemColor, selectorBg),
        'açık Select seçili metin',
      ).toBeGreaterThanOrEqual(4.5);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2aa'])
        .include('.ant-select')
        .analyze();
      expect(results.violations.filter((v) => v.id === 'color-contrast')).toEqual([]);
    });
  }
});
