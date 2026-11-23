import { build, preview } from 'vite';
import process from 'node:process';
// Önizleme sahte sunucuyu (MSW) kullanır. Gerçek arka uca bağlanmaz.
process.env.VITE_API_MOCKS ??= 'on';
await build({
  configFile: 'vite.config.ts',
  build: {
    outDir: '.pane/qa/collection-dist',
    emptyOutDir: true,
    manifest: true,
    rollupOptions: { input: 'src/views/collection/preview/index.html' },
  },
});
await preview({
  configFile: 'vite.config.ts',
  build: { outDir: '.pane/qa/collection-dist' },
  preview: { host: '127.0.0.1', port: 4319, strictPort: true },
});
