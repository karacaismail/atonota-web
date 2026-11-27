import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError, userMessage } from '@/api';

import { UI_LOCALES, type LocaleTag } from './language';
import { useApplyLocale, useLanguage, useLocale } from './LanguageProvider';

/** Saves the chosen locale to the user profile. Rejects if the server refuses. */
export type SaveLanguage = (locale: LocaleTag, signal: AbortSignal) => Promise<void>;

/** Visible texts of the language switch. */
const MESSAGES = {
  en: {
    label: 'Language',
    saving: 'Saving the language.',
    failed: (reason: string) => `The language did not change. ${reason}`,
    unknown: 'The server did not save the choice. Try again.',
  },
  tr: {
    label: 'Dil',
    saving: 'Dil kaydediliyor.',
    failed: (reason: string) => `Dil değişmedi. ${reason}`,
    unknown: 'Sunucu seçimi kaydetmedi. Yeniden deneyin.',
  },
} as const;

export interface LanguageChoice {
  /** The locale the screen uses now. */
  locale: LocaleTag;
  /** The locale being saved. Undefined when no save is running. */
  pending: LocaleTag | undefined;
  /** The reason text of the last refused save. Undefined after a successful save. */
  error: string | undefined;
  /** Offered locales, each with its name in its own language. */
  options: typeof UI_LOCALES;
  /** Visible texts in the current language. */
  text: (typeof MESSAGES)[keyof typeof MESSAGES];
  /**
   * Chooses a locale. The choice is a target state (AJA-1772):
   * choosing the current locale again sends nothing. While a save runs, a new choice is ignored.
   * The screen changes only after the profile save succeeds. The page is not reloaded.
   */
  choose: (locale: LocaleTag) => void;
}

function isOffered(value: string): value is LocaleTag {
  return UI_LOCALES.some((entry) => entry.tag === value);
}

/** State and actions of the language switch. `save` writes the choice to the profile. */
export function useLanguageChoice(save: SaveLanguage): LanguageChoice {
  const locale = useLocale();
  const language = useLanguage();
  const applyLocale = useApplyLocale();
  const [pending, setPending] = useState<LocaleTag | undefined>(undefined);
  const [failure, setFailure] = useState<unknown>(undefined);
  const busy = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const text = MESSAGES[language];

  useEffect(
    () => () => {
      controller.current?.abort();
    },
    [],
  );

  const choose = useCallback(
    (next: LocaleTag) => {
      if (!isOffered(next) || busy.current || next === locale) return;
      busy.current = true;
      const ctrl = new AbortController();
      controller.current = ctrl;
      setPending(next);
      setFailure(undefined);
      save(next, ctrl.signal).then(
        () => {
          busy.current = false;
          if (ctrl.signal.aborted) return;
          setPending(undefined);
          applyLocale(next);
        },
        (error: unknown) => {
          busy.current = false;
          if (ctrl.signal.aborted) return;
          setPending(undefined);
          setFailure(error ?? new Error('save failed'));
        },
      );
    },
    [applyLocale, locale, save],
  );

  const error =
    failure === undefined
      ? undefined
      : text.failed(failure instanceof ApiError ? userMessage(failure, language) : text.unknown);

  return { locale, pending, error, options: UI_LOCALES, text, choose };
}
