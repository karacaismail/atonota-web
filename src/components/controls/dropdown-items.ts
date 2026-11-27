import type { DropdownItem } from './Dropdown';

/**
 * Arama metnine uyan öğeleri gruplar. Harf karşılaştırması kullanıcının diliyle yapılır (IC-13).
 * Örnek: Türkçede "IRMAK" araması "ırmak" ile eşleşir.
 */
export function groupDropdownItems(
  items: readonly DropdownItem[],
  query: string,
  grouped = true,
  locale?: string,
) {
  const search = query.trim().toLocaleLowerCase(locale);
  const regular = new Map<string | undefined, DropdownItem[]>();
  const danger: DropdownItem[] = [];

  for (const item of items) {
    if (!item.label.toLocaleLowerCase(locale).includes(search)) continue;
    if (item.danger) {
      danger.push(item);
    } else {
      const key = grouped ? item.group : undefined;
      const group = regular.get(key) ?? [];
      group.push(item);
      regular.set(key, group);
    }
  }

  return { regular, danger };
}
