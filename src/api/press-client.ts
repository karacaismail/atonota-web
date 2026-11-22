// Press istemcisi. Press, kiracı sitesinden ayrı bir köktür ve kendi oturumunu taşır.
//
// Press oturumu Press'in kendi Frappe çereziyle yürür. Tarayıcı erişim belirteci tutmaz.
// Yazan istek Press'in CSRF belirtecini taşır. Bu belirteç kiracı belirtecinden ayrıdır.
import createClient from 'openapi-fetch';

import { isJsonResponse, settle, timedFetch } from './client';
import type { RequestOptions } from './client';
import type { ApiConfig } from './config';
import type { CsrfStore } from './csrf';
import { ApiError, toApiError } from './errors';
import type { paths as PressPaths } from './generated/press_tr';
import { isDeletionMessage, readMessage } from './guards';

export interface PressEnv {
  VITE_PRESS_URL?: string;
}

export interface PressConfig {
  /** Press kökü. Örnek: `https://press.example.test`. */
  pressUrl: string;
  /** Press başka kökteyse çerez `include` ile gider (SZ-14). */
  credentials: RequestCredentials;
  timeoutMs: number;
}

/** Press ayarını okur. `VITE_PRESS_URL` yoksa Press kapalıdır ve `undefined` döner. */
export function readPressConfig(env: PressEnv, currentOrigin: string): PressConfig | undefined {
  const raw = env.VITE_PRESS_URL?.trim();
  if (!raw) return undefined;
  const pressUrl = raw.replace(/\/+$/, '');
  return {
    pressUrl,
    credentials: new URL(pressUrl).origin === currentOrigin ? 'same-origin' : 'include',
    timeoutMs: 30_000,
  };
}

export type DeletionResult =
  /** Kullanıcı önce Keycloak'ta yeniden doğrulanmalıdır. Tarayıcı bu adrese gider. */
  | { status: 'reauthenticate'; url: string }
  /** Silme isteği kaydedildi. */
  | { status: 'submitted' }
  /** Sonuç bilinmiyor. Aynı istek güvenle yinelenebilir. */
  | { status: 'pending' };

export interface PressClientDeps {
  config: PressConfig;
  keycloak: Pick<ApiConfig, 'keycloakUrl' | 'keycloakRealm'>;
  /** Press oturumunun CSRF belirteci. Kiracı deposundan ayrıdır. */
  csrf: CsrfStore;
  /** Press oturumu bitince çağrılır. Sunucu hatasında çağrılmaz. */
  onSessionExpired?: (error: ApiError) => void;
}

function isTrustedReauthUrl(value: string, keycloak: PressClientDeps['keycloak']): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  const base = new URL(keycloak.keycloakUrl);
  const secure = url.protocol === 'https:' || base.protocol === 'http:';
  return (
    secure &&
    url.origin === base.origin &&
    url.pathname ===
      `/realms/${encodeURIComponent(keycloak.keycloakRealm)}/protocol/openid-connect/auth`
  );
}

export function createPressClient({ config, keycloak, csrf, onSessionExpired }: PressClientDeps) {
  const press = createClient<PressPaths>({
    baseUrl: config.pressUrl,
    credentials: config.credentials,
    fetch: timedFetch(config.timeoutMs),
  });
  press.use({
    onRequest({ request }) {
      request.headers.delete('Authorization');
      request.headers.set('Accept', 'application/json');
      return request;
    },
    onResponse({ response }) {
      if (response.ok && !isJsonResponse(response)) {
        throw new ApiError({ kind: 'invalid_response', status: response.status });
      }
      return response;
    },
  });

  return {
    /**
     * Hesap silme isteği.
     * `confirm: false` yeniden doğrulamayı başlatır ve Keycloak adresini döner.
     * `confirm: true` silmeyi onaylar. Yeniden doğrulama son 300 saniyede yapılmış olmalıdır.
     * Silme geri alınamaz. Yalnız kullanıcı açıkça onaylayınca `true` gönderin.
     */
    async requestDeletion(confirm: boolean, options: RequestOptions = {}): Promise<DeletionResult> {
      // Sözleşme bu uçta CSRF başlığını zorunlu yazar. Belirteç yoksa istek gönderilmez.
      const token = csrf.get();
      if (!token) throw new ApiError({ kind: 'csrf', status: 0, code: 'missing_csrf_token' });
      const { data, error, response } = await settle(
        press.POST('/api/method/press_tr.api.account.request_deletion', {
          ...(options.signal ? { signal: options.signal } : {}),
          params: { header: { 'X-Frappe-CSRF-Token': token } },
          body: { confirm },
        }),
        options.signal,
      );
      if (!response.ok) {
        const failure = toApiError(response.status, error, response.headers);
        // Press'te 403 yeniden doğrulama eksikliğidir. Oturum bitimi sayılmaz.
        const result =
          failure.kind === 'forbidden'
            ? new ApiError({ kind: 'forbidden', status: failure.status, code: failure.code })
            : failure;
        if (result.kind === 'session_expired') onSessionExpired?.(result);
        throw result;
      }
      const message = readMessage(data);
      if (!isDeletionMessage(message)) {
        throw new ApiError({ kind: 'invalid_response', status: response.status });
      }
      if ('url' in message) {
        if (!isTrustedReauthUrl(message.url, keycloak)) {
          throw new ApiError({
            kind: 'invalid_response',
            status: 200,
            code: 'untrusted_reauth_url',
          });
        }
        return { status: 'reauthenticate', url: message.url };
      }
      return 'submitted' in message ? { status: 'submitted' } : { status: 'pending' };
    },
  };
}

export type PressClient = ReturnType<typeof createPressClient>;
