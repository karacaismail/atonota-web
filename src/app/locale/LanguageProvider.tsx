import dayjs from 'dayjs';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { FALLBACK_LANGUAGE, resolveLanguage, type AppLanguage } from './language';
import { localeBundle, type LocaleBundle } from './locale-map';

interface LanguageState {
  language: AppLanguage;
  /** Açılış verisindeki ham dili alır. Boş dil yedek dile düşer. */
  setLanguage: (raw: string | null | undefined) => void;
}

/**
 * Sağlayıcı yoksa yedek dil geçerlidir. Örnek: bileşen tek başına sınanır.
 * Bu durumda dil değiştirilemez.
 */
const LanguageContext = createContext<LanguageState>({
  language: FALLBACK_LANGUAGE,
  setLanguage: () => undefined,
});

/**
 * Uygulamanın tek dil bağlamı. Dil, açılış verisindeki kullanıcı dilinden gelir.
 * Oturum açılmadan önce dil yedek dildir.
 */
export function LanguageProvider({
  initialLanguage,
  children,
}: {
  initialLanguage?: string | null | undefined;
  children: ReactNode;
}) {
  const [language, setResolved] = useState<AppLanguage>(() => resolveLanguage(initialLanguage));
  const value = useMemo<LanguageState>(
    () => ({ language, setLanguage: (raw) => setResolved(resolveLanguage(raw)) }),
    [language],
  );
  // Day.js dili genel bir ayardır. Çocuklar çizilmeden önce kurulur; tarih seçici ilk çizimde doğru dili alır.
  // Çağrı aynı dille tekrarlansa da sonuç değişmez.
  dayjs.locale(localeBundle(language).dayjs);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

function useLanguageState(): LanguageState {
  return useContext(LanguageContext);
}

/** Arayüzün geçerli dili. */
export function useLanguage(): AppLanguage {
  return useLanguageState().language;
}

/** Açılış verisi gelince dili değiştiren işlev. */
export function useSetLanguage(): LanguageState['setLanguage'] {
  return useLanguageState().setLanguage;
}

/** Geçerli dilin antd, Ant Design X ve Day.js nesneleri. */
export function useLocaleBundle(): LocaleBundle {
  return localeBundle(useLanguage());
}
