/**
 * Sidebar menüsü. Önce rota kaydındaki parametresiz sayfalar gelir.
 * Sonra modül grupları gelir.
 */
import { menuEntries, routeRegistry } from './routes';
import type { NavEntry } from './sampleData';
import { sampleNav } from './sampleData';

export const shellNav: NavEntry[] = [
  ...menuEntries(routeRegistry).map((r): NavEntry => ({
    kind: 'link',
    id: `route-${r.path}`,
    label: r.label,
    to: r.path,
    icon: r.icon,
  })),
  ...sampleNav,
];
