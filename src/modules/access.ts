/**
 * In-page write checks (G-168, G-169, G-170).
 * The menu and page gate use no role names. They use server read permission (`src/shell/nav.ts`).
 * Write buttons depend on the role's job. Roles are read from the bootstrap data (`get_bootstrap`).
 * This filter only shapes the screen. The server still checks permission on every request.
 */
import { useCallback } from 'react';

import { useModule } from './context';
import { useRead } from './data';

/** Assistant roles only read. Example: "Reseller Assistant" cannot send a new customer request. */
const ASSISTANT_ROLES: readonly string[] = ['Tenant Admin Assistant', 'Reseller Assistant'];
/** A person with any admin role can write. */
const ADMIN_ROLES: readonly string[] = ['Tenant Admin', 'Reseller Admin', 'System Manager'];
/** Only the reseller admin sends a new customer request (G-169). */
export const CUSTOMER_REQUEST_ROLE = 'Reseller Admin';

/** `true` if the person only reads. `false` without role data. The server still checks. */
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
 * The person's roles. Roles from the environment are used if given. Else bootstrap data is read.
 * Returns `undefined` until the response arrives. Write buttons stay hidden meanwhile.
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
