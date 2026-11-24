// Panelin adres yolu. Değer derleme ayarından gelir (`vite.config.ts`, `vite/base-path.ts`).
// Canlıda `/panel/`, yerel geliştirmede ve e2e kipinde `/` olur.

/** Derlemenin adres yolu. Her zaman `/` ile başlar ve biter. */
export const APP_BASE: string = import.meta.env.BASE_URL;

/** Yönlendiricinin `basename` değeri. Kök yolda değer yoktur. Örnek: `/panel/` için `/panel`. */
export function routerBasename(base: string = APP_BASE): string | undefined {
  const trimmed = base.replace(/\/+$/, '');
  return trimmed === '' ? undefined : trimmed;
}

/**
 * Tarayıcı adresinin uygulama içindeki yolu. Panel öneki çıkarılır.
 * Örnek: `/panel/atonota-login` için `/atonota-login`. Önekle başlamayan yol değişmez.
 */
export function appPathname(pathname: string, base: string = APP_BASE): string {
  const prefix = routerBasename(base);
  if (!prefix) return pathname;
  if (pathname === prefix) return '/';
  return pathname.startsWith(`${prefix}/`) ? pathname.slice(prefix.length) : pathname;
}
