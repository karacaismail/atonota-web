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
  listProposals?: (
    query: { limit: number; start: number },
    options: RequestOptions,
  ) => Promise<unknown>;
  getProposal?: (id: string, options: RequestOptions) => Promise<unknown>;
  approveProposal?: (id: string, digest: string, options: RequestOptions) => Promise<unknown>;
  rejectProposal?: (id: string, options: RequestOptions) => Promise<unknown>;
  /**
   * AtonotA Login bağlı hesap istemcisini yükler (G-160). İstemci kodu ilk yüke girmez;
   * yalnız hesap sayfasının "Bağlı hesaplar" bölümü çağırınca iner.
   */
  linkedAccounts?: () => Promise<LinkedAccountsClient>;
  /**
   * Yapay zekâ sağlayıcı istemcisini yükler: katalog, bağlantı listesi, kayıt ve deneme.
   * İstemci kodu ilk yüke girmez; yalnız "Yapay zekâ sağlayıcıları" sayfası çağırınca iner.
   */
  aiProviders?: () => Promise<AiProviderClient>;
  /**
   * Bayi istemcisini yükler (G-169, G-170). İstemci kodu ilk yüke girmez;
   * yalnız "Müşteriler" sayfası çağırınca iner.
   */
  resellers?: () => Promise<ResellerClient>;
}
/** Bayi uçları. Ortak istemci yanıtları sözleşmeyle denetler. Yetkiyi sunucu denetler. */
export interface ResellerClient {
  listCustomers: (options: RequestOptions) => Promise<ResellerCustomer[]>;
  customerStatus: (tenant: string, options: RequestOptions) => Promise<CustomerStatus>;
  requestCustomer: (
    input: CustomerRequestInput,
    options: RequestOptions,
  ) => Promise<CustomerRequest>;
}
export type { AiConnectionListing };
/** Bağlı hesap uçları. Ortak istemci yanıtları sözleşmeyle denetler. */
export interface LinkedAccountsClient {
  listLinkedAccounts: (options: RequestOptions) => Promise<LinkedAccounts>;
  /** Bir platform bağını kaldırır. Son giriş yolunda sunucu 409 `LastSignInMethod` döner. */
  unlinkAccount: (provider: string, options: RequestOptions) => Promise<LinkedAccounts>;
}
/** Sayfanın kullandığı sağlayıcı uçları. Ortak istemci yanıtları sözleşmeyle denetler. */
export interface AiProviderClient {
  listProviderCatalog: (options: RequestOptions) => Promise<ProviderCatalog>;
  /** Satırlar ham kayıttır. Sayfa yalnız bilinen alanları okur. Parola alanı istenmez. */
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
