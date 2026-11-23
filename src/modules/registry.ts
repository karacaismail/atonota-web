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
