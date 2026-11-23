// AtonotA Login istemcisi: giriş platformları ve bağlı hesaplar (G-159, G-160).
//
// Bu dosya ilk yüke girmez. Giriş ekranı ve hesap sayfası onu `import()` ile yükler.
// İstekler yine ortak istemciden geçer (SZ-5): `frappeDocument` site kökünü, CSRF başlığını,
// zaman aşımını ve oturum süresi işini üstlenir. Sözleşme `src/auth/README.md` içindedir.
//
// Değerler yalnız `./index` dosyasından alınır. Böylece ortak kod ilk yükteki parçada kalır.
import type { ApiClient, RequestOptions } from './client';
import type { Guard } from './guards';
import { ApiError, isProviderAlias } from './index';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export interface LoginProvider {
  alias: string;
  display_name: string;
}

export interface LoginProviderList {
  providers: LoginProvider[];
}

export interface LinkedProvider extends LoginProvider {
  linked: boolean;
}

export interface LinkedAccounts {
  providers: LinkedProvider[];
  /** Platform dışı giriş yollarının sayısı. Örnek: parola ya da geçiş anahtarı. */
  local_sign_in_methods: number;
}

const MAX_PROVIDERS = 100;
const MAX_DISPLAY_NAME = 80;

function isLoginProvider(value: unknown): value is LoginProvider {
  return (
    isRecord(value) &&
    isProviderAlias(value.alias) &&
    typeof value.display_name === 'string' &&
    value.display_name.trim().length > 0 &&
    value.display_name.length <= MAX_DISPLAY_NAME
  );
}

function isUniqueProviderList<T extends LoginProvider>(
  value: unknown,
  item: (entry: unknown) => entry is T,
): value is T[] {
  if (!Array.isArray(value) || value.length > MAX_PROVIDERS || !value.every(item)) return false;
  return new Set(value.map((entry) => entry.alias)).size === value.length;
}

export const isLoginProviderList: Guard<LoginProviderList> = (value): value is LoginProviderList =>
  isRecord(value) && isUniqueProviderList(value.providers, isLoginProvider);

function isLinkedProvider(value: unknown): value is LinkedProvider {
  return isLoginProvider(value) && typeof (value as { linked?: unknown }).linked === 'boolean';
}

export const isLinkedAccounts: Guard<LinkedAccounts> = (value): value is LinkedAccounts =>
  isRecord(value) &&
  isUniqueProviderList(value.providers, isLinkedProvider) &&
  typeof value.local_sign_in_methods === 'number' &&
  Number.isInteger(value.local_sign_in_methods) &&
  value.local_sign_in_methods >= 0;

const METHOD = '/api/method/platform_core.api.auth.';

/** Bağlamadan sonra dönülecek yol: hesap sayfası. Sabit yoldur; dışarıdan değer alınmaz (GV-3). */
export const LINK_RETURN_PATH = '/account';

/**
 * Hesap bağlama adresini kurar (G-160). Tarayıcı bu adrese sayfa geçişiyle gider.
 * Sunucu oturumu denetler ve Keycloak'ın bağlama akışını başlatır. Tarayıcı belirteç tutmaz.
 * Platform adı kurala uymazsa adres kurulmaz ve `undefined` döner.
 */
export function startLinkUrl(siteUrl: string, provider: string): string | undefined {
  if (!isProviderAlias(provider)) return undefined;
  const url = new URL(`${siteUrl}${METHOD}start_link`);
  url.searchParams.set('provider', provider);
  url.searchParams.set('redirect_to', LINK_RETURN_PATH);
  return url.toString();
}
export function createLoginClient(api: Pick<ApiClient, 'frappeDocument'>) {
  async function call<T>(
    method: 'GET' | 'POST',
    name: string,
    body: object | undefined,
    guard: Guard<T>,
    options: RequestOptions,
  ): Promise<T> {
    const response = await api.frappeDocument({
      method,
      path: `${METHOD}${name}`,
      ...(body ? { body } : {}),
      ...(options.signal ? { signal: options.signal } : {}),
    });
    if (!response.ok) throw response.error;
    const value = isRecord(response.body) ? response.body.message : undefined;
    if (!guard(value)) throw new ApiError({ kind: 'invalid_response', status: response.status });
    return value;
  }

  return {
    /**
     * Giriş ekranının platform listesini okur (G-159). Oturum istemez.
     * Sunucu yalnız açık platformları döner. Sıra sunucunun sırasıdır.
     */
    async listLoginProviders(options: RequestOptions = {}): Promise<LoginProvider[]> {
      const list = await call(
        'GET',
        'list_login_providers',
        undefined,
        isLoginProviderList,
        options,
      );
      return list.providers;
    },

    /** Oturumdaki kullanıcının bağlı platformlarını okur (G-160). */
    listLinkedAccounts(options: RequestOptions = {}): Promise<LinkedAccounts> {
      return call('GET', 'list_linked_accounts', undefined, isLinkedAccounts, options);
    },

    /**
     * Bir platform bağını kaldırır. Yeni listeyi döner.
     * Son giriş yolu kaldırılamaz: sunucu 409 ve `LastSignInMethod` döner.
     */
    unlinkAccount(provider: string, options: RequestOptions = {}): Promise<LinkedAccounts> {
      if (!isProviderAlias(provider)) {
        return Promise.reject(
          new ApiError({ kind: 'invalid_request', status: 0, code: 'provider' }),
        );
      }
      return call('POST', 'unlink_account', { provider }, isLinkedAccounts, options);
    },
  };
}

export type LoginClient = ReturnType<typeof createLoginClient>;
