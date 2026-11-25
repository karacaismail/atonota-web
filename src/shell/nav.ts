/**
 * Sidebar menüsü. Menü yalnız açılabilen sayfaları gösterir.
 *
 * 1. Rota kaydındaki parametresiz sayfalar gelir. Modül kayıtları da bu listededir.
 * 2. Sonra sunucunun açılış verisindeki sidebar grupları gelir. Gruplar liste sayfalarına gider.
 * 3. Bütün bağlantılar `permittedNav` süzgecinden geçer (G-94). Okunamayan sayfa menüde görünmez.
 *
 * Örnek gruplar (`sampleNav`) yalnız deneme sayfasında görünür. Canlı menüde uydurma sayı yoktur.
 */
import { FileText, Rows } from '@phosphor-icons/react';

import { moduleRegistrations } from '@/modules';

import { routes } from './paths';
import { isReservedSegment, menuEntries, routeRegistry } from './routes';
import type { NavEntry, NavGroup, NavLeaf } from './sampleData';
import type { ShellSidebar } from './view-data';

/** Rota kaydındaki menü bağlantıları. Deneme sayfalarını `menuEntries` çıkarır. */
/** Modül yolu ve okuma yetkisi gereken DocType adları. Kaynak: `src/modules/registry.ts`. */
const moduleRules = new Map(
  moduleRegistrations.map((m) => [
    m.path,
    { requires: m.requires ?? [], excludes: m.excludes ?? [] },
  ]),
);

/** Menünün sunucuya sorduğu bütün DocType adları: `requires` ve `excludes`. Her ad bir kez geçer. */
export const requiredDocTypes: readonly string[] = [
  ...new Set(moduleRegistrations.flatMap((m) => [...(m.requires ?? []), ...(m.excludes ?? [])])),
];

export const routeNav: NavEntry[] = menuEntries(routeRegistry).map((r): NavEntry => {
  const { requires = [], excludes = [] } = moduleRules.get(r.path) ?? {};
  return {
    kind: 'link',
    id: `route-${r.path}`,
    label: r.label,
    to: r.path,
    icon: r.icon,
    ...(requires.length > 0 ? { requires } : {}),
    ...(excludes.length > 0 ? { excludes } : {}),
  };
});

/** Bağlantı kuralı: istenen türlerin hepsi okunur, dışlayan türlerin hiçbiri okunmaz. */
function leafAllowed(
  rule: { requires?: readonly string[]; excludes?: readonly string[] },
  readable: ReadonlySet<string>,
): boolean {
  return (
    (rule.requires ?? []).every((d) => readable.has(d)) &&
    !(rule.excludes ?? []).some((d) => readable.has(d))
  );
}

/**
 * Sayfa kapısı (G-94, G-169). Modül sayfası menüyle aynı kuralla açılır.
 * Modül olmayan yol bu kapıdan geçer. Örnek: bayi hesabı `/administration` sayfasını açamaz.
 */
export function moduleAllowed(path: string, readable: ReadonlySet<string>): boolean {
  const rule = moduleRules.get(path);
  return !rule || leafAllowed(rule, readable);
}

/**
 * Menünün yetki süzgeci (G-94). Bağlantı yalnız istediği bütün DocType'lar okunabilirse kalır.
 * Dışlayan türlerden biri okunabilirse bağlantı düşer (G-169). Örnek: bayi kiracı sayfalarını görmez.
 * Bağlantısı kalmayan grup düşer. Yetki istemeyen bağlantı her zaman kalır.
 * Örnek: `readable` içinde `Leave Application` yoksa "İzin talepleri" görünmez.
 */
export function permittedNav(
  entries: readonly NavEntry[],
  readable: ReadonlySet<string>,
): NavEntry[] {
  const allowed = (l: NavLeaf) => leafAllowed(l, readable);
  return entries.flatMap((e): NavEntry[] => {
    if (e.kind === 'link') return allowed(e) ? [e] : [];
    const children = e.children.filter(allowed);
    return children.length > 0 ? [{ ...e, children }] : [];
  });
}

/**
 * Sunucunun sidebar verisini menü grubuna çevirir.
 * Ayrılmış önekli (`_demo`, `panel`) ya da bağlantısız grup menüye girmez.
 * Her DocType listesi menüde bir kez görünür. İlk bağlantı kalır, sonrakiler düşer (AJA-807).
 * Örnek: `User` hem "Kurulum" hem "Kullanıcılar" grubundaysa yalnız "Kurulum" grubunda kalır.
 */
export function navFromSidebars(sidebars: readonly ShellSidebar[]): NavGroup[] {
  const seen = new Set<string>();
  return sidebars
    .filter((g) => !isReservedSegment(g.module))
    .map((g): NavGroup => ({
      kind: 'group',
      id: `sidebar-${g.id}`,
      label: g.label,
      icon: Rows,
      children: g.links.flatMap((l) => {
        if (seen.has(l.doctype)) return [];
        seen.add(l.doctype);
        return [
          {
            kind: 'link',
            id: `sidebar-${g.id}-${l.doctype}`,
            label: l.label,
            to: routes.collection(g.module, l.doctype),
            icon: FileText,
            requires: [l.doctype],
          },
        ];
      }),
    }))
    .filter((g) => g.children.length > 0);
}

/** Canlı menü: rota bağlantıları ve sunucu grupları. İkisi de yetki süzgecinden geçer. */
export function buildShellNav(
  groups: readonly NavGroup[],
  readable: ReadonlySet<string>,
): NavEntry[] {
  return permittedNav([...routeNav, ...groups], readable);
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
 * Kabuk grupları önce `permittedNav` süzgecinden geçirir. Menü ve hızlı eylemler aynı süzgeci kullanır.
 * Böylece kullanıcının açamadığı sayfa hızlı eylem olmaz. Veri yoksa liste boştur.
 */
export function quickActionsFrom(groups: readonly NavGroup[], limit = QUICK_ACTION_LIMIT) {
  return groups
    .flatMap((g) => g.children)
    .slice(0, limit)
    .map((l): QuickAction => ({ key: l.id, label: l.label, to: l.to }));
}
