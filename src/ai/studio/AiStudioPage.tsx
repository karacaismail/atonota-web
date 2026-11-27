import { LocalizedXProvider } from '@/app/locale/LocalizedXProvider';
import { Typography } from 'antd';
import { useMemo } from 'react';

import { useViewData } from '@/shell/view-data';

import { MOCK_SOURCE } from '../agent';
import { AiStudio } from './AiStudio';
import { NOT_CONNECTED } from './content';
import { createFlowDemoTransport } from './flowDemo';

/** Yalnız e2e derlemesinde: sahte taşıyıcı açılır. Üretim derlemesinde bu dal yoktur. */
const E2E = import.meta.env.MODE === 'e2e';

/** Yalnız e2e derlemesinde: `?gecikme=<ms>` sahte akışın iki olay arasındaki beklemesini ayarlar. */
function e2eDelayMs(): number {
  if (!E2E || typeof window === 'undefined') return 0;
  const value = Number(new URLSearchParams(window.location.search).get('gecikme'));
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/** Model geçidi bağlantısı yoksa ekran bunu açıkça yazar. Sahte ilerleme gösterilmez. */
function NotConnected() {
  return (
    <section className="ai-not-connected" aria-labelledby="ai-not-connected-title">
      <Typography.Title level={1} id="ai-not-connected-title">
        {NOT_CONNECTED.title}
      </Typography.Title>
      <Typography.Paragraph>{NOT_CONNECTED.body}</Typography.Paragraph>
      <Typography.Paragraph>{NOT_CONNECTED.next}</Typography.Paragraph>
    </section>
  );
}

/**
 * AI Studio sayfası. Kabuk `/panel/ai` yolunda bu dosyayı tembel yükler (`src/shell/routes.ts`).
 * Taşıyıcı kabuğun veri bağlantısından gelir (`ShellViewData.ai`). Kaynak adı ekranda yazar (AX-7).
 * Bağlantı yoksa canlı panel "bağlantı kurulmadı" yazar; sahte ajan çalışmaz.
 * Sahte taşıyıcı yalnız e2e derlemesinde açılır ve "Sahte sunucu" diye yazar.
 * Tarayıcı testleri iptal akışını sınarken sahte akışı `?gecikme=` ile bekletir; üretimde yoktur.
 */
export default function AiStudioPage() {
  const ai = useViewData()?.ai;
  const delayMs = e2eDelayMs();
  const mock = useMemo(
    () => (E2E && !ai ? createFlowDemoTransport(delayMs > 0 ? { delayMs } : {}) : undefined),
    [ai, delayMs],
  );
  return (
    <LocalizedXProvider>
      {ai ? (
        <AiStudio transport={ai.transport} source={ai.source} />
      ) : mock ? (
        <AiStudio transport={mock} source={MOCK_SOURCE} />
      ) : (
        <NotConnected />
      )}
    </LocalizedXProvider>
  );
}
