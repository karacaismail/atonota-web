import { lazy, Suspense } from 'react';

import { AppProviders } from './AppProviders';
import { DEMO_PATH_PREFIX } from './demo-mode';

/**
 * Kabuk kendi parçasında tembel yüklenir. Böylece giriş ve bekleme ekranları (AuthGate) kabuğu
 * indirmeden açılır; kabuk yalnız oturum kurulunca iner.
 */
const ShellApp = lazy(() => import('@/shell').then((m) => ({ default: m.ShellApp })));

/**
 * Deneme sayfaları yalnız e2e derlemesinde pakete girer. Koşul derleme zamanında sabittir;
 * üretimde (`vite build`) bu dal ve dinamik içe aktarım koddan düşer.
 */
const DemoFoundationPage =
  import.meta.env.MODE === 'e2e' ? lazy(() => import('./FoundationPage')) : null;

function currentPath(): string {
  return typeof window === 'undefined' ? '/' : window.location.pathname;
}

/** Kabuk ya da deneme sayfası. Sağlayıcıları çağıran kurar (bkz. `Root`). */
export function AppContent() {
  const demo = DemoFoundationPage && currentPath() === `${DEMO_PATH_PREFIX}foundation`;
  return <Suspense fallback={null}>{demo ? <DemoFoundationPage /> : <ShellApp />}</Suspense>;
}

/** Uygulama kökü: sağlayıcılar içinde kabuk. */
export function App() {
  return (
    <AppProviders>
      <AppContent />
    </AppProviders>
  );
}
