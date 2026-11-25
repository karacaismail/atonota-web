import type { ComponentType } from 'react';

import { ModuleProvider } from '@/modules';

import { useShellAccess } from '../access';
import { t } from '../messages';
import { moduleAllowed } from '../nav';
import { useViewData } from '../view-data';

function Note({ text }: { text: string }) {
  return (
    <div className="shell-page">
      <div className="shell-body">
        <p role="status">{text}</p>
      </div>
    </div>
  );
}

/**
 * Modül sayfasını `ModuleProvider` içinde açar.
 * Ortamı uygulama girişi `viewData.modules` alanıyla verir.
 * Ortam yoksa sayfa açılmaz. Sayfa bunun yerine durum yazar.
 * Sayfa menüyle aynı yetki kapısından geçer (G-94, G-169). Kapı kapalıysa yetki notu görünür.
 * Kapı yalnız ekranı düzenler. Yetkiyi sunucu her istekte yine denetler.
 */
export function ModuleBoundary({ page: Page, path }: { page: ComponentType; path?: string }) {
  const env = useViewData()?.modules;
  const access = useShellAccess();
  if (!env) return <Note text={t.pages.noModuleEnvironment} />;
  if (access && !access.ready) return <Note text={t.pages.checkingAccess} />;
  if (access && path !== undefined && !moduleAllowed(path, access.readable))
    return <Note text={t.pages.denied} />;
  return (
    <ModuleProvider value={env}>
      <Page />
    </ModuleProvider>
  );
}
