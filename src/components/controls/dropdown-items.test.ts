import { describe, expect, it } from 'vitest';

import { groupDropdownItems } from './dropdown-items';

describe('groupDropdownItems', () => {
  const copy = { key: 'copy', label: 'İçeriği kopyala', group: 'İçerik' };
  const move = { key: 'move', label: 'İçeriği taşı', group: 'İçerik', disabled: true };
  const remove = { key: 'remove', label: 'İçeriği sil', group: 'İçerik', danger: true };
  const open = { key: 'open', label: 'Aç' };

  it('preserves group order and keeps dangerous actions separate', () => {
    const result = groupDropdownItems([copy, remove, open, move], '');
    expect([...result.regular]).toEqual([
      ['İçerik', [copy, move]],
      [undefined, [open]],
    ]);
    expect(result.danger).toEqual([remove]);
  });

  it('trims searches and folds Turkish casing', () => {
    const result = groupDropdownItems([copy, open, remove], '  İÇERİĞİ  ');
    expect([...result.regular.values()]).toEqual([[copy]]);
    expect(result.danger).toEqual([remove]);
    expect(groupDropdownItems([copy], 'yok').regular.size).toBe(0);
  });
});
