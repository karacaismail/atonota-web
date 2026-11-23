/**
 * Menü öğesinin etkin olup olmadığını bulur.
 * Yol parça parça karşılaştırılır. Önek eşleşmesi etkin sayılmaz.
 * Örnek: "/satis/teklif" öğesi "/satis/teklifler" adresinde etkin değildir.
 */
export function isPathActive(to: string, pathname: string): boolean {
  const target = (to.split('?')[0] ?? to).split('/').filter(Boolean);
  const current = pathname.split('/').filter(Boolean);
  if (target.length === 0) return current.length === 0;
  if (current.length < target.length) return false;
  return target.every((seg, i) => decodeURIComponent(current[i] ?? '') === decodeURIComponent(seg));
}
