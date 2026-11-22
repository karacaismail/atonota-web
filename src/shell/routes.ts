/**
 * Rota kaydı. Uygulamanın bütün sayfa rotaları buradadır.
 *
 * KURAL: Her iş kendi sayfası için bu dosyaya tek bir tembel satır ekler.
 * Satırın biçimi sabittir. Dört alan vardır, başka alan eklenmez:
 *
 *   {
 *     path: '/satis/:doctype',             // react-router yolu, "/" ile başlar
 *     label: 'Satış',                      // menü etiketi, Türkçe ve kısa
 *     icon: ShoppingCart,                  // Phosphor ikonu, ağırlık regular
 *     load: () => import('@/modules/...'), // tembel yükleyici
 *   },
 *
 * Kurallar:
 * - Yükleyici, varsayılan dışa aktarımı bileşen olan bir modül döndürür.
 * - Sayfa modülü bu dosyayı içe aktarmaz. Adresler `paths.ts` dosyasından gelir.
 * - Parametresiz yollar (":" içermeyen) sidebar menüsünde görünür.
 * - Yollar tekildir. `routes.test.ts` biçimi ve tekilliği denetler.
 * - Bu dosyanın sahibi `shell` işidir. Öteki işler yalnız kendi satırını ekler.
 */
import type { Icon } from '@phosphor-icons/react';
import { FileText, House, Robot, Rows, Sparkle } from '@phosphor-icons/react';
import type { ComponentType } from 'react';
import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

export interface RouteEntry {
  path: string;
  label: string;
  icon: Icon;
  load: () => Promise<{ default: ComponentType }>;
}

export const routeRegistry: RouteEntry[] = [
  { path: '/', label: 'Ana sayfa', icon: House, load: () => import('./pages/HomePage') },
  {
    path: '/asistan',
    label: 'Asistan',
    icon: Sparkle,
    load: () => import('./pages/AssistantPage'),
  },
  { path: '/ajanlar/:id', label: 'AI ajanı', icon: Robot, load: () => import('./pages/AgentPage') },
  {
    path: '/:module/:doctype',
    label: 'Kayıtlar',
    icon: Rows,
    load: () => import('./pages/CollectionRoute'),
  },
  {
    path: '/:module/:doctype/:name',
    label: 'Kayıt',
    icon: FileText,
    load: () => import('./pages/RecordPage'),
  },
];

/**
 * Kayıtları router kayıtlarına çevirir. Sayfa `React.lazy` ile tembel yüklenir.
 * Kabuk hemen çizilir. Sayfa yüklenirken yalnız içerik alanı bekler.
 * Router'ın kendi `lazy` alanı kullanılmaz: ilk açılışta kabuğu da bekletir.
 */
export function toRouteObjects(entries: RouteEntry[]): RouteObject[] {
  return entries.map((e) => ({ path: e.path, Component: lazy(e.load) }));
}

/** Menüde görünen kayıtlar: parametresiz yollar. */
export function menuEntries(entries: RouteEntry[]): RouteEntry[] {
  return entries.filter((e) => !e.path.includes(':'));
}
