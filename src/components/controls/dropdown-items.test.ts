import { describe, expect, it } from 'vitest';

import { localeBundle } from '@/app/locale';

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
    const tr = localeBundle('tr').intl;
    const result = groupDropdownItems([copy, open, remove], '  İÇERİĞİ  ', true, tr);
    expect([...result.regular.values()]).toEqual([[copy]]);
    expect(result.danger).toEqual([remove]);
    expect(groupDropdownItems([copy], 'yok', true, tr).regular.size).toBe(0);
  });

  it('harf karşılaştırması verilen dille yapılır', () => {
    const item = { key: 'irmak', label: 'Irmak' };
    expect(groupDropdownItems([item], 'ırmak', true, localeBundle('tr').intl).regular.size).toBe(1);
    expect(groupDropdownItems([item], 'irmak', true, localeBundle('en').intl).regular.size).toBe(1);
  });
});
