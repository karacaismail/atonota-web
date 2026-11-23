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
