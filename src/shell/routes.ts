/**
 * Rota sözleşmesi (RE-9). Bütün adresler buradan üretilir.
 */
import type { ViewType } from './tokens';

export const routePaths = {
  home: '/',
  assistant: '/asistan',
  collection: '/:module/:doctype',
  record: '/:module/:doctype/:name',
  agent: '/ajanlar/:id',
} as const;

export const routes = {
  home: () => '/',
  assistant: () => '/asistan',
  collection: (module: string, doctype: string, view?: ViewType) =>
    `/${encodeURIComponent(module)}/${encodeURIComponent(doctype)}${
      view && view !== 'table' ? `?gorunum=${view}` : ''
    }`,
  record: (module: string, doctype: string, name: string) =>
    `/${encodeURIComponent(module)}/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`,
  agent: (id: string) => `/ajanlar/${encodeURIComponent(id)}`,
};

/** Adres parametreleri. */
export const queryKeys = {
  view: 'gorunum',
  /** Örnek veri durumunu zorlamak için. Yalnız örnek sayfalarda okunur. */
  demoState: 'durum',
  search: 'ara',
} as const;
