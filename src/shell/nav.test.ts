import { describe, expect, it } from 'vitest';

import { moduleRegistrations } from '@/modules';

import {
  buildShellNav,
  navFromSidebars,
  permittedNav,
  quickActionsFrom,
  requiredDocTypes,
  routeNav,
} from './nav';
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
    const nav = buildShellNav([], new Set());
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

  it('aynı listeye giden ikinci bağlantıyı menüye koymaz (AJA-807)', () => {
    // Sunucu `User` listesini iki grupta verir: "Kurulum" ve "Kullanıcılar".
    const groups = navFromSidebars([
      {
        id: 'Kurulum',
        label: 'Kurulum',
        module: 'setup',
        links: [
          { label: 'Kullanıcılar', doctype: 'User' },
          { label: 'Sistem ayarları', doctype: 'System Settings' },
        ],
      },
      {
        id: 'Kullanıcılar',
        label: 'Kullanıcılar',
        module: 'users',
        links: [
          { label: 'Kullanıcı', doctype: 'User' },
          { label: 'Rol', doctype: 'Role' },
        ],
      },
    ]);
    const links = groups.flatMap((g) => g.children);
    const userLinks = links.filter((l) => l.requires?.includes('User'));
    expect(userLinks.map((l) => l.label)).toEqual(['Kullanıcılar']);
    // Başka grup ve bağlantı kaybolmaz.
    expect(labels(groups)).toEqual(['Kurulum', 'Kullanıcılar']);
    expect(links.map((l) => l.label)).toEqual(['Kullanıcılar', 'Sistem ayarları', 'Rol']);
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
      new Set(['T', ...requiredDocTypes]),
    );
    expect(nav.at(-1)?.label).toBe('Satış');
    expect(nav.slice(0, routeNav.length)).toEqual(routeNav);
  });
});

describe('menü yalnız yetkili sayfaları gösterir (G-94)', () => {
  const AI = ['PLT AI API', 'PLT AI Account', 'PLT AI Provider'];
  const linkLabels = (entries: NavEntry[]) =>
    entries.flatMap((e) => (e.kind === 'link' ? [e.label] : e.children.map((c) => c.label)));

  it('modüller okuma yetkisi gereken DocType adlarını bildirir', () => {
    const requires = (id: string) => moduleRegistrations.find((m) => m.id === id)?.requires;
    expect(requires('hr')).toEqual(['Leave Application']);
    expect(requires('ai-providers')).toEqual(AI);
    expect(requiredDocTypes).toEqual(expect.arrayContaining(['Leave Application', ...AI]));
    expect(new Set(requiredDocTypes).size).toBe(requiredDocTypes.length);
  });

  it('okuma yetkisi olmayan hesap "İzin talepleri" ve "Yapay zekâ sağlayıcıları" bağlantısını görmez', () => {
    const names = labels(buildShellNav([], new Set(['PLT AI API'])));
    expect(names).not.toContain('İzin talepleri');
    expect(names).not.toContain('Yapay zekâ sağlayıcıları');
    expect(names).toContain('Hesap');
    expect(names).toContain('Ana sayfa');
  });

  it('yetkisi olan hesap iki bağlantıyı görmeye devam eder', () => {
    const names = labels(buildShellNav([], new Set(['Leave Application', ...AI])));
    expect(names).toContain('İzin talepleri');
    expect(names).toContain('Yapay zekâ sağlayıcıları');
  });

  it('yetki bilgisi yoksa yetki isteyen sayfa menüde görünmez', () => {
    const names = labels(buildShellNav([], new Set()));
    for (const m of moduleRegistrations)
      if (m.requires?.length) expect(names).not.toContain(m.label.tr);
  });

  it('sunucu grubundaki bağlantılar da aynı süzgeçten geçer; boş kalan grup düşer', () => {
    const groups = navFromSidebars([
      {
        id: 'İK',
        label: 'İK',
        module: 'hr',
        links: [
          { label: 'İzinler', doctype: 'Leave Application' },
          { label: 'Çalışanlar', doctype: 'Employee' },
        ],
      },
      { id: 'Satış', label: 'Satış', module: 'selling', links: [{ label: 'T', doctype: 'T' }] },
    ]);
    const nav = permittedNav(groups, new Set(['Employee']));
    expect(linkLabels(nav)).toEqual(['Çalışanlar']);
    expect(nav.map((e) => e.label)).toEqual(['İK']);
  });

  it('hızlı eylemler süzülmüş gruplardan gelir', () => {
    const groups = navFromSidebars([
      {
        id: 'İK',
        label: 'İK',
        module: 'hr',
        links: [
          { label: 'İzinler', doctype: 'Leave Application' },
          { label: 'Çalışanlar', doctype: 'Employee' },
        ],
      },
    ]);
    const permitted = permittedNav(groups, new Set(['Employee']));
    const actions = quickActionsFrom(permitted.filter((e) => e.kind === 'group'));
    expect(actions.map((a) => a.label)).toEqual(['Çalışanlar']);
  });
});
