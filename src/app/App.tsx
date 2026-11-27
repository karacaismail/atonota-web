import { lazy, Suspense } from 'react';

import type { ShellViewData } from '@/shell/view-data';

import { AppProviders } from './AppProviders';
import { appPathname } from './base-path';
import { DEMO_PATH_PREFIX } from './demo-mode';

/**
 * The shell is lazy-loaded in its own chunk. The login and waiting screens (AuthGate) therefore
 * open without downloading the shell; the shell is fetched only once the session is set up.
 */
const ShellApp = lazy(() => import('@/shell').then((m) => ({ default: m.ShellApp })));

/**
 * Demo pages enter the bundle only in the e2e build. The condition is constant at build time;
 * in production (`vite build`) this branch and the dynamic import are dropped from the code.
 */
const DemoFoundationPage =
  import.meta.env.MODE === 'e2e' ? lazy(() => import('./FoundationPage')) : null;
const DemoLocalePage =
  import.meta.env.MODE === 'e2e' ? lazy(() => import('./LocaleDemoPage')) : null;

function currentPath(): string {
  return typeof window === 'undefined' ? '/' : appPathname(window.location.pathname);
}

/** The shell or a demo page. The caller sets up the providers (see `Root`). */
export function AppContent({ viewData = null }: { viewData?: ShellViewData | null }) {
  const path = currentPath();
  const foundation = DemoFoundationPage && path === `${DEMO_PATH_PREFIX}foundation`;
  const locale = DemoLocalePage && path === `${DEMO_PATH_PREFIX}locale`;
  return (
    <Suspense fallback={null}>
      {foundation ? (
        <DemoFoundationPage />
      ) : locale ? (
        <DemoLocalePage />
      ) : (
        <ShellApp viewData={viewData} />
      )}
    </Suspense>
  );
}

/** Application root: the shell inside the providers. */
export function App() {
  return (
    <AppProviders>
      <AppContent />
    </AppProviders>
  );
}
