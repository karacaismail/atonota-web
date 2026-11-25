import type { ComponentType } from 'react';
import { useMemo } from 'react';

import { ModuleProvider } from '@/modules';

import { t } from '../messages';
import { useViewData } from '../view-data';

/**
 * Modül sayfasını `ModuleProvider` içinde açar.
 * Ortamı uygulama girişi `viewData.modules` alanıyla verir.
 * Ortam yoksa sayfa açılmaz. Sayfa bunun yerine durum yazar.
 */
export function ModuleBoundary({ page: Page }: { page: ComponentType }) {
  const viewData = useViewData();
  const base = viewData?.modules;
  const roles = viewData?.account?.roles;
  // G-168: ekran süzgeci için rolleri ortama ekler. Yetkiyi sunucu denetler.
  const env = useMemo(() => (base && roles ? { ...base, roles } : base), [base, roles]);
  if (!env) {
    return (
      <div className="shell-page">
        <div className="shell-body">
          <p role="status">{t.pages.noModuleEnvironment}</p>
        </div>
      </div>
    );
  }
  return (
    <ModuleProvider value={env}>
      <Page />
    </ModuleProvider>
  );
}
