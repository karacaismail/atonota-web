// Press hesap silme sayfasının adresi.
//
// Orkestratör kararı, 23 Kasım 2026 Pazartesi: panel Press ucunu doğrudan çağırmaz.
// Press ayrı bir köktür. Press kendi CSRF belirtecini kendi `/account-deletion` sayfasına yazar.
// Tarayıcı başka kökün çerezini ve CSRF belirtecini taşımaz (SZ-7).
// Panel "Hesabı sil" düğmesinde kullanıcıyı bu sayfaya tam sayfa yönlendirir.
// Yeniden doğrulama ve onay Press sayfasında olur. Ayrıntı: src/api/README.md.

export interface PressEnv {
  VITE_PRESS_URL?: string;
}

export interface PressConfig {
  /** Press kökü. Örnek: `https://press.example.test`. Yol, sorgu ve kullanıcı bilgisi taşımaz. */
  pressUrl: string;
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

function isLocalHost(hostname: string): boolean {
  return LOCAL_HOSTS.has(hostname) || hostname.endsWith('.localhost');
}

/**
 * Press ayarını okur ve kökü denetler (GV-3).
 * Ayar yoksa Press kapalıdır ve `undefined` döner.
 * Ayar geçersizse hata verir. Böylece yanlış adres sessizce kullanılmaz.
 */
export function readPressConfig(env: PressEnv): PressConfig | undefined {
  const raw = env.VITE_PRESS_URL?.trim();
  if (!raw) return undefined;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('VITE_PRESS_URL is not a valid URL.');
  }
  const secure =
    url.protocol === 'https:' || (url.protocol === 'http:' && isLocalHost(url.hostname));
  const bareOrigin =
    url.username === '' &&
    url.password === '' &&
    (url.pathname === '/' || url.pathname === '') &&
    url.search === '' &&
    url.hash === '';
  if (!secure || !bareOrigin) {
    throw new Error('VITE_PRESS_URL must be an https origin without path, query or credentials.');
  }
  return { pressUrl: url.origin };
}

/** Press hesap silme sayfasının tam adresi. Panel bu adrese tam sayfa yönlendirir. */
export function pressAccountDeletionUrl(config: PressConfig): string {
  return `${config.pressUrl}/account-deletion`;
}
