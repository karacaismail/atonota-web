/**
 * Deneme sayfaları yalnız e2e derlemesinde açılır: `vite build --mode e2e` ya da `vite --mode e2e`.
 * Üretim derlemesinde (`vite build`) bu sayfalar pakete girmez; koşul derleme zamanında sabittir.
 * Kullanım (src/shell/routes.ts içinde):
 *   ...(isDemoEnabled(import.meta.env.MODE) ? [{ path: '/_demo/ai', lazy: () => import('@/ai/demo/page') }] : [])
 */
export const DEMO_MODE = 'e2e';
export const DEMO_PATH_PREFIX = '/_demo/';

export function isDemoEnabled(mode: string | undefined): boolean {
  return mode === DEMO_MODE;
}
