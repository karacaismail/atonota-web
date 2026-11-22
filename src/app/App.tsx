import { lazy, Suspense } from 'react';

import { ShellApp } from '@/shell';

import { AppProviders } from './AppProviders';
import { DEMO_PATH_PREFIX } from './demo-mode';

/**
 * Deneme sayfaları yalnız e2e derlemesinde pakete girer. Koşul derleme zamanında sabittir;
 * üretimde (`vite build`) bu dal ve dinamik içe aktarım koddan düşer.
 */
const DemoFoundationPage =
  import.meta.env.MODE === 'e2e' ? lazy(() => import('./FoundationPage')) : null;

function currentPath(): string {
  return typeof window === 'undefined' ? '/' : window.location.pathname;
}

/** Uygulama kökü: sağlayıcılar içinde kabuk. */
export function App() {
  const demo = DemoFoundationPage && currentPath() === `${DEMO_PATH_PREFIX}foundation`;
  return (
    <AppProviders>
      {demo ? (
        <Suspense fallback={null}>
          <DemoFoundationPage />
        </Suspense>
      ) : (
        <ShellApp />
      )}
    </AppProviders>
  );
}
