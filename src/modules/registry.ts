import type { ComponentType } from 'react';
export interface ModuleRegistration {
  id: string;
  path: string;
  label: { en: string; tr: string };
  /**
   * Sayfanın okuduğu DocType adları. Menü bu sayfayı yalnız hepsi okunabilirse gösterir (G-94).
   * Okuma yetkisini sunucu bildirir. Kodda rol adı yoktur.
   * Örnek: "İzin talepleri" sayfası `Leave Application` kayıtlarını okur.
   */
  requires?: readonly string[];
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
    // Sayfa bu üç türün listesini okur (`src/api/provider-client.ts`, `AI_DOCTYPES`).
    requires: ['PLT AI API', 'PLT AI Account', 'PLT AI Provider'],
    load: () => import('./ai-providers/Page'),
  },
  {
    id: 'hr',
    path: '/hr',
    label: { en: 'Leave requests', tr: 'İzin talepleri' },
    requires: ['Leave Application'],
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
