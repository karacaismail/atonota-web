/**
 * `<html lang>` and `<html dir>` values for the UI language (IC-14, AJA-1364).
 * Screen readers read the text in this language. The browser breaks and hyphenates lines by its rules.
 */
import { FALLBACK_LANGUAGE, resolveLanguage, type AppLanguage } from './language';
import { PSEUDO_RTL_TAG, localeBundle } from './locale-map';

export { PSEUDO_RTL_TAG };

export type TextDirection = 'ltr' | 'rtl';

export interface DocumentLanguage {
  /** UI language. Catalogs and formats use it. */
  language: AppLanguage;
  /** Value of `<html lang>`. Never empty. Example: `en-GB`. */
  lang: string;
  /** Value of `<html dir>`. */
  dir: TextDirection;
}

/** Text direction of each UI language. Turkish and English run left to right. */
const DIRECTION: Record<AppLanguage, TextDirection> = { tr: 'ltr', en: 'ltr' };

export interface ResolveOptions {
  /** Accepts the pseudo language. True only in the e2e build. */
  allowPseudo?: boolean;
}

/**
 * Maps the raw language from the boot data to the `<html>` values.
 * `lang` is the format tag of the language. Example: `en` -> `en-GB`, `tr` -> `tr-TR`.
 * An empty or unsupported language gives `en-GB` and `ltr` (Decision 44).
 */
export function resolveDocumentLanguage(
  raw: string | null | undefined,
  { allowPseudo = false }: ResolveOptions = {},
): DocumentLanguage {
  if (allowPseudo && (raw ?? '').trim().toLowerCase() === PSEUDO_RTL_TAG.toLowerCase()) {
    return { language: FALLBACK_LANGUAGE, lang: PSEUDO_RTL_TAG, dir: 'rtl' };
  }
  const language = resolveLanguage(raw);
  return { language, lang: localeBundle(language).intl, dir: DIRECTION[language] };
}

/** Writes the values to `<html>`. Only changed attributes are written. */
export function applyDocumentLanguage(
  { lang, dir }: Pick<DocumentLanguage, 'lang' | 'dir'>,
  root: HTMLElement = document.documentElement,
): void {
  if (root.getAttribute('lang') !== lang) root.setAttribute('lang', lang);
  if (root.getAttribute('dir') !== dir) root.setAttribute('dir', dir);
}
