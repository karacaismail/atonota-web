import { describe, expect, it } from 'vitest';

import { moduleRegistrations } from '@/modules';

import { buildShellNav, navFromSidebars, routeNav } from './nav';
import { routes } from './paths';
import type { NavEntry } from './sampleData';

const labels = (entries: NavEntry[]) => entries.map((e) => e.label);

describe('kabuk menüsü (Ö2)', () => {
  it('rota kaydındaki parametresiz sayfaları ve modül kayıtlarını gösterir', () => {
    const names = labels(routeNav);
    expect(names).toContain('Ana sayfa');
    expect(names).toContain('Asistan');
    for (const m of moduleRegistrations) expect(names).toContain(m.label.tr);
  });

  it('örnek menü gruplarını ve uydurma sayıları göstermez', () => {
    const nav = buildShellNav([]);
    expect(labels(nav)).not.toContain('Satış');
    expect(labels(nav)).not.toContain('Görevler');
    expect(nav.some((e) => e.badge !== undefined)).toBe(false);
    expect(nav.some((e) => e.kind === 'group')).toBe(false);
  });

  it('deneme sayfaları menüde görünmez', () => {
    expect(routeNav.some((e) => e.kind === 'link' && e.to.startsWith('/_demo/'))).toBe(false);
  });

  it('sunucunun sidebar verisini liste bağlantılı gruba çevirir', () => {
    const [group] = navFromSidebars([
      {
        id: 'Satış',
        label: 'Satış',
        module: 'selling',
        links: [{ label: 'Teklifler', doctype: 'Quotation' }],
      },
    ]);
    expect(group).toMatchObject({ kind: 'group', label: 'Satış' });
    expect(group?.kind === 'group' && group.children).toEqual([
      expect.objectContaining({
        kind: 'link',
        label: 'Teklifler',
        to: routes.collection('selling', 'Quotation'),
      }),
    ]);
    expect(group?.badge).toBeUndefined();
  });

  it('ayrılmış önekli ya da boş grubu menüye koymaz', () => {
    const groups = navFromSidebars([
      { id: 'a', label: 'A', module: '_demo', links: [{ label: 'X', doctype: 'X' }] },
      { id: 'b', label: 'B', module: 'panel', links: [{ label: 'Y', doctype: 'Y' }] },
      { id: 'c', label: 'C', module: 'c', links: [] },
    ]);
    expect(groups).toEqual([]);
  });

  it('gruplar rota bağlantılarından sonra gelir', () => {
    const nav = buildShellNav(
      navFromSidebars([
        { id: 's', label: 'Satış', module: 'selling', links: [{ label: 'T', doctype: 'T' }] },
      ]),
    );
    expect(nav.at(-1)?.label).toBe('Satış');
    expect(nav.slice(0, routeNav.length)).toEqual(routeNav);
  });
});
