/**
 * Dil eşleme dosyası. Ant Design ve Day.js dil nesneleri yalnız burada içe aktarılır.
 * Bileşenler dili `useLanguage` ve `useLocaleBundle` kancalarından alır (IC-12).
 * Yeni dil eklenince yalnız bu dosya ve `language.ts` değişir.
 */
import enUS from 'antd/locale/en_US';
import trTR from 'antd/locale/tr_TR';
import type { Locale as AntdLocale } from 'antd/es/locale';
import 'dayjs/locale/tr';

import type { AppLanguage } from './language';

/**
 * Ant Design X dil nesnesi. X 1.6.1 sürümü kendi dil alanını taşımaz; bileşenleri antd dilini kullanır.
 * Bu yüzden X nesnesi aynı dildeki antd nesnesidir. X sürümü dil alanı getirirse alanlar buraya eklenir.
 */
export type XLocale = AntdLocale;

export interface LocaleBundle {
  /** Ant Design `ConfigProvider` dil nesnesi. */
  antd: AntdLocale;
  /** Ant Design X `XProvider` dil nesnesi. antd alanlarıyla birleşiktir. */
  x: XLocale;
  /** Day.js dil adı. Dil dosyası bu modülde yüklenir. */
  dayjs: string;
}

/** Ant Design X'in kendi dil alanları. Bu sürümde boştur. */
const X_FIELDS: Record<AppLanguage, Partial<XLocale>> = { tr: {}, en: {} };

const ANTD: Record<AppLanguage, AntdLocale> = { tr: trTR, en: enUS };

/** `en` Day.js içinde gömülüdür. `tr` yukarıda yüklenir. */
const DAYJS: Record<AppLanguage, string> = { tr: 'tr', en: 'en' };

const BUNDLES = Object.fromEntries(
  (Object.keys(ANTD) as AppLanguage[]).map((language) => [
    language,
    {
      antd: ANTD[language],
      x: { ...ANTD[language], ...X_FIELDS[language] },
      dayjs: DAYJS[language],
    },
  ]),
) as Record<AppLanguage, LocaleBundle>;

/** Bir dilin antd, Ant Design X ve Day.js nesneleri. */
export function localeBundle(language: AppLanguage): LocaleBundle {
  return BUNDLES[language];
}
