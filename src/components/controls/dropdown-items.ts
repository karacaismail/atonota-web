import type { DropdownItem } from './Dropdown';

export function groupDropdownItems(items: readonly DropdownItem[], query: string, grouped = true) {
  const search = query.trim().toLocaleLowerCase('tr');
  const regular = new Map<string | undefined, DropdownItem[]>();
  const danger: DropdownItem[] = [];

  for (const item of items) {
    if (!item.label.toLocaleLowerCase('tr').includes(search)) continue;
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
