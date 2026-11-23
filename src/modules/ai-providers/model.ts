/**
 * "Yapay zekâ sağlayıcıları" sayfasının saf mantığı. Ekran ve ağ kodu burada yoktur.
 * Sağlayıcı listesi kodda yazılı değildir; her şey sunucu kataloğundan gelir.
 */
import { ApiError } from '@/api';
// Sağlayıcı istemcisinden yalnız tip alınır. Değer alınırsa istemci parçası sayfa parçasına da
// bağlanır ve paketleyici ek bir parça üretir.
import type { ConnectionInput, ConnectionStatus, ProviderDefinition } from '@/api/provider-client';
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

/** Form değerlerinden sağlayıcının sır alanlarını çıkarır. Öteki değerler kalır. */
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
/**
 * Listede gösterilen durumlar. `satisfies` sözleşmedeki durum listesiyle birebir eşleşmeyi
 * derleme zamanında zorlar: eksik ya da fazla durum tip hatası verir.
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

/** Durumun ekran metni anahtarı. Anahtar adı durumun kendisidir. */
export function statusKey(status: RowStatus): ProviderCopyKey {
  return status;
}

/** Canlı deneme hatasının ekran metni anahtarı. Deneme yeni kayıt açmaz; yeniden denenebilir. */
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
 * Kaydetme hatasının ekran metni anahtarı. Kayıt bir yazmadır: ortak kural `failureKind(error, true)`
 * zaman aşımını, ağ hatasını, 5xx yanıtını ve bozuk yanıtı "sonuç bilinmiyor" sayar. Sunucu kaydı
 * yazmış olabilir. Bu durumda ekran "yeniden deneyin" demez; çünkü her kayıt yeni bir bağlantı açar.
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
    // `writing` bayrağı bu iki türü hiç döndürmez; tip yine de onları dışarıda bırakır.
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
