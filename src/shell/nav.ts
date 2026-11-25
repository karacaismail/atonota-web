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
import { moduleRegistrations, visibleModules } from '@/modules/registry';

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

/**
 * Canlı menü: rota bağlantıları ve sunucu grupları.
 * `roles` verilirse kişiye kapalı modül bağlantısı menüye girmez (G-168).
 * Bu süzgeç yalnız menüyü düzenler. Yetkiyi sunucu denetler.
 */
export function buildShellNav(groups: readonly NavGroup[], roles?: readonly string[]): NavEntry[] {
  const visible = new Set(visibleModules(roles).map((m) => m.path));
  const hidden = new Set(moduleRegistrations.map((m) => m.path).filter((p) => !visible.has(p)));
  const links = hidden.size
    ? routeNav.filter((e) => !(e.kind === 'link' && hidden.has(e.to)))
    : routeNav;
  return [...links, ...groups];
}

/** Hızlı eylem. `to` varsa sayfaya gider. `prompt` varsa isteği asistana gönderir. */
export interface QuickAction {
  key: string;
  label: string;
  to?: string;
  prompt?: string;
}

/** Komut alanının altında en çok bu kadar hızlı eylem görünür. */
export const QUICK_ACTION_LIMIT = 3;

/**
 * Hızlı eylemler sunucunun sidebar gruplarından gelir.
 * Gruplar Frappe'nin izin süzgecinden geçmiştir. Liste rotası bu sayfaları açar.
 * Böylece kullanıcının açamadığı sayfa hızlı eylem olmaz. Veri yoksa liste boştur.
 */
export function quickActionsFrom(groups: readonly NavGroup[], limit = QUICK_ACTION_LIMIT) {
  return groups
    .flatMap((g) => g.children)
    .slice(0, limit)
    .map((l): QuickAction => ({ key: l.id, label: l.label, to: l.to }));
}
