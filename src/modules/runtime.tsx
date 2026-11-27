import { Fragment, type ReactNode } from 'react';
import type {
  AiConnectionListing,
  ConnectionCheck,
  ConnectionInput,
  CustomerRequest,
  CustomerRequestInput,
  CustomerStatus,
  ResellerCustomer,
  LinkedAccounts,
  ProviderCatalog,
  SavedConnection,
} from '../api';
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
  /** G-62 and G-98: role, permission row, user permission, access rule and change log endpoints. */
  admin?: AdminClient;
  listProposals?: (
    query: { limit: number; start: number },
    options: RequestOptions,
  ) => Promise<unknown>;
  getProposal?: (id: string, options: RequestOptions) => Promise<unknown>;
  approveProposal?: (id: string, digest: string, options: RequestOptions) => Promise<unknown>;
  rejectProposal?: (id: string, options: RequestOptions) => Promise<unknown>;
  /**
   * Loads the AtonotA Login linked account client (G-160). Its code is not in the initial load;
   * it downloads only when the account page's "Linked accounts" section calls it.
   */
  linkedAccounts?: () => Promise<LinkedAccountsClient>;
  /**
   * Loads the AI provider client: catalogue, connection list, save and test.
   * The client code is not in the initial load;
   * it downloads only when the "AI providers" page calls it.
   */
  aiProviders?: () => Promise<AiProviderClient>;
  /**
   * Loads the reseller client (G-169, G-170). The client code is not in the initial load;
   * it downloads only when the "Customers" page calls it.
   */
  resellers?: () => Promise<ResellerClient>;
  /**
   * Loads the user admin client (G-98): user list, invitation and role profile.
   * The client code is not in the initial load; it downloads only when "Administration" calls it.
   */
  userAdmin?: () => Promise<UserAdminClient>;
}
/**
 * Reseller endpoints. The shared client checks responses against the contract.
 * The server checks permission.
 */
export interface ResellerClient {
  listCustomers: (options: RequestOptions) => Promise<ResellerCustomer[]>;
  customerStatus: (tenant: string, options: RequestOptions) => Promise<CustomerStatus>;
  requestCustomer: (
    input: CustomerRequestInput,
    options: RequestOptions,
  ) => Promise<CustomerRequest>;
}
/** A user of the tenant. The name is the Frappe user ID (email). */
export interface TenantUser {
  name: string;
  fullName: string;
  enabled: boolean;
  lastLogin: string | null;
}
/** Profiles and roles are absent if the server hides them. An empty list means "no profile". */
export interface UserRecord extends TenantUser {
  roleProfiles?: string[];
  roles?: string[];
}
export interface InviteInput {
  email: string;
  firstName: string;
  lastName: string;
}
export interface InvitePreview {
  digest: string;
  operations: { operation: string; target?: string; destructive: boolean }[];
}
/** User admin endpoints. The server rechecks the role on every request. */
export interface UserAdminClient {
  listUsers: (
    query: { start: number },
    options?: RequestOptions,
  ) => Promise<{ users: TenantUser[]; hasNext: boolean }>;
  getUser: (name: string, options?: RequestOptions) => Promise<UserRecord>;
  listRoleProfiles: (options?: RequestOptions) => Promise<string[]>;
  getRoleProfile: (
    name: string,
    options?: RequestOptions,
  ) => Promise<{ name: string; roles: string[] }>;
  /** The preview only reads. The returned digest confirms the send request. */
  previewInvite: (input: InviteInput, options?: RequestOptions) => Promise<InvitePreview>;
  sendInvite: (input: InviteInput, digest: string, options?: RequestOptions) => Promise<void>;
  setRoleProfiles: (
    user: string,
    roleProfiles: string[],
    options?: RequestOptions,
  ) => Promise<{ roleProfiles: string[]; roles: string[] }>;
}
export type { AiConnectionListing };
/**
 * Role and permission endpoints of the administration page. The shared client unwraps the response.
 * The page checks fields with the `../contracts` parsers.
 * The server rechecks permission on every request.
 */
export interface AdminClient {
  listRoles: (options: RequestOptions) => Promise<unknown>;
  listRolePermissions: (doctype: string, options: RequestOptions) => Promise<unknown>;
  setRolePermission: (
    body: {
      doctype: string;
      role: string;
      permlevel: number;
      permissions: Record<string, boolean>;
    },
    options: RequestOptions,
  ) => Promise<unknown>;
  listPermissionLogs: (
    query: { start: number; page_length: number },
    options: RequestOptions,
  ) => Promise<unknown>;
  listUserPermissions: (options: RequestOptions) => Promise<unknown>;
  createUserPermission: (
    values: Record<string, string | number>,
    options: RequestOptions,
  ) => Promise<unknown>;
  deleteUserPermission: (name: string, options: RequestOptions) => Promise<unknown>;
  listAccessRules: (options: RequestOptions) => Promise<unknown>;
  createAccessRule: (
    values: Record<string, string | number>,
    options: RequestOptions,
  ) => Promise<unknown>;
}
/** Linked account endpoints. The shared client checks responses against the contract. */
export interface LinkedAccountsClient {
  listLinkedAccounts: (options: RequestOptions) => Promise<LinkedAccounts>;
  /** Removes a platform link. On the last sign-in method it returns 409 `LastSignInMethod`. */
  unlinkAccount: (provider: string, options: RequestOptions) => Promise<LinkedAccounts>;
}
/** Provider endpoints used by the page. The shared client checks responses against the contract. */
export interface AiProviderClient {
  listProviderCatalog: (options: RequestOptions) => Promise<ProviderCatalog>;
  /** Rows are raw records. The page reads only known fields. The password field is not fetched. */
  listAiConnections: (options: RequestOptions) => Promise<AiConnectionListing>;
  saveProviderConnection: (
    input: ConnectionInput,
    options: RequestOptions,
  ) => Promise<SavedConnection>;
  checkProviderConnection: (api: string, options: RequestOptions) => Promise<ConnectionCheck>;
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
