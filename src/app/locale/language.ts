/** Languages supported by the UI. Order does not matter. */
export const SUPPORTED_LANGUAGES = ['tr', 'en'] as const;

export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/**
 * The UI's single fallback language. Used when the user language is empty or unsupported (IC-12).
 * The fallback language is British English. The customer made this decision on Friday 27 November 2026 (AJA-1407).
 * The format locale of `en` is `en-GB`. Example: the date 27 November 2026 is shown as `27/11/2026`.
 * The format locale is set in `locale-map.ts`. The Frappe server's fallback language is also English.
 */
export const FALLBACK_LANGUAGE: AppLanguage = 'en';

function isSupported(value: string): value is AppLanguage {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

/**
 * Maps the user language from the boot data to a UI language.
 * Example: `en-US` -> `en`. An empty or unsupported language falls back to the fallback language.
 */
export function resolveLanguage(raw: string | null | undefined): AppLanguage {
  const code = (raw ?? '').trim().toLowerCase();
  if (isSupported(code)) return code;
  const base = code.split(/[-_]/)[0] ?? '';
  return isSupported(base) ? base : FALLBACK_LANGUAGE;
}

/**
 * Languages offered in the language switch (AJA-1772). Each name is written in its own language.
 * `tag` is the full locale tag. It is written to the user profile and to `<html lang>` (IC-14).
 * `language` is the text catalogue the UI uses. German has no catalogue yet. Until the
 * translation work adds one, German formats dates, numbers and Ant Design texts in German and
 * shows the application's own texts from the English catalogue (IC-16).
 */
export const UI_LOCALES = [
  { tag: 'en-GB', name: 'English (UK)', language: 'en' },
  { tag: 'tr-TR', name: 'Türkçe', language: 'tr' },
  { tag: 'de-DE', name: 'Deutsch', language: 'en' },
] as const satisfies readonly { tag: string; name: string; language: AppLanguage }[];

export type LocaleTag = (typeof UI_LOCALES)[number]['tag'];

/** The UI's single fallback locale. Decision 44: British English. */
export const FALLBACK_LOCALE: LocaleTag = 'en-GB';

/**
 * Matches a raw language value to an offered locale tag. Case does not matter.
 * Example: `de` -> `de-DE`, `en-US` -> `en-GB`. An unoffered language returns `undefined`.
 */
export function matchLocale(raw: string | null | undefined): LocaleTag | undefined {
  const code = (raw ?? '').trim().replace('_', '-').toLowerCase();
  if (!code) return undefined;
  const exact = UI_LOCALES.find((entry) => entry.tag.toLowerCase() === code);
  if (exact) return exact.tag;
  const base = code.split('-')[0];
  return UI_LOCALES.find((entry) => entry.tag.toLowerCase().split('-')[0] === base)?.tag;
}

/**
 * Chooses the UI locale (AJA-1772). The order is: user profile, tenant setting, fallback.
 * The browser language is never read. So a saved choice is never overridden by the browser.
 */
export function resolveLocale(
  profile: string | null | undefined,
  tenant?: string | null | undefined,
): LocaleTag {
  return matchLocale(profile) ?? matchLocale(tenant) ?? FALLBACK_LOCALE;
}

/** The text catalogue of a locale. Example: `de-DE` -> `en` until a German catalogue exists. */
export function catalogLanguage(tag: LocaleTag): AppLanguage {
  return UI_LOCALES.find((entry) => entry.tag === tag)?.language ?? FALLBACK_LANGUAGE;
}

/** The default locale of a catalogue language. Example: `en` -> `en-GB`. */
export function defaultLocaleOf(language: AppLanguage): LocaleTag {
  return UI_LOCALES.find((entry) => entry.language === language)?.tag ?? FALLBACK_LOCALE;
}
