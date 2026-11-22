// Sahte sunucunun işçi dosyasını (mockServiceWorker.js) sunar.
//
// Geliştirme sunucusunda dosya her zaman sunulur. `VITE_API_MOCKS=off` ise tarayıcı onu kullanmaz.
// Derlemede dosya yalnız `VITE_API_MOCKS=on` iken üretilir. Kural `src/mocks/start.ts` ile aynıdır.
// Dosya MSW paketinden okunur. Böylece işçinin sürümü paketle aynı kalır.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

import type { Plugin } from 'vite';

const WORKER_FILE = 'mockServiceWorker.js';

function readWorker(): string {
  const require = createRequire(import.meta.url);
  return readFileSync(require.resolve(`msw/${WORKER_FILE}`), 'utf8');
}

export function mockWorkerPlugin(): Plugin {
  let emit = false;
  return {
    name: 'atonota-mock-worker',
    configResolved(config) {
      emit = config.command === 'build' && config.env['VITE_API_MOCKS'] === 'on';
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (new URL(request.url ?? '/', 'http://localhost').pathname !== `/${WORKER_FILE}`) {
          next();
          return;
        }
        response.writeHead(200, {
          'Cache-Control': 'no-cache',
          'Content-Type': 'application/javascript; charset=utf-8',
          'Service-Worker-Allowed': '/',
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
