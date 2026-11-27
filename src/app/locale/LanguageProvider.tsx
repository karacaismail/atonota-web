import dayjs from 'dayjs';
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  applyDocumentLanguage,
  resolveDocumentLanguage,
  type DocumentLanguage,
  type TextDirection,
} from './document-language';
import { createFormatter, type Formatter, type SiteFormatting } from './format';
import { FALLBACK_LANGUAGE, type AppLanguage } from './language';
import { localeBundle, type LocaleBundle } from './locale-map';

interface LanguageState {
  language: AppLanguage;
  /** Text direction of the language. `<html dir>` and antd use it (IC-14). */
  dir: TextDirection;
  /** Takes the raw language from the boot data. An empty language falls back to the fallback language. */
  setLanguage: (raw: string | null | undefined) => void;
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
  language: FALLBACK_LANGUAGE,
  dir: 'ltr',
  setLanguage: () => undefined,
  formatting: {},
  setFormatting: () => undefined,
});

/** The pseudo language is accepted only in the e2e build. The condition is constant at build time. */
const PSEUDO_ALLOWED = import.meta.env.MODE === 'e2e';

/**
 * The application's single language context. The language comes from the user language in the boot data.
 * Before sign-in, the language is the fallback language.
 * `<html lang>` and `<html dir>` follow the language (IC-14). A language change only changes the
 * visible words: the tree is not remounted, so form drafts stay.
 */
export function LanguageProvider({
  initialLanguage,
  initialFormatting,
  allowPseudo = PSEUDO_ALLOWED,
  children,
}: {
  initialLanguage?: string | null | undefined;
  /** Initial time zone and currency. Tests pass them in here. */
  initialFormatting?: SiteFormatting | undefined;
  /** Accepts the right-to-left pseudo language. Defaults to true only in the e2e build. */
  allowPseudo?: boolean;
  children: ReactNode;
}) {
  const [resolved, setResolved] = useState<DocumentLanguage>(() =>
    resolveDocumentLanguage(initialLanguage, { allowPseudo }),
  );
  const { language, lang, dir } = resolved;
  const [formatting, setFormattingState] = useState<SiteFormatting>(() => initialFormatting ?? {});
  // The functions stay stable. Boot data is not re-requested when the language changes.
  const setLanguage = useCallback<LanguageState['setLanguage']>(
    (raw) => {
      const next = resolveDocumentLanguage(raw, { allowPseudo });
      setResolved((prev) =>
        prev.language === next.language && prev.lang === next.lang && prev.dir === next.dir
          ? prev
          : next,
      );
    },
    [allowPseudo],
  );
  const setFormatting = useCallback<LanguageState['setFormatting']>(
    (next) =>
      setFormattingState((prev) =>
        prev.time_zone === next.time_zone && prev.currency === next.currency ? prev : next,
      ),
    [],
  );
  const value = useMemo<LanguageState>(
    () => ({ language, dir, setLanguage, formatting, setFormatting }),
    [language, dir, setLanguage, formatting, setFormatting],
  );
  // Written before paint, so the screen reader never meets the old language.
  useLayoutEffect(() => {
    applyDocumentLanguage({ lang, dir });
  }, [lang, dir]);
  // The Day.js locale is a global setting. It is set before children render, so the date picker gets the right locale on first render.
  // Repeating the call with the same locale does not change the result.
  dayjs.locale(localeBundle(language).dayjs);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

function useLanguageState(): LanguageState {
  return useContext(LanguageContext);
}

/** The current UI language. */
export function useLanguage(): AppLanguage {
  return useLanguageState().language;
}

/** Text direction of the current language: `ltr` or `rtl`. */
export function useTextDirection(): TextDirection {
  return useLanguageState().dir;
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
  const { language, formatting } = useLanguageState();
  const { time_zone: timeZone, currency } = formatting;
  return useMemo(
    () => createFormatter({ language, timeZone, currency }),
    [language, timeZone, currency],
  );
}

/** The antd, Ant Design X and Day.js objects for the current language. */
export function useLocaleBundle(): LocaleBundle {
  return localeBundle(useLanguage());
}
