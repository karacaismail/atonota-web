// Sahte sunucunun işçi dosyasını (mockServiceWorker.js) sunar.
//
// Geliştirme sunucusunda dosya her zaman sunulur. `VITE_API_MOCKS=off` ise tarayıcı onu kullanmaz.
// Derlemede dosya yalnız `VITE_API_MOCKS=on` iken ya da e2e kipinde üretilir. Kural `src/mocks/start.ts` ile aynıdır.
// Dosya MSW paketinden okunur. Böylece işçinin sürümü paketle aynı kalır.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

import type { Plugin } from 'vite';

import { e2eEnv } from './e2e-env.ts';

const WORKER_FILE = 'mockServiceWorker.js';

function readWorker(): string {
  const require = createRequire(import.meta.url);
  return readFileSync(require.resolve(`msw/${WORKER_FILE}`), 'utf8');
}

export function mockWorkerPlugin(): Plugin {
  let emit = false;
  let base = '/';
  return {
    name: 'atonota-mock-worker',
    configResolved(config) {
      base = config.base;
      // e2e kipinde değer `vite/e2e-env.ts` dosyasından da gelebilir. Ortamdaki değer önce gelir.
      const mocks = config.env['VITE_API_MOCKS'] ?? e2eEnv(config.mode)['VITE_API_MOCKS'];
      emit = config.command === 'build' && mocks === 'on';
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        // Geliştirme sunucusu `base` yolunda çalışır. İşçi de o yolda sunulur.
        if (new URL(request.url ?? '/', 'http://localhost').pathname !== `${base}${WORKER_FILE}`) {
          next();
          return;
        }
        response.writeHead(200, {
          'Cache-Control': 'no-cache',
          'Content-Type': 'application/javascript; charset=utf-8',
          'Service-Worker-Allowed': base,
        });
        response.end(readWorker());
      });
    },
    generateBundle() {
      if (!emit) return;
      this.emitFile({ type: 'asset', fileName: WORKER_FILE, source: readWorker() });
    },
  };
}
