import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';

import { AppShell } from './AppShell';

/** Kabuk düzeni. Sayfa yüklenirken yalnız içerik alanı bekler. */
export function ShellLayout() {
  return (
    <AppShell>
      <Suspense fallback={<div className="shell-page" aria-busy="true" />}>
        <Outlet />
      </Suspense>
    </AppShell>
  );
}
