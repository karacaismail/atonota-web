/**
 * The locale map file. Ant Design and Day.js locale objects are imported only here.
 * Components get the language from the `useLanguage` and `useLocaleBundle` hooks (IC-12).
 * When a new locale is added, only this file and `language.ts` change.
 */
import deDE from 'antd/locale/de_DE';
import enGB from 'antd/locale/en_GB';
import trTR from 'antd/locale/tr_TR';
import type { Locale as AntdLocale } from 'antd/es/locale';
import 'dayjs/locale/de';
import 'dayjs/locale/en-gb';
import 'dayjs/locale/tr';

import { UI_LOCALES, defaultLocaleOf, type AppLanguage, type LocaleTag } from './language';

/**
 * Ant Design X locale object. X 1.6.1 has no locale fields of its own; its components use the antd locale.
 * So the X object is the antd object for the same language. If an X release adds locale fields, add them here.
 */
export type XLocale = AntdLocale;

export interface LocaleBundle {
  /** Ant Design `ConfigProvider` locale object. */
  antd: AntdLocale;
  /** Ant Design X `XProvider` locale object. Merged with the antd fields. */
  x: XLocale;
  /** Day.js locale name. The locale file is loaded in this module. */
  dayjs: string;
  /** Language tag for `Intl` formats. Dates, numbers, currency and lists are formatted with this tag (IC-13). */
  intl: string;
}

/** Ant Design X's own locale fields. Empty in this version. */
const X_FIELDS: Record<LocaleTag, Partial<XLocale>> = { 'en-GB': {}, 'tr-TR': {}, 'de-DE': {} };

/**
 * The UI's English is British English (AJA-1407). So `en-GB` uses the `en-GB` packages.
 * Example: the week starts on Monday, dates are written `27/11/2026`, and time uses the 24-hour clock.
 */
const ANTD: Record<LocaleTag, AntdLocale> = { 'en-GB': enGB, 'tr-TR': trTR, 'de-DE': deDE };

/** Day.js locale names. All locales are loaded above. */
const DAYJS: Record<LocaleTag, string> = { 'en-GB': 'en-gb', 'tr-TR': 'tr', 'de-DE': 'de' };

const BUNDLES = Object.fromEntries(
  UI_LOCALES.map(({ tag }) => [
    tag,
    {
      antd: ANTD[tag],
      x: { ...ANTD[tag], ...X_FIELDS[tag] },
      dayjs: DAYJS[tag],
      // The `Intl` tag is the locale tag itself.
      intl: tag,
    },
  ]),
) as Record<LocaleTag, LocaleBundle>;

/**
 * The antd, Ant Design X, Day.js and `Intl` objects for a locale tag.
 * A catalogue language uses its default locale. Example: `en` -> `en-GB`.
 */
export function localeBundle(locale: AppLanguage | LocaleTag): LocaleBundle {
  return BUNDLES[
    locale in BUNDLES ? (locale as LocaleTag) : defaultLocaleOf(locale as AppLanguage)
  ];
}
