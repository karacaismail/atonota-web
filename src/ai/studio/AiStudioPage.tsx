import { useMemo } from 'react';

import { createMockTransport, MOCK_SOURCE } from '../agent';
import { AiStudio } from './AiStudio';

/** Yalnız e2e derlemesinde: `?gecikme=<ms>` sahte akışın iki olay arasındaki beklemesini ayarlar. */
const E2E = import.meta.env.MODE === 'e2e';

function e2eDelayMs(): number {
  if (!E2E || typeof window === 'undefined') return 0;
  const value = Number(new URLSearchParams(window.location.search).get('gecikme'));
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * AI Studio sayfası. Kabuk `/panel/ai` yolunda bu dosyayı tembel yükler (`src/shell/routes.ts`).
 * Taşıyıcı verilmez. AiStudio sahte taşıyıcıyı kullanır ve kaynağı ekranda gösterir (AX-7).
 * Gerçek model geçidi bağlantısı `api-client` ile sonraki işte kurulur.
 * Tarayıcı testleri iptal akışını sınarken sahte akışı `?gecikme=` ile bekletir; üretimde yoktur.
 */
export default function AiStudioPage() {
  const delayMs = e2eDelayMs();
  const transport = useMemo(
    () => (delayMs > 0 ? createMockTransport({ delayMs }) : undefined),
    [delayMs],
  );
  return transport ? <AiStudio transport={transport} source={MOCK_SOURCE} /> : <AiStudio />;
}
