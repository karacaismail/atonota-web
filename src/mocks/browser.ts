// Geliştirmede tarayıcıda çalışan sahte sunucu.
// Yalnız `import.meta.env.DEV` koşulunda dinamik olarak yükleyin. Üretim paketine girmez.
import { setupWorker } from 'msw/browser';

import { SAMPLE_CSRF_TOKEN } from './fixtures';
import { handlers } from './handlers';

/** Sahte sunucuyu başlatır. Dönen CSRF değeri örnektir ve yalnız sahte sunucuda geçerlidir. */
export async function startMockWorker(): Promise<{ csrfToken: string }> {
  const worker = setupWorker(...handlers);
  await worker.start({ onUnhandledFrame: 'error', quiet: true });
  return { csrfToken: SAMPLE_CSRF_TOKEN };
}
