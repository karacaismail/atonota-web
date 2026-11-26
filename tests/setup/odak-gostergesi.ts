/**
 * Odak göstergesi denetimleri. Tarayıcı testleri ortak kullanır.
 * Kural: çevreleyen odak halkası yasaktır. Gösterge alt kenarda tek bir çizgidir.
 */

/** Hesaplanmış box-shadow listesini parçalara ayırır. */
export function splitShadows(value: string): string[] {
  if (!value || value === 'none') return [];
  return value.split(/,(?![^(]*\))/).map((s) => s.trim());
}

/** Gölge parçasının renk dışındaki px değerleri: x, y, bulanıklık, yayılma. */
function shadowLengths(shadow: string): number[] {
  const nums = shadow.replace(/rgba?\([^)]*\)/, '').match(/-?\d+(?:\.\d+)?px/g) ?? [];
  return nums.map((n) => parseFloat(n));
}

/** Tek kenarlı gösterge: iç gölge, x 0, y negatif, bulanıklık 0, yayılma 0, verilen renk. */
export function isBottomBarOnly(shadow: string, color: string): boolean {
  if (!shadow.includes(color) || !shadow.includes('inset')) return false;
  const [x, y, blur, spread] = shadowLengths(shadow);
  return x === 0 && (y ?? 0) < 0 && (blur ?? 0) === 0 && (spread ?? 0) === 0;
}

/**
 * Gölge parçası çevreleyen halka mı? Yayılması sıfırdan büyük ya da hem x hem y sıfırken
 * bulanıklığı olan parça öğenin dört kenarını sarar. Örnek: `0 0 0 2px` ve `0 0 4px`.
 */
export function isRingShadow(shadow: string): boolean {
  const [x = 0, y = 0, blur = 0, spread = 0] = shadowLengths(shadow);
  return spread > 0 || (x === 0 && y === 0 && blur > 0);
}

/** `page.evaluate` için en küçük sayfa arayüzü; Playwright tipine bağımlılık eklemez. */
interface EvaluatingPage {
  evaluate<R, A>(fn: (arg: A) => R, arg: A): Promise<R>;
}

/**
 * CSS renk tokenının sayfadaki hesaplanmış değerini `rgb(...)` olarak verir.
 * Testler renk yazmaz, tokendan okur. Örnek: `await tokenColor(page, '--focus-indicator-color')`.
 * Değer o anki temaya göredir (`html[data-theme]`).
 */
export function tokenColor(page: EvaluatingPage, name: string): Promise<string> {
  return page.evaluate((token: string) => {
    // Token sayfada henüz yoksa sessizce siyah dönmesin: test açık bir hatayla düşer.
    if (!getComputedStyle(document.documentElement).getPropertyValue(token).trim()) {
      throw new Error(`CSS tokenı sayfada yok: ${token}`);
    }
    const probe = document.createElement('span');
    probe.style.color = `var(${token})`;
    document.body.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  }, name);
}
