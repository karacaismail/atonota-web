import '@fontsource-variable/outfit';
import '@fontsource/jetbrains-mono/400.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from '@/app/App';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Kök öğe bulunamadı: #root');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
