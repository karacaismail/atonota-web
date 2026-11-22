// Ayarı, CSRF deposunu, API istemcisini ve girişi tek yerde kurar.
// Uygulama bunu bir kez çağırır. Örnek:
//   const session = createPlatformSession({
//     env: import.meta.env,
//     origin: window.location.origin,
//     document,
//     navigate: (url) => window.location.assign(url),
//     currentPath: () => window.location.pathname + window.location.search,
//   });
import { type ApiClient, createApiClient } from '@/api/client';
import { type ApiConfig, type ApiEnv, readApiConfig } from '@/api/config';
import { type CsrfStore, createCsrfStore, readCsrfFromDocument } from '@/api/csrf';

import { type Auth, createAuth } from './auth';

export interface PlatformSessionDeps {
  env: ApiEnv;
  origin: string;
  document: Document;
  navigate: (url: string) => void;
  currentPath: () => string;
  /** Sahte sunucu gibi başka bir kaynaktan gelen belirteç. Verilirse sayfadaki değerin yerine geçer. */
  csrfToken?: string;
}

export interface PlatformSession {
  config: ApiConfig;
  csrf: CsrfStore;
  api: ApiClient;
  auth: Auth;
}

export function createPlatformSession(deps: PlatformSessionDeps): PlatformSession {
  const config = readApiConfig(deps.env, deps.origin);
  const csrf = createCsrfStore(
    deps.csrfToken ?? readCsrfFromDocument(deps.document, config.csrfMetaName),
  );
  // İstemci ile giriş birbirini kullanır. Bağı burada kurarız.
  const handlers: { onSessionExpired?: () => void } = {};
  const api = createApiClient({
    config,
    csrf,
    onSessionExpired: () => handlers.onSessionExpired?.(),
  });
  const auth = createAuth({
    api,
    config,
    csrf,
    navigate: deps.navigate,
    currentPath: deps.currentPath,
  });
  handlers.onSessionExpired = () => auth.handleSessionExpired();
  return { config, csrf, api, auth };
}
