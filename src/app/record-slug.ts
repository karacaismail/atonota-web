import { doctypeFromSlug } from './view-data';

// Yalnız kayıt rotası kullanır; kayıt parçasıyla tembel iner.

/**
 * DocType adını adres parçasına çevirir. Örnek: `Örnek Kayıt` -> `örnek-kayıt`.
 * Parça aynı ada geri çevrilemiyorsa `undefined` döner; o zaman bağlantı çizilmez.
 */
export function slugFromDoctype(doctype: string): string | undefined {
  const slug = doctype.trim().toLocaleLowerCase('en').split(/\s+/).filter(Boolean).join('-');
  return slug !== '' && doctypeFromSlug(slug) === doctype ? slug : undefined;
}
