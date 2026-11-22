import { globSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

import { mockWorkerPlugin } from './vite/mock-worker-plugin.ts';

/**
 * e2e derlemesi (`vite build --mode e2e`): işlerin bağımsız deneme sayfaları da pakete girer.
 * Kural: `src/<iş>/preview/index.html` ya da `src/<iş>/harness/index.html`. Önizleme sunucusu bu
 * sayfaları aynı yolda sunar; örnek: /src/views/collection/preview/. Üretim derlemesine girmezler.
 */
function e2eInputs(): Record<string, string> {
  const extra = globSync('src/**/{preview,harness}/index.html', {
    exclude: (p) => p.includes('node_modules'),
  });
  return Object.fromEntries([
    ['main', 'index.html'],
    ...extra.map((p) => [p.replace(/\/index\.html$/, '').replace(/\//g, '-'), p]),
  ]);
}

export default defineConfig(({ mode }) => ({
  // mockWorkerPlugin: sahte sunucunun işçi dosyasını yalnız gerektiğinde sunar (vite/mock-worker-plugin.ts).
  plugins: [react(), mockWorkerPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@design-source': fileURLToPath(new URL('./design/source', import.meta.url)),
    },
  },
  build: mode === 'e2e' ? { rolldownOptions: { input: e2eInputs() } } : {},
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['tests/setup/vitest.setup.ts'],
    css: false,
    restoreMocks: true,
    // Tek birim test kapısı: bütün src/**/*.test.{ts,tsx} dosyaları koşar.
    // İki proje vardır. Neden: @ant-design/x paketi CJS derlemesinde bile antd/es dosyalarını ister;
    // Node 24 bunu "antd/es/version" dizin içe aktarımında reddeder. Çözüm paketi önceden
    // paketlemektir (optimizer). Kabuk testleri ise @ant-design/x paketini vi.mock ile taklit eder;
    // taklit ile önceden paketleme birlikte çalışmaz. Kabuk taklidi kalkınca "shell" projesi silinir.
    projects: [
      {
        extends: true,
        test: {
          name: 'shell',
          include: ['src/shell/**/*.test.{ts,tsx}'],
          exclude: ['node_modules', 'dist', '**/e2e/**'],
        },
      },
      {
        extends: true,
        test: {
          name: 'app',
          include: ['src/**/*.test.{ts,tsx}'],
          exclude: ['node_modules', 'dist', '**/e2e/**', 'src/shell/**'],
          deps: {
            optimizer: {
              client: { enabled: true, include: ['antd', '@ant-design/x'] },
            },
          },
        },
      },
    ],
  },
}));
