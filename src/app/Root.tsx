import { useEffect, useMemo, useState, type ReactNode } from 'react';

import { AuthGate, type PlatformSession } from '@/auth';
import type { ModuleEnvironment } from '@/modules';
import { createShellModuleEnvironment } from '@/shell/view-data/modules';

import { AppContent } from './App';
import { AppProviders } from './AppProviders';
import type { ThemeModeChoice } from './theme-mode';
import { createShellViewData, loadShellAccount } from './view-data';

export interface RootProps {
  session: PlatformSession;
  initialThemeChoice?: ThemeModeChoice;
  /** Testlerde motorları kapatmak için. Varsayılan açık. */
  engines?: boolean;
  /** Oturum açıkken çizilecek içerik. Varsayılan kabuktur. */
  children?: ReactNode;
  /**
   * Modül sayfalarının veri kipi. Sahte sunucu açıkken `example` verilir; sayfa "Örnek veri" yazar.
   * Örnek veri canlı veri gibi gösterilmez. Varsayılan `live` olur.
   */
  dataMode?: ModuleEnvironment['mode'];
}

/** Oturum açıkken kabuğun veri bağlantısını kurar: koleksiyon kaynağı ve modül ortamı. */
function SignedIn({
  session,
  user,
  dataMode,
}: {
  session: PlatformSession;
  user: string;
  dataMode: ModuleEnvironment['mode'];
}) {
  const [fullName, setFullName] = useState<string | undefined>(undefined);
  useEffect(() => {
    const ctrl = new AbortController();
    void loadShellAccount(session.api, user, ctrl.signal).then((account) => {
      if (!ctrl.signal.aborted) setFullName(account.fullName);
    });
    return () => ctrl.abort();
  }, [session, user]);
  // Veri bağlantısı yalnız oturum ya da kullanıcı değişince yeniden kurulur. Ad sonradan gelir.
  const base = useMemo(
    () => ({
      ...createShellViewData(session.api),
      modules: createShellModuleEnvironment({
        api: session.api,
        tenant: session.config.siteUrl,
        user,
        locale: 'tr',
        mode: dataMode,
      }),
    }),
    [session, user, dataMode],
  );
  const viewData = useMemo(
    () => ({
      ...base,
      account: { user, ...(fullName ? { fullName } : {}) },
      signOut: () => session.auth.signOut(),
    }),
    [base, user, fullName, session],
  );
  return <AppContent viewData={viewData} />;
}

/**
 * Uygulamanın en dış kökü.
 * Tema ve tasarım sağlayıcıları AuthGate'in dışındadır. Böylece giriş, bekleme ve hata
 * ekranları da açık ve koyu temanın tokenlarını kullanır.
 * Oturum açılınca kabuk, oturumdaki kullanıcıyla ve ortak API istemcisiyle bağlanır.
 */
export function Root({
  session,
  initialThemeChoice,
  engines = true,
  children,
  dataMode = 'live',
}: RootProps) {
  return (
    <AppProviders {...(initialThemeChoice ? { initialThemeChoice } : {})} engines={engines}>
      <AuthGate session={session}>
        {(user) => children ?? <SignedIn session={session} user={user} dataMode={dataMode} />}
      </AuthGate>
    </AppProviders>
  );
}
