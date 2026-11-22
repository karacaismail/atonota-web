import '@fontsource-variable/outfit';
import '@fontsource/jetbrains-mono/400.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from '@/app/App';
import { AuthGate, createPlatformSession } from '@/auth';
import { SampleDataNotice } from '@/mocks/SampleDataNotice';
import { startApiMocks } from '@/mocks/start';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Kök öğe bulunamadı: #root');
}
const root = container;

// Sahte sunucu açıksa API isteklerinden önce başlar.
const mocks = await startApiMocks();

// Oturum bir kez kurulur. Tarayıcı erişim belirteci tutmaz (bkz. src/auth/README.md).
const session = createPlatformSession({
  env: import.meta.env,
  origin: window.location.origin,
  document,
  navigate: (url) => window.location.assign(url),
  currentPath: () => window.location.pathname + window.location.search,
  // Sahte sunucu açıkken örnek CSRF değeri buradan gelir.
  ...(mocks.active ? { csrfToken: mocks.csrfToken } : {}),
});

createRoot(root).render(
  <StrictMode>
    {mocks.active ? <SampleDataNotice /> : null}
    <AuthGate session={session}>
      <App />
    </AuthGate>
  </StrictMode>,
);
