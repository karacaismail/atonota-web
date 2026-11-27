import type { ComponentType } from 'react';
export interface ModuleRegistration {
  id: string;
  path: string;
  label: { en: string; tr: string };
  /**
   * DocType names the page reads. The menu shows the page only if all are readable (G-94).
   * The server reports read permission. The code holds no role names.
   * Example: the "Leave requests" page reads `Leave Application` records.
   */
  requires?: readonly string[];
  /**
   * If any of these DocType names is readable, the page is hidden from the menu (G-169, G-170).
   * Example: a reseller account can read `Reseller Customer Link`. It sees no tenant pages.
   * The server decides via the reseller customer list endpoint (AJA-945). No role names in code.
   */
  excludes?: readonly string[];
  /** The shell only calls load after navigation. Importing this registry loads no screen. */
  load: () => Promise<{ default: ComponentType }>;
}
/**
 * The record type that links a reseller to a customer tenant (G-169).
 * In the menu it marks a reseller account.
 * The shell does not ask the meta endpoint about this type.
 * That endpoint returns 403 for it even to resellers (AJA-945).
 * If the reseller customer list endpoint returns 200, the shell counts this name as readable.
 * Tenant pages are then hidden from the reseller.
 */
export const RESELLER_LINK_DOCTYPE = 'Reseller Customer Link';
/** Tenant pages are hidden for a reseller account. */
const TENANT_ONLY = [RESELLER_LINK_DOCTYPE] as const;

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
    excludes: TENANT_ONLY,
    load: () => import('./administration/Page'),
  },
  {
    // A subpage of the administration section. Its code downloads only when this page opens.
    id: 'ai-providers',
    path: '/administration/ai-providers',
    label: { en: 'AI providers', tr: 'Yapay zekâ sağlayıcıları' },
    // The page reads lists of these three types (`src/api/provider-client.ts`, `AI_DOCTYPES`).
    requires: ['PLT AI API', 'PLT AI Account', 'PLT AI Provider'],
    excludes: TENANT_ONLY,
    load: () => import('./ai-providers/Page'),
  },
  {
    id: 'hr',
    path: '/hr',
    label: { en: 'Leave requests', tr: 'İzin talepleri' },
    requires: ['Leave Application'],
    excludes: TENANT_ONLY,
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
    excludes: TENANT_ONLY,
    load: () => import('./ai-operations/Page'),
  },
  {
    // The reseller's linked customers (G-169, G-170). A tenant account cannot read the link record.
    id: 'customers',
    path: '/customers',
    label: { en: 'Customers', tr: 'Müşteriler' },
    requires: [RESELLER_LINK_DOCTYPE],
    load: () => import('./customers/Page'),
  },
];
