import type { ComponentType } from 'react';
export interface ModuleRegistration {
  id: string;
  path: string;
  label: { en: string; tr: string };
  /** The shell only calls load after navigation. Importing this registry loads no screen. */
  load: () => Promise<{ default: ComponentType }>;
}
export const moduleRegistrations: readonly ModuleRegistration[] = [
  {
    id: 'account',
    path: '/account',
    label: { en: 'Account', tr: 'Hesap' },
    load: () => import('./account/Page'),
  },
  {
    id: 'administration',
    path: '/administration',
    label: { en: 'Administration', tr: 'Yönetim' },
    load: () => import('./administration/Page'),
  },
  {
    // Yönetim bölümünün alt sayfası. Kod yalnız bu sayfa açılınca iner.
    id: 'ai-providers',
    path: '/administration/ai-providers',
    label: { en: 'AI providers', tr: 'Yapay zekâ sağlayıcıları' },
    load: () => import('./ai-providers/Page'),
  },
  {
    id: 'hr',
    path: '/hr',
    label: { en: 'Leave requests', tr: 'İzin talepleri' },
    load: () => import('./hr/Page'),
  },
  {
    id: 'site-plan',
    path: '/site-plan',
    label: { en: 'Site and plan', tr: 'Site ve plan' },
    load: () => import('./site-plan/Page'),
  },
  {
    id: 'ai-operations',
    path: '/ai-operations',
    label: { en: 'AI operations', tr: 'Yapay zekâ işlemleri' },
    load: () => import('./ai-operations/Page'),
  },
];

/** G-168: kiracı yöneticisi yardımcısının Frappe rolü. Rolü kiracı yöneticisi verir. */
export const TENANT_ADMIN_ASSISTANT_ROLE = 'Tenant Admin Assistant';

/** Bu rollerden biri varsa süzgeç uygulanmaz. Kişi bütün grupları görür. */
const ELEVATED_ROLES: readonly string[] = ['Tenant Admin', 'System Manager'];

/**
 * Bir modülün kişiye açık kısmı.
 * `full`: bütün sayfa. `read`: sayfa yalnız okunur. `sections`: yalnız adı geçen bölümler.
 */
export type ModuleAccess =
  { kind: 'full' } | { kind: 'read' } | { kind: 'sections'; sections: readonly string[] };

const FULL: ModuleAccess = { kind: 'full' };

/**
 * G-168 listesi. Listede olmayan modül yardımcıya görünmez.
 * Bu süzgeç yalnız menüyü ve ekranı düzenler. Yetkiyi sunucu denetler.
 */
const assistantAccess: Readonly<Record<string, ModuleAccess>> = {
  account: FULL,
  administration: { kind: 'sections', sections: ['users'] },
  hr: FULL,
  'site-plan': { kind: 'read' },
  'ai-operations': FULL,
};

function isAssistantOnly(roles: readonly string[]): boolean {
  return (
    roles.includes(TENANT_ADMIN_ASSISTANT_ROLE) && !roles.some((r) => ELEVATED_ROLES.includes(r))
  );
}

/**
 * Modülün kişiye açık kısmını verir. Modül görünmezse `null` döner.
 * Rol bilgisi yoksa süzgeç uygulanmaz. Sunucu yine her isteği denetler.
 */
export function moduleAccess(id: string, roles?: readonly string[]): ModuleAccess | null {
  if (!roles || !isAssistantOnly(roles)) return FULL;
  return assistantAccess[id] ?? null;
}

/** Kişinin menüde göreceği modüller. Sıra kayıt sırasıdır. */
export function visibleModules(roles?: readonly string[]): readonly ModuleRegistration[] {
  return moduleRegistrations.filter((m) => moduleAccess(m.id, roles) !== null);
}
