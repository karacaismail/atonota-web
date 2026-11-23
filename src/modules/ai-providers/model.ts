/**
 * "Yapay zekâ sağlayıcıları" sayfasının saf mantığı. Ekran ve ağ kodu burada yoktur.
 * Sağlayıcı listesi kodda yazılı değildir; her şey sunucu kataloğundan gelir.
 */
import {
  ApiError,
  CONNECTION_STATUSES,
  type ConnectionInput,
  type ConnectionStatus,
  type ProviderDefinition,
} from '@/api';
import { failureKind, type FailureKind } from '../data';
import type { ProviderCopyKey } from './messages';

/** Hesap seçicideki "Yeni hesap" seçeneğinin değeri. Kayıt adı bu biçimde olamaz. */
export const NEW_ACCOUNT = '__new__';

export interface ConnectionDraft {
  /** Var olan hesabın kayıt adı ya da `NEW_ACCOUNT`. */
  account: string;
  accountName: string;
  apiName: string;
  /** Sağlayıcı alanlarının değerleri. Anahtar alanın `name` değeridir. */
  values: Record<string, string>;
}

/**
 * Formu sözleşmedeki `ConnectionInput` biçimine çevirir.
 * - Yalnız sağlayıcı tanımındaki alanlar gider.
 * - Boş isteğe bağlı alan gönderilmez.
 * - Var olan hesapta hesap kapsamlı alanlar gönderilmez (sözleşme: ConnectionInput.fields).
 * - Sır değeri kırpılmaz. Öteki metinler kırpılır.
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
const ROW_STATUSES = new Set<string>([...CONNECTION_STATUSES, 'not_checked']);

/** Durumun ekran metni anahtarı. Anahtar adı durumun kendisidir. */
export function statusKey(status: RowStatus): ProviderCopyKey {
  return status;
}

/** Deneme ya da kaydetme hatasının ekran metni anahtarı. */
export function checkFailureKey(error: unknown): 'tooFrequent' | 'checkFailed' | FailureKind {
  if (error instanceof ApiError && error.kind === 'rate_limited') return 'tooFrequent';
  const kind = failureKind(error);
  return kind === 'failure' || kind === 'invalid' ? 'checkFailed' : kind;
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
 * API, hesap ve sağlayıcı kayıtlarını tek listeye birleştirir.
 * Yalnız bilinen alanlar kopyalanır. Böylece beklenmeyen bir alan ekrana çıkmaz.
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

/** Seçilen katalog sağlayıcısının var olan hesapları. */
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
