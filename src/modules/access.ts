/**
 * Sayfa içindeki yazma denetimleri (G-168, G-169, G-170).
 * Menü ve sayfa kapısı rol adı kullanmaz. Onlar sunucunun okuma yetkisine bakar (`src/shell/nav.ts`).
 * Yazma düğmesi ise rolün işine bağlıdır. Roller açılış verisinden (`get_bootstrap`) okunur.
 * Bu süzgeç yalnız ekranı düzenler. Yetkiyi sunucu her istekte yine denetler.
 */
import { useCallback } from 'react';

import { useModule } from './context';
import { useRead } from './data';

/** Yardımcı roller yalnız okur. Örnek: "Reseller Assistant" yeni müşteri isteği gönderemez. */
const ASSISTANT_ROLES: readonly string[] = ['Tenant Admin Assistant', 'Reseller Assistant'];
/** Yönetici rollerinden biri varsa kişi yazabilir. */
const ADMIN_ROLES: readonly string[] = ['Tenant Admin', 'Reseller Admin', 'System Manager'];
/** Yeni müşteri isteğini yalnız bayi yöneticisi gönderir (G-169). */
export const CUSTOMER_REQUEST_ROLE = 'Reseller Admin';

/** Kişi yalnız okuyorsa `true` döner. Rol bilgisi yoksa `false` döner. Sunucu yine denetler. */
export function isReadOnly(roles: readonly string[] | undefined): boolean {
  if (!roles) return false;
  return (
    roles.some((r) => ASSISTANT_ROLES.includes(r)) && !roles.some((r) => ADMIN_ROLES.includes(r))
  );
}

export function canRequestCustomer(roles: readonly string[] | undefined): boolean {
  return roles?.includes(CUSTOMER_REQUEST_ROLE) ?? false;
}

function rolesOf(profile: unknown): readonly string[] | undefined {
  if (typeof profile !== 'object' || profile === null) return undefined;
  const roles = (profile as { roles?: unknown }).roles;
  return Array.isArray(roles) && roles.every((r) => typeof r === 'string') ? roles : undefined;
}

/**
 * Kişinin rolleri. Ortam rolleri verirse onlar kullanılır. Yoksa açılış verisi okunur.
 * Yanıt gelene kadar `undefined` döner. Bu sürede yazma düğmesi görünmez.
 */
export function useRoles(): readonly string[] | undefined {
  const env = useModule();
  const known = env?.profile?.roles;
  const get = env?.client?.getProfile;
  const load = useCallback(async (signal: AbortSignal) => rolesOf(await get?.({ signal })), [get]);
  const read = useRead(!known && get ? load : null, 'roles');
  if (known) return known;
  return read.state.status === 'ready' ? read.state.data : undefined;
}
