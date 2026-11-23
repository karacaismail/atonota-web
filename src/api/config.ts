/**
 * API ayarları. Değerler derleme ortamından gelir (`VITE_` değişkenleri).
 * Bu değerler tarayıcıya gider. Buraya gizli değer konmaz (GV-1).
 */
export interface ApiConfig {
  /** Kiracı sitesinin kökü. Örnek: `https://kiraci.example.test`. Panel aynı kökte sunulur. */
  siteUrl: string;
  /** Çerez politikası. Aynı kökte `same-origin`, aynı sitede başka kökte `include` olur (SZ-14). */
  credentials: RequestCredentials;
  /** Olağan istek için zaman aşımı, milisaniye. */
  timeoutMs: number;
  /** Model geçidi isteği için zaman aşımı, milisaniye. Geçidin kendi süresi 60 saniyedir. */
  modelTimeoutMs: number;
  /** Keycloak'ın tarayıcıdan görülen kökü. Giriş adresi bu kökle denetlenir. */
  keycloakUrl: string;
  /** Keycloak realm adı. */
  keycloakRealm: string;
  /** Model geçidindeki "AI Route" kaydının adı. Boşsa yapay zekâ kapalıdır. */
  aiRoute: string;
  /** CSRF belirtecini taşıyan `meta` öğesinin adı. */
  csrfMetaName: string;
}

export interface ApiEnv {
  VITE_SITE_URL?: string;
  VITE_KEYCLOAK_URL?: string;
  VITE_KEYCLOAK_REALM?: string;
  VITE_AI_ROUTE?: string;
  VITE_CSRF_META_NAME?: string;
}

export const DEFAULT_KEYCLOAK_URL = 'https://api.login.atonota.net';
export const DEFAULT_KEYCLOAK_REALM = 'platform';

function trimSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

export function readApiConfig(env: ApiEnv, currentOrigin: string): ApiConfig {
  const siteUrl = trimSlash(env.VITE_SITE_URL?.trim() || currentOrigin);
  const sameOrigin = new URL(siteUrl).origin === currentOrigin;
  return {
    siteUrl,
    credentials: sameOrigin ? 'same-origin' : 'include',
    timeoutMs: 30_000,
    modelTimeoutMs: 65_000,
    keycloakUrl: trimSlash(env.VITE_KEYCLOAK_URL?.trim() || DEFAULT_KEYCLOAK_URL),
    keycloakRealm: env.VITE_KEYCLOAK_REALM?.trim() || DEFAULT_KEYCLOAK_REALM,
    aiRoute: env.VITE_AI_ROUTE?.trim() ?? '',
    csrfMetaName: env.VITE_CSRF_META_NAME?.trim() || 'csrf-token',
  };
}
