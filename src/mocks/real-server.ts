/**
 * Gerçek sunucu koruması. AtonotA Login ve ortam sunucuları `atonota.net` alanındadır.
 * Örnek: `api.login.atonota.net` ve `api.login.alpha.atonota.net`.
 *
 * Sahte sunucu bu alana giden isteği ağa geçirmez. İsteği kendi işçisinde keser.
 * Tarayıcı testlerinin ortak fixture'ı da aynı denetimi kullanır: `tests/setup/dis-istek.ts`.
 */
export const GUARDED_DOMAIN = 'atonota.net';

/** Kesilen isteğin tarayıcı günlüğündeki öneki. Tarayıcı testleri bu kaydı okur. */
export const REAL_SERVER_LOG_PREFIX = '[sahte-sunucu] gerçek sunucu isteği kesildi:';

/** Adres korunan alan adındaysa `true` döner. Benzer adlar (`notatonota.net`) korunmaz. */
export function isGuardedUrl(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  return host === GUARDED_DOMAIN || host.endsWith(`.${GUARDED_DOMAIN}`);
}

/** Günlük kaydı: `<önek> <yöntem> <adres>`. */
export function realServerLogLine(method: string, url: string): string {
  return `${REAL_SERVER_LOG_PREFIX} ${method} ${url}`;
}

/** Günlük satırı kesilen bir isteğin kaydıysa `<yöntem> <adres>` döner. */
export function parseRealServerLogLine(line: string): string | null {
  if (!line.startsWith(`${REAL_SERVER_LOG_PREFIX} `)) return null;
  return line.slice(REAL_SERVER_LOG_PREFIX.length + 1);
}
