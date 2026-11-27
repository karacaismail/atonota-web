/**
 * Pure logic of the "AI providers" page. There is no screen or network code here.
 * The provider list is not written in code; everything comes from the server catalogue.
 */
import { ApiError } from '@/api';
// Only types are imported from the provider client. Importing a value would also tie the client
// chunk to the page chunk, and the bundler would emit an extra chunk.
import type { ConnectionInput, ConnectionStatus, ProviderDefinition } from '@/api/provider-client';
import { failureKind, type FailureKind } from '../data';
import type { ProviderCopyKey } from './messages';

/** Value of the "New account" option in the account picker. No record name can take this form. */
export const NEW_ACCOUNT = '__new__';

export interface ConnectionDraft {
  /** Record name of an existing account, or `NEW_ACCOUNT`. */
  account: string;
  accountName: string;
  apiName: string;
  /** Values of the provider fields. The key is the field's `name`. */
  values: Record<string, string>;
}

/** Removes the provider's secret fields from the form values. Other values stay. */
export function withoutSecrets(
  values: Record<string, string>,
  provider: ProviderDefinition,
): Record<string, string> {
  const secrets = new Set(
    provider.fields.filter((field) => field.kind === 'secret').map((field) => field.name),
  );
  return Object.fromEntries(Object.entries(values).filter(([name]) => !secrets.has(name)));
}

/**
 * Converts the form to the contract's `ConnectionInput` shape.
 * - Only fields in the provider definition are sent.
 * - An empty optional field is not sent.
 * - For an existing account, account-scoped fields are not sent (contract: ConnectionInput.fields).
 * - The secret value is not trimmed. Other texts are trimmed.
 */
export function buildConnectionInput(
  provider: ProviderDefinition,
  draft: ConnectionDraft,
): ConnectionInput {
  const isNew = draft.account === NEW_ACCOUNT;
  const fields: Record<string, string> = {};
  for (const field of provider.fields) {
    if (!isNew && field.scope === 'account') continue;
    const raw = draft.values[field.name] ?? '';
    const value = field.kind === 'secret' ? raw : raw.trim();
    if (value.trim().length === 0 && !field.required) continue;
    fields[field.name] = value;
  }
  return {
    provider: provider.id,
    ...(isNew ? { account_name: draft.accountName.trim() } : { account: draft.account }),
    api_name: draft.apiName.trim(),
    fields,
  };
}

export type RowStatus = ConnectionStatus | 'not_checked';
/**
 * Statuses shown in the list. `satisfies` enforces an exact match with the contract's status list
 * at compile time: a missing or extra status is a type error.
 */
const ROW_STATUS_FLAGS = {
  not_checked: true,
  connected: true,
  invalid_credentials: true,
  permission_denied: true,
  quota_exceeded: true,
  network_error: true,
  provider_error: true,
  endpoint_not_approved: true,
  configuration_error: true,
} as const satisfies Record<RowStatus, true>;
const ROW_STATUSES = new Set<string>(Object.keys(ROW_STATUS_FLAGS));

/** Screen text key of a status. The key name is the status itself. */
export function statusKey(status: RowStatus): ProviderCopyKey {
  return status;
}

/** Screen text key of a live check error. A check creates no record, so it can be retried. */
export function checkFailureKey(error: unknown): 'tooFrequent' | 'checkFailed' | FailureKind {
  if (error instanceof ApiError && error.kind === 'rate_limited') return 'tooFrequent';
  const kind = failureKind(error);
  return kind === 'failure' || kind === 'invalid' ? 'checkFailed' : kind;
}

export type SaveFailureKey =
  | 'saveTooFrequent'
  | 'saveUncertain'
  | 'saveRejected'
  | 'saveConflict'
  | Exclude<
      FailureKind,
      'failure' | 'invalid' | 'uncertain' | 'rateLimited' | 'requestRejected' | 'conflict'
    >;

/**
 * Screen text key of a save error. Saving is a write: the shared rule `failureKind(error, true)`
 * treats a timeout, network error, 5xx response and malformed response as "result unknown". The
 * server may have written the record. In that case the screen does not say "try again", because
 * every save creates a new connection.
 */
export function saveFailureKey(error: unknown): SaveFailureKey {
  const kind = failureKind(error, true);
  switch (kind) {
    case 'uncertain':
      return 'saveUncertain';
    case 'rateLimited':
      return 'saveTooFrequent';
    case 'requestRejected':
      return 'saveRejected';
    case 'conflict':
      return 'saveConflict';
    // The `writing` flag never returns these two kinds; the type still excludes them.
    case 'failure':
    case 'invalid':
      return 'saveUncertain';
    default:
      return kind;
  }
}

export interface ConnectionRow {
  name: string;
  apiName: string;
  account: string;
  provider: string | undefined;
  status: RowStatus;
  checkedAt: string | null;
}

type Row = Record<string, unknown>;
const text = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

/**
 * Merges the API, account and provider records into one list.
 * Only known fields are copied, so an unexpected field never reaches the screen.
 */
export function joinConnections(apis: Row[], accounts: Row[], providers: Row[]): ConnectionRow[] {
  const providerLabels = new Map<string, string>();
  for (const provider of providers) {
    const name = text(provider.name);
    if (name) providerLabels.set(name, text(provider.provider_name) ?? name);
  }
  const accountInfo = new Map<string, { label: string; provider: string | undefined }>();
  for (const account of accounts) {
    const name = text(account.name);
    if (!name) continue;
    const provider = text(account.provider);
    accountInfo.set(name, {
      label: text(account.account_name) ?? name,
      provider: provider ? (providerLabels.get(provider) ?? provider) : undefined,
    });
  }
  const rows: ConnectionRow[] = [];
  for (const api of apis) {
    const name = text(api.name);
    if (!name) continue;
    const accountName = text(api.account) ?? '';
    const account = accountInfo.get(accountName);
    const status = text(api.connection_status);
    rows.push({
      name,
      apiName: text(api.api_name) ?? name,
      account: account?.label ?? accountName,
      provider: account?.provider,
      status: status && ROW_STATUSES.has(status) ? (status as RowStatus) : 'not_checked',
      checkedAt: text(api.connection_checked_at) ?? null,
    });
  }
  return rows;
}

/** Existing accounts of the selected catalogue provider. */
export function accountsFor(
  catalogProvider: string,
  accounts: Row[],
  providers: Row[],
): { name: string; label: string }[] {
  const records = new Set(
    providers
      .filter((provider) => provider.catalog_provider === catalogProvider)
      .map((provider) => text(provider.name))
      .filter((name): name is string => name !== undefined),
  );
  return accounts.flatMap((account) => {
    const name = text(account.name);
    const provider = text(account.provider);
    return name && provider && records.has(provider)
      ? [{ name, label: text(account.account_name) ?? name }]
      : [];
  });
}
