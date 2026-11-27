import { XProvider } from '@ant-design/x';
import type { ReactNode } from 'react';

import { useLocaleBundle } from './LanguageProvider';

/**
 * Ant Design X sağlayıcısı. Dil, uygulama dilinin birleşik X nesnesidir.
 * Ayrı dosyadadır: dil bağlamı ilk açılışta iner, X paketi yalnız X kullanan ekranla iner.
 */
export function LocalizedXProvider({ children }: { children: ReactNode }) {
  const { x } = useLocaleBundle();
  return <XProvider locale={x}>{children}</XProvider>;
}
