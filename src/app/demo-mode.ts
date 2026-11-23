/**
 * Deneme sayfaları yalnız e2e derlemesinde açılır: `vite build --mode e2e` ya da `vite --mode e2e`.
 * Üretim derlemesinde (`vite build`) bu sayfalar pakete girmez; koşul derleme zamanında sabittir.
 *
 * Yol kuralı: her iş deneme sayfasını `/_demo/<iş>` yolunda açar. Rota kaydı shell işinin tembel
 * rota listesindedir (`src/shell/routes.ts`). Her iş o listeye yalnız kendi satırını ekler:
 *   ...(isDemoEnabled(import.meta.env.MODE) ? [{ path: '/_demo/ai', lazy: () => import('@/ai/demo/page') }] : [])
 *
 * `/_demo/` öneki hiçbir zaman koleksiyon sayfasına (`/:module/:doctype`) düşmez. Kayıtlı deneme
 * sayfası yoksa yol "bulunamadı" sayfasına gider. Bu kuralı yönlendirici (shell işi) uygular;
 * `isDemoPath` bu ayrımı tek yerden verir.
 */
export const DEMO_MODE = 'e2e';
export const DEMO_PATH_PREFIX = '/_demo/';

export function isDemoEnabled(mode: string | undefined): boolean {
  return mode === DEMO_MODE;
}

/** Yol `/_demo/<iş>` biçiminde mi? Sorgu ve alt yollar sayılır; `/_demo` tek başına sayılmaz. */
export function isDemoPath(pathname: string): boolean {
  return pathname.startsWith(DEMO_PATH_PREFIX) && pathname.length > DEMO_PATH_PREFIX.length;
}
