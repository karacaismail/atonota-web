import type { ApiClient } from '@/api';
import type { ModuleEnvironment } from '@/modules';
import { createModuleClient } from '@/modules';

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
  return { ...rest, mode, client: createModuleClient(api) };
}
