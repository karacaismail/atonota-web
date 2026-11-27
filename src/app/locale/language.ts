/** Arayüzün desteklediği diller. Sıra önemsizdir. */
export const SUPPORTED_LANGUAGES = ['tr', 'en'] as const;

export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/**
 * Arayüzün tek yedek dili. Kullanıcı dili boşsa ya da desteklenmiyorsa bu dil kullanılır (IC-12).
 * Frappe sunucusunun yedek dili `en` olabilir. Bu fark proje kaydına yazılır.
 */
export const FALLBACK_LANGUAGE: AppLanguage = 'tr';

function isSupported(value: string): value is AppLanguage {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

/**
 * Açılış verisindeki kullanıcı dilini arayüz diline çevirir.
 * Örnek: `en-US` -> `en`. Boş ya da desteklenmeyen dil yedek dile düşer.
 */
export function resolveLanguage(raw: string | null | undefined): AppLanguage {
  const code = (raw ?? '').trim().toLowerCase();
  if (isSupported(code)) return code;
  const base = code.split(/[-_]/)[0] ?? '';
  return isSupported(base) ? base : FALLBACK_LANGUAGE;
}
