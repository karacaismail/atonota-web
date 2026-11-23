/**
 * Sidebar menüsü. Menü yalnız açılabilen sayfaları gösterir.
 *
 * 1. Rota kaydındaki parametresiz sayfalar gelir. Modül kayıtları da bu listededir.
 * 2. Sonra sunucunun açılış verisindeki sidebar grupları gelir. Gruplar liste sayfalarına gider.
 *
 * Örnek gruplar (`sampleNav`) yalnız deneme sayfasında görünür. Canlı menüde uydurma sayı yoktur.
 */
import { FileText, Rows } from '@phosphor-icons/react';

import { routes } from './paths';
import { isReservedSegment, menuEntries, routeRegistry } from './routes';
import type { NavEntry, NavGroup } from './sampleData';
import type { ShellSidebar } from './view-data';

/** Rota kaydındaki menü bağlantıları. Deneme sayfalarını `menuEntries` çıkarır. */
export const routeNav: NavEntry[] = menuEntries(routeRegistry).map((r): NavEntry => ({
  kind: 'link',
  id: `route-${r.path}`,
  label: r.label,
  to: r.path,
  icon: r.icon,
}));

/**
 * Sunucunun sidebar verisini menü grubuna çevirir.
 * Ayrılmış önekli (`_demo`, `panel`) ya da bağlantısız grup menüye girmez.
 */
export function navFromSidebars(sidebars: readonly ShellSidebar[]): NavGroup[] {
  return sidebars
    .filter((g) => g.links.length > 0 && !isReservedSegment(g.module))
    .map((g) => ({
      kind: 'group',
      id: `sidebar-${g.id}`,
      label: g.label,
      icon: Rows,
      children: g.links.map((l) => ({
        kind: 'link',
        id: `sidebar-${g.id}-${l.doctype}`,
        label: l.label,
        to: routes.collection(g.module, l.doctype),
        icon: FileText,
      })),
    }));
}

/** Canlı menü: rota bağlantıları ve sunucu grupları. */
export function buildShellNav(groups: readonly NavGroup[]): NavEntry[] {
  return [...routeNav, ...groups];
}
