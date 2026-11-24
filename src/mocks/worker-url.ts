// Sahte sunucu işçisinin adresi ve kapsamı. İşçi dosyası derlemenin kökündedir.
// Panel `/panel/` altında sunulursa işçi de orada olur (vite/mock-worker-plugin.ts).

export const MOCK_WORKER_FILE = 'mockServiceWorker.js';

export function mockWorkerOptions(base: string): { url: string; options: { scope: string } } {
  const root = base.endsWith('/') ? base : `${base}/`;
  return { url: `${root}${MOCK_WORKER_FILE}`, options: { scope: root } };
}
