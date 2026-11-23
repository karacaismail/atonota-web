import { Fragment, type ReactNode } from 'react';
import type { LinkedAccounts } from '../api';
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
  /** AtonotA Login: bağlı platformlar (G-160). Yanıt ortak istemcide denetlenmiştir. */
  listLinkedAccounts?: (options: RequestOptions) => Promise<LinkedAccounts>;
  /** Bir platform bağını kaldırır. Son giriş yolunda sunucu 409 `LastSignInMethod` döner. */
  unlinkAccount?: (provider: string, options: RequestOptions) => Promise<LinkedAccounts>;
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
