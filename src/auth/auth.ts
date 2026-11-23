// Web paneli girişi.
//
// Tarayıcı erişim belirteci tutmaz. Giriş arka ucun akışından geçer:
//   start_login -> Keycloak -> keycloak_callback -> Frappe oturum çerezi.
// `state`, PKCE doğrulayıcısı ve `nonce` sunucuda üretilir ve saklanır.
// Panel aynı kökte sunulur. Bellekte yalnız CSRF belirteci durur. Çıkışta ve oturum bitiminde silinir.
import type { ApiClient } from '@/api/client';
import type { ApiConfig } from '@/api/config';
import type { CsrfStore } from '@/api/csrf';
import { ApiError } from '@/api/errors';

export type AuthState =
  | { status: 'checking' }
  | { status: 'signed_in'; user: string }
  | { status: 'signed_out' }
  | { status: 'redirecting' }
  | { status: 'error'; error: ApiError };

export interface AuthDeps {
  api: Pick<ApiClient, 'getLoggedUser' | 'logout'>;
  config: Pick<ApiConfig, 'siteUrl'>;
  csrf: CsrfStore;
  /** Tarayıcıyı verilen adrese götürür. Örnek: `(url) => window.location.assign(url)`. */
  navigate: (url: string) => void;
  /** Girişten sonra dönülecek yol. Örnek: `/panel/kayitlar?durum=acik`. */
  currentPath: () => string;
}

// Sözleşmedeki `redirect_to` deseni.
const REDIRECT_PATTERN = /^\/(?!\/)[A-Za-z0-9\-._~/?#@!$&()*+,;=%:[\]]*$/;

/** Dönüş yolu aynı kökte göreli bir yol mu? Sözleşmedeki kurala uyar. */
export function isSafeRedirect(path: string): boolean {
  return path.length <= 2048 && REDIRECT_PATTERN.test(path);
}

/**
 * Arka ucun giriş başlatma adresini kurar.
 * Dönüş yolu güvenli değilse adrese eklenmez. O zaman sunucu `platform_panel_url` adresine döner.
 */
export function startLoginUrl(siteUrl: string, redirectTo: string): string {
  const url = new URL(`${siteUrl}/api/method/platform_core.api.auth.start_login`);
  if (isSafeRedirect(redirectTo)) url.searchParams.set('redirect_to', redirectTo);
  return url.toString();
}

const LOGOUT_PATH_SUFFIX = '/protocol/openid-connect/logout';

/**
 * Keycloak çıkış adresini denetler (GV-3).
 * Adres tam bir `http` ya da `https` adresi olmalıdır. Yolu `/protocol/openid-connect/logout` ile biter.
 * Adreste kullanıcı adı ya da parola bulunmaz.
 */
export function isSafeLogoutUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  return (
    (url.protocol === 'https:' || url.protocol === 'http:') &&
    url.username === '' &&
    url.password === '' &&
    url.pathname.endsWith(LOGOUT_PATH_SUFFIX)
  );
}

function sameState(a: AuthState, b: AuthState): boolean {
  if (a.status !== b.status) return false;
  if (a.status === 'signed_in' && b.status === 'signed_in') return a.user === b.user;
  if (a.status === 'error' && b.status === 'error') return a.error === b.error;
  return true;
}

function asApiError(error: unknown): ApiError {
  return error instanceof ApiError ? error : new ApiError({ kind: 'unknown', status: 0 });
}

export function createAuth({ api, config, csrf, navigate, currentPath }: AuthDeps) {
  let state: AuthState = { status: 'checking' };
  const listeners = new Set<() => void>();

  function setState(next: AuthState): void {
    if (sameState(state, next)) return;
    state = next;
    for (const listener of listeners) listener();
  }

  /** Kullanıcıyı arka ucun giriş akışına götürür. Yalnız kullanıcı eylemiyle ya da oturum bitince çağrılır. */
  function signIn(redirectTo: string = currentPath()): void {
    setState({ status: 'redirecting' });
    navigate(startLoginUrl(config.siteUrl, redirectTo));
  }

  return {
    getState: (): AuthState => state,

    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    /**
     * Oturumu sunucuya sorar. Oturum yoksa yönlendirmez. Ekran giriş düğmesini gösterir.
     * Sunucu hatasında `error` durumuna geçer. Oturum bitmiş sayılmaz.
     */
    async check(): Promise<void> {
      if (state.status !== 'signed_in') setState({ status: 'checking' });
      try {
        const user = await api.getLoggedUser();
        setState(user === 'Guest' ? { status: 'signed_out' } : { status: 'signed_in', user });
      } catch (error) {
        const apiError = asApiError(error);
        if (apiError.kind === 'session_expired' || apiError.kind === 'forbidden') {
          setState({ status: 'signed_out' });
        } else {
          setState({ status: 'error', error: apiError });
        }
      }
    },

    signIn,

    /**
     * Frappe oturumunu kapatır. Sonra Keycloak çıkış sayfasına gider.
     * İstek başarısız olursa oturum açık kalır ve işlev `ApiError` ile reddedilir.
     * Sunucunun verdiği adres denetimden geçmezse panelin giriş ekranı açılır.
     */
    async signOut(): Promise<void> {
      let target: { logout_url: string };
      try {
        target = await api.logout();
      } catch (error) {
        throw asApiError(error);
      }
      // Frappe oturumu kapandı. Bellekteki CSRF belirteci de silinir.
      csrf.clear();
      if (!isSafeLogoutUrl(target.logout_url)) {
        setState({ status: 'signed_out' });
        return;
      }
      setState({ status: 'redirecting' });
      navigate(target.logout_url);
    },

    /**
     * API istemcisi oturum bitimini bildirince çağrılır.
     * Kullanıcı oturumdaysa onu bir kez yeniden girişe götürür.
     * Oturum hiç açılmadıysa yalnız giriş ekranı gösterilir. Kendiliğinden yönlendirme yapılmaz.
     */
    handleSessionExpired(): void {
      csrf.clear();
      if (state.status === 'signed_in') signIn();
      else if (state.status !== 'redirecting') setState({ status: 'signed_out' });
    },
  };
}

export type Auth = ReturnType<typeof createAuth>;
