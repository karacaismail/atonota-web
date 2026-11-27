import type { DropdownItem } from './Dropdown';

/**
 * Groups the items that match the search text. Letters are compared in the user's language (IC-13).
 * Example: in Turkish, the search "IRMAK" matches "irmak" spelt with a dotless i (U+0131).
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
