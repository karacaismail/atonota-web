// Geliştirmede tarayıcıda çalışan sahte sunucu.
// Yalnız `import.meta.env.DEV` koşulunda dinamik olarak yükleyin. Üretim paketine girmez.
import { setupWorker } from 'msw/browser';

import { SAMPLE_CSRF_TOKEN } from './fixtures';
import { handlers } from './handlers';
import { isGuardedUrl, realServerLogLine } from './real-server';
import { applyMockScenario, readMockScenario } from './scenarios';
import { isMockedApiRequest } from './start';
import { mockWorkerOptions } from './worker-url';

/** Sahte sunucuyu başlatır. Dönen CSRF değeri örnektir ve yalnız sahte sunucuda geçerlidir. */
export async function startMockWorker(): Promise<{ csrfToken: string }> {
  // Tarayıcı testi bir senaryo seçtiyse sahte sunucu ona göre yanıt verir.
  applyMockScenario(readMockScenario());
  const worker = setupWorker(...handlers);
  await worker.start({
    quiet: true,
    // İşçi panel yolundadır: kökte `/mockServiceWorker.js`, canlı yolda `/panel/mockServiceWorker.js`.
    serviceWorker: mockWorkerOptions(import.meta.env.BASE_URL),
    /**
     * Yalnız `/api/` istekleri sahte sunucuya aittir. Karşılığı yoksa istek hata alır ve ağa
     * çıkmaz. Sayfa ve statik dosya istekleri işçiden olduğu gibi geçer. Hazır "error" kuralı
     * sayfa yenilemesini de hataya düşürüyordu: işçi sayfayı denetlerken sayfa isteği kuralı
     * karşılamıyor, ekranda yalnız bir JSON hata metni kalıyordu.
     *
     * `atonota.net` isteği ağa geçmez. İşçi isteği ağ hatasına düşürür ve günlüğe yazar.
     * WebKit'te Playwright işçinin geçirdiği isteği görmez. Tarayıcı testleri bu kaydı okur:
     * `tests/setup/playwright-fixtures.ts`.
     */
    onUnhandledFrame({ frame, defaults }) {
      if (frame.protocol !== 'http') return;
      const { request } = frame.data as { request: Request };
      if (isGuardedUrl(new URL(request.url))) {
        console.error(realServerLogLine(request.method, request.url));
        // MSW, fırlatılan yanıtı istemciye verir. `Response.error()` ağ hatasıdır.
        throw Response.error();
      }
      if (!isMockedApiRequest(request.url)) return;
      defaults.error();
      throw new Error(
        `Sahte sunucuda karşılığı olmayan API isteği: ${request.method} ${request.url}`,
      );
    },
  });
  return { csrfToken: SAMPLE_CSRF_TOKEN };
}
