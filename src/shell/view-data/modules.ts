import type { ApiClient } from '@/api';
import type { ModuleEnvironment } from '@/modules';
// İstemci doğrudan dosyasından gelir. `@/modules` girişi kayıt listesini de taşır.
// Giriş ekranı kayıt listesini indirmez (ilk yük bütçesi). Test: `src/modules/e2e/ilk-yuk.spec.ts`.
import { createModuleClient } from '@/modules/client';

import { createShellHomeData } from './home-client';
import { registerHomeData } from './home-data';

export interface ShellModuleEnvironmentInput extends Omit<ModuleEnvironment, 'client' | 'mode'> {
  /** Oturumdaki ortak API istemcisi (`createPlatformSession().api`). */
  api: ApiClient;
  /** Varsayılan `live` olur. Örnek veri için `example` verin. */
  mode?: ModuleEnvironment['mode'];
}

/**
 * Modül ortamını kurar. İstemci `createModuleClient` ile ortak API istemcisinden gelir.
 * `user` alanı Frappe kullanıcı kimliğidir. Bu değer açılış verisindeki `user.name` alanıdır.
 */
export function createShellModuleEnvironment({
  api,
  mode = 'live',
  ...rest
}: ShellModuleEnvironmentInput): ModuleEnvironment {
  const env: ModuleEnvironment = { ...rest, mode, client: createModuleClient(api) };
  // Ana sayfa (Bekleyenler) aynı istemciyi kullanır. Bkz. `home-data.ts`.
  registerHomeData(env, createShellHomeData(api));
  return env;
}
