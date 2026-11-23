import { globSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

import { e2eEnvDefine } from './vite/e2e-env.ts';
import { mockWorkerPlugin } from './vite/mock-worker-plugin.ts';
import { runtimeDesignSource } from './vite/runtime-design-source.ts';

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

/** `vi.mock('@ant-design/x')` kullanan kabuk testleri. Bkz. aşağıdaki `projects` açıklaması. */
const ANTD_X_MOCK_TESTS = [
  'src/shell/layout/AppShell.test.tsx',
  'src/shell/shellRoutes.test.tsx',
  'src/shell/sidebar/Sidebar.test.tsx',
];

export default defineConfig(({ mode }) => ({
  // mockWorkerPlugin: sahte sunucunun işçi dosyasını yalnız gerektiğinde sunar (vite/mock-worker-plugin.ts).
  plugins: [react(), mockWorkerPlugin()],
  define: {
    __RUNTIME_DESIGN_SOURCE__: JSON.stringify(runtimeDesignSource),
    // e2e kipinin sahte sunucu ve Keycloak değerleri (vite/e2e-env.ts). Depoda `.env` dosyası yoktur.
    ...e2eEnvDefine(mode),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@design-source': fileURLToPath(new URL('./design/source', import.meta.url)),
    },
  },
  build: {
    // Derleme bildirgesi (.vite/manifest.json): parça ve bağımlılık listesi. Yetenek bazlı teslim
    // testleri (adaptive, modules) bununla sayfanın yalnız kendi parçalarını indirdiğini doğrular.
    manifest: true,
    rolldownOptions: {
      ...(mode === 'e2e' ? { input: e2eInputs() } : {}),
      output: {
        // Paket parçalama: kitaplıklar ayrı parçadır; sürüm değişince yalnız ilgili parça iner.
        // Sayfalar ve kabuk tembel `import()` ile kendi parçasına düşer (App.tsx ve shell rotaları).
        codeSplitting: {
          groups: [
            { name: 'react', test: /node_modules\/(react|react-dom|scheduler)\// },
            { name: 'router', test: /node_modules\/(react-router|react-router-dom)\// },
            // antd bileşenlerini kullanan rotalar belirler. Ant Design X grubu bunları kendine çekmez.
            {
              name: 'antd-x',
              test: /node_modules\/@ant-design\/x\//,
              includeDependenciesRecursively: false,
            },
            { name: 'icons', test: /node_modules\/@phosphor-icons\// },
          ],
        },
      },
    },
  },
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
    // paketlemektir (optimizer). Üç kabuk testi ise @ant-design/x paketini vi.mock ile taklit eder;
    // taklit ile önceden paketleme birlikte çalışmaz. Yalnız bu üç dosya "shell" projesinde koşar.
    // Öteki kabuk testleri (örneğin rota yükleyicileri AI Studio sayfasını açar) "app" projesindedir.
    // Kabuk taklidi kalkınca "shell" projesi silinir.
    projects: [
      {
        extends: true,
        test: {
          name: 'shell',
          include: ANTD_X_MOCK_TESTS,
          exclude: ['node_modules', 'dist', '**/e2e/**'],
        },
      },
      {
        extends: true,
        test: {
          name: 'app',
          include: ['src/**/*.test.{ts,tsx}'],
          exclude: ['node_modules', 'dist', '**/e2e/**', ...ANTD_X_MOCK_TESTS],
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
