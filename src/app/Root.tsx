import { useMemo, type ReactNode } from 'react';

import { AuthGate, type PlatformSession } from '@/auth';
import { createModuleClient, ModuleProvider } from '@/modules';

import { AppContent } from './App';
import { AppProviders } from './AppProviders';
import type { ThemeModeChoice } from './theme-mode';

export interface RootProps {
  session: PlatformSession;
  initialThemeChoice?: ThemeModeChoice;
  /** Testlerde motorları kapatmak için. Varsayılan açık. */
  engines?: boolean;
  /** Oturum açıkken çizilecek içerik. Varsayılan kabuktur. */
  children?: ReactNode;
}

/**
 * Uygulamanın en dış kökü.
 * Tema ve tasarım sağlayıcıları AuthGate'in dışındadır. Böylece giriş, bekleme ve hata
 * ekranları da açık ve koyu temanın tokenlarını kullanır.
 * Oturum açılınca modüller oturumdaki kullanıcıyla ve ortak API istemcisiyle bağlanır.
 */
export function Root({ session, initialThemeChoice, engines = true, children }: RootProps) {
  const client = useMemo(() => createModuleClient(session.api), [session]);
  return (
    <AppProviders {...(initialThemeChoice ? { initialThemeChoice } : {})} engines={engines}>
      <AuthGate session={session}>
        {(user) => (
          <ModuleProvider
            value={{ tenant: session.config.siteUrl, user, mode: 'live', locale: 'tr', client }}
          >
            {children ?? <AppContent />}
          </ModuleProvider>
        )}
      </AuthGate>
    </AppProviders>
  );
}
