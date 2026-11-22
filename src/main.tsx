import '@fontsource-variable/outfit';
import '@fontsource/jetbrains-mono/400.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from '@/app/App';
import { SampleDataNotice } from '@/mocks/SampleDataNotice';
import { startApiMocks } from '@/mocks/start';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Kök öğe bulunamadı: #root');
}
const root = container;

// Sahte sunucu açıksa API isteklerinden önce başlar.
const mocks = await startApiMocks();

createRoot(root).render(
  <StrictMode>
    {mocks.active ? <SampleDataNotice /> : null}
    <App />
  </StrictMode>,
);
