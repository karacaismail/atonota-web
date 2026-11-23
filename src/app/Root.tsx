import { lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from 'react';

import { AuthGate, type PlatformSession } from '@/auth';
import { isPublicPath } from '@/auth/product/path';
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
  /**
   * Açılan adresin yolu. Varsayılan `window.location.pathname` olur.
   * Oturum istemeyen sayfalar (örnek: `/atonota-login`) AuthGate'e girmez.
   */
  pathname?: string;
}

/** Tanıtım sayfası ayrı parçadır. Parça yalnız bu adreste yüklenir. */
const ProductPage = lazy(() => import('@/auth/product/ProductPage'));

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
  pathname = typeof window === 'undefined' ? '/' : window.location.pathname,
}: RootProps) {
  if (isPublicPath(pathname)) {
    // Tanıtım sayfası oturum sormaz (G-165). Tema ve tasarım sağlayıcıları yine kurulur.
    return (
      <AppProviders {...(initialThemeChoice ? { initialThemeChoice } : {})} engines={engines}>
        <Suspense fallback={null}>
          <ProductPage />
        </Suspense>
      </AppProviders>
    );
  }
  return (
    <AppProviders {...(initialThemeChoice ? { initialThemeChoice } : {})} engines={engines}>
      <AuthGate session={session}>
        {(user) => children ?? <SignedIn session={session} user={user} dataMode={dataMode} />}
      </AuthGate>
    </AppProviders>
  );
}
