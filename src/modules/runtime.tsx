import { Fragment, type ReactNode } from 'react';
import type { ConnectionCheck, ConnectionInput, ProviderCatalog, SavedConnection } from '../api';
import { ModuleContext } from './context';

export interface RequestOptions {
  signal?: AbortSignal;
}
/** Normalized, schema-checked results from the shared API client. No fetch or session logic lives here. */
export interface ModuleClient {
  getProfile?: (options: RequestOptions) => Promise<unknown>;
  listLeaveApplications?: (
    query: { limit_start: number; limit_page_length: number; order_by: 'modified desc, name asc' },
    options: RequestOptions,
  ) => Promise<unknown>;
  getLeaveApplication?: (name: string, options: RequestOptions) => Promise<unknown>;
  approveLeaveApplication?: (
    body: { name: string; version: string },
    options: RequestOptions,
  ) => Promise<unknown>;
  cancelLeaveApplication?: (
    body: { name: string; version: string },
    options: RequestOptions,
  ) => Promise<unknown>;
  explainPermission?: (
    query: {
      doctype: string;
      name: string;
      ptype: 'read' | 'write' | 'create' | 'delete' | 'submit' | 'cancel';
    },
    options: RequestOptions,
  ) => Promise<unknown>;
  listProposals?: (
    query: { limit: number; start: number },
    options: RequestOptions,
  ) => Promise<unknown>;
  getProposal?: (id: string, options: RequestOptions) => Promise<unknown>;
  approveProposal?: (id: string, digest: string, options: RequestOptions) => Promise<unknown>;
  rejectProposal?: (id: string, options: RequestOptions) => Promise<unknown>;
  /** Yapay zekâ sağlayıcı kataloğu. Ortak istemci yanıtı sözleşmeyle denetler. */
  listProviderCatalog?: (options: RequestOptions) => Promise<ProviderCatalog>;
  /**
   * Kayıtlı API bağlantıları, hesaplar ve sağlayıcı kayıtları (Frappe API v2 listesi).
   * Satırlar ham kayıttır. Sayfa yalnız bilinen alanları okur. Parola alanı istenmez.
   */
  listAiConnections?: (options: RequestOptions) => Promise<AiConnectionListing>;
  saveProviderConnection?: (
    input: ConnectionInput,
    options: RequestOptions,
  ) => Promise<SavedConnection>;
  checkProviderConnection?: (api: string, options: RequestOptions) => Promise<ConnectionCheck>;
}
export interface AiConnectionListing {
  apis: Record<string, unknown>[];
  accounts: Record<string, unknown>[];
  providers: Record<string, unknown>[];
}
export interface ModuleEnvironment {
  tenant: string;
  user: string;
  mode: 'example' | 'live';
  locale?: 'en' | 'tr';
  client?: ModuleClient;
  profile?: { fullName: string; roles: readonly string[]; truncated?: boolean };
  /** Realm URL comes from validated auth configuration, never from an arbitrary query string. */
  identityRealmUrl?: string;
  accountSecurityUrl?: string;
  pressOrigin?: string;
  /** Only a trusted server state, never a URL query or local success guess. */
  accountDeletionStatus?: unknown;
}
export function ModuleProvider({
  value,
  children,
}: {
  value: ModuleEnvironment;
  children: ReactNode;
}) {
  // Account changes discard all drafts, approvals and in-flight results together.
  return (
    <ModuleContext.Provider value={value}>
      <Fragment key={JSON.stringify([value.tenant, value.user, value.mode])}>{children}</Fragment>
    </ModuleContext.Provider>
  );
}
