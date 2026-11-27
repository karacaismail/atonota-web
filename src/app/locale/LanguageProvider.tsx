import dayjs from 'dayjs';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { createFormatter, type Formatter, type SiteFormatting } from './format';
import {
  FALLBACK_LOCALE,
  catalogLanguage,
  resolveLocale,
  type AppLanguage,
  type LocaleTag,
} from './language';
import { localeBundle, type LocaleBundle } from './locale-map';

interface LanguageState {
  /** Full locale tag. Example: `de-DE`. Formats, Ant Design and `<html lang>` use it. */
  locale: LocaleTag;
  /** Text catalogue language of the locale. */
  language: AppLanguage;
  /**
   * Takes the raw profile language and, if known, the tenant setting from the boot data.
   * The order is: profile, tenant, fallback `en-GB`. The browser language is not used.
   */
  setLanguage: (raw: string | null | undefined, tenant?: string | null | undefined) => void;
  /** Applies a locale the user chose. The caller saves the choice to the profile first. */
  applyLocale: (locale: LocaleTag) => void;
  /** Time zone and currency from the boot data (IC-13). */
  formatting: SiteFormatting;
  /** Stores the time zone and currency when the boot data arrives. */
  setFormatting: (formatting: SiteFormatting) => void;
}

/**
 * Without a provider, the fallback language applies. Example: a component tested on its own.
 * In that case the language cannot be changed.
 */
const LanguageContext = createContext<LanguageState>({
  locale: FALLBACK_LOCALE,
  language: catalogLanguage(FALLBACK_LOCALE),
  setLanguage: () => undefined,
  applyLocale: () => undefined,
  formatting: {},
  setFormatting: () => undefined,
});

/**
 * The application's single language context. The language comes from the user language in the boot data.
 * Before sign-in, the language is the fallback language.
 */
export function LanguageProvider({
  initialLanguage,
  initialFormatting,
  children,
}: {
  initialLanguage?: string | null | undefined;
  /** Initial time zone and currency. Tests pass them in here. */
  initialFormatting?: SiteFormatting | undefined;
  children: ReactNode;
}) {
  const [locale, setLocale] = useState<LocaleTag>(() => resolveLocale(initialLanguage));
  const language = catalogLanguage(locale);
  const [formatting, setFormattingState] = useState<SiteFormatting>(() => initialFormatting ?? {});
  // The functions stay stable. Boot data is not re-requested when the language changes.
  const setLanguage = useCallback<LanguageState['setLanguage']>(
    (raw, tenant) => setLocale(resolveLocale(raw, tenant)),
    [],
  );
  const applyLocale = useCallback<LanguageState['applyLocale']>((next) => setLocale(next), []);
  const setFormatting = useCallback<LanguageState['setFormatting']>(
    (next) =>
      setFormattingState((prev) =>
        prev.time_zone === next.time_zone && prev.currency === next.currency ? prev : next,
      ),
    [],
  );
  const value = useMemo<LanguageState>(
    () => ({ locale, language, setLanguage, applyLocale, formatting, setFormatting }),
    [locale, language, setLanguage, applyLocale, formatting, setFormatting],
  );
  // IC-14: the page language follows the locale. Every offered locale is written left to right.
  // The state change does not reload the page or remount the tree, so forms and drafts stay.
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = 'ltr';
  }, [locale]);
  // The Day.js locale is a global setting. It is set before children render, so the date picker gets the right locale on first render.
  // Repeating the call with the same locale does not change the result.
  dayjs.locale(localeBundle(locale).dayjs);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

function useLanguageState(): LanguageState {
  return useContext(LanguageContext);
}

/** The current full locale tag. Example: `de-DE`. */
export function useLocale(): LocaleTag {
  return useLanguageState().locale;
}

/** Function that applies a locale the user chose. */
export function useApplyLocale(): LanguageState['applyLocale'] {
  return useLanguageState().applyLocale;
}

/** The current UI language. */
export function useLanguage(): AppLanguage {
  return useLanguageState().language;
}

/** Function that changes the language when the boot data arrives. */
export function useSetLanguage(): LanguageState['setLanguage'] {
  return useLanguageState().setLanguage;
}

/** Function that stores the time zone and currency when the boot data arrives. */
export function useSetFormatting(): LanguageState['setFormatting'] {
  return useLanguageState().setFormatting;
}

/**
 * Formatter for the current language, time zone and currency (IC-13).
 * Example: `useFormat().date('2026-11-27')`.
 */
export function useFormat(): Formatter {
  const { locale, language, formatting } = useLanguageState();
  const { time_zone: timeZone, currency } = formatting;
  return useMemo(
    () => createFormatter({ language, locale, timeZone, currency }),
    [language, locale, timeZone, currency],
  );
}

/** The antd, Ant Design X and Day.js objects for the current language. */
export function useLocaleBundle(): LocaleBundle {
  return localeBundle(useLocale());
}
