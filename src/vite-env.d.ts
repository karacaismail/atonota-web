/// <reference types="vite/client" />

/** Derleme zamanı ortam değişkenleri. Değerler .env dosyalarından ya da komut satırından gelir. */
interface ImportMetaEnv {
  /** Kiracı sitesinin kökü. Varsayılan sayfanın kökü. */
  readonly VITE_SITE_URL?: string;
  /** Keycloak kökü. Varsayılan https://id.atonota.net */
  readonly VITE_KEYCLOAK_URL?: string;
  /** Keycloak realm adı. Varsayılan platform */
  readonly VITE_KEYCLOAK_REALM?: string;
  readonly VITE_AI_ROUTE?: string;
  /** CSRF belirtecini taşıyan meta öğesinin adı. Varsayılan csrf-token */
  readonly VITE_CSRF_META_NAME?: string;
  /** Sahte sunucu: "on" derlemede açar, "off" geliştirmede kapatır. */
  readonly VITE_API_MOCKS?: 'on' | 'off' | string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
