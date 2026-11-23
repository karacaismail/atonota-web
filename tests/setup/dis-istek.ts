/**
 * Tarayıcı testlerinde korunan alan adı. AtonotA Login ve ortam sunucuları bu alandadır.
 * Örnek: `api.login.atonota.net` ve `api.login.alpha.atonota.net`.
 */
export const GUARDED_DOMAIN = 'atonota.net';

/** Adres korunan alan adındaysa `true` döner. Benzer adlar (`notatonota.net`) korunmaz. */
export function isGuardedUrl(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  return host === GUARDED_DOMAIN || host.endsWith(`.${GUARDED_DOMAIN}`);
}
