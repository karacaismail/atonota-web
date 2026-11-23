// Geliştirmede tarayıcıda çalışan sahte sunucu.
// Yalnız `import.meta.env.DEV` koşulunda dinamik olarak yükleyin. Üretim paketine girmez.
import { setupWorker } from 'msw/browser';

import { SAMPLE_CSRF_TOKEN } from './fixtures';
import { handlers } from './handlers';
import { isMockedApiRequest } from './start';

/** Sahte sunucuyu başlatır. Dönen CSRF değeri örnektir ve yalnız sahte sunucuda geçerlidir. */
export async function startMockWorker(): Promise<{ csrfToken: string }> {
  const worker = setupWorker(...handlers);
  await worker.start({
    quiet: true,
    /**
     * Yalnız `/api/` istekleri sahte sunucuya aittir. Karşılığı yoksa istek hata alır ve ağa
     * çıkmaz. Sayfa ve statik dosya istekleri işçiden olduğu gibi geçer. Hazır "error" kuralı
     * sayfa yenilemesini de hataya düşürüyordu: işçi sayfayı denetlerken sayfa isteği kuralı
     * karşılamıyor, ekranda yalnız bir JSON hata metni kalıyordu.
     */
    onUnhandledFrame({ frame, defaults }) {
      if (frame.protocol !== 'http') return;
      const { request } = frame.data as { request: Request };
      if (!isMockedApiRequest(request.url)) return;
      defaults.error();
      throw new Error(
        `Sahte sunucuda karşılığı olmayan API isteği: ${request.method} ${request.url}`,
      );
    },
  });
  return { csrfToken: SAMPLE_CSRF_TOKEN };
}
