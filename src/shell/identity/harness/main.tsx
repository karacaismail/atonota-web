/** Isolated test entry. Vite includes harness entries only in the e2e build. */
import '@fontsource-variable/outfit';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { AppProviders } from '@/app/AppProviders';
import { AppShell } from '../../layout/AppShell';
import { ViewDataProvider } from '../../view-data';
import '../../shell.css';

const params = new URLSearchParams(window.location.search);
const mode = params.get('environment') === 'live' ? 'live' : 'example';
const theme = params.get('theme') === 'dark' ? 'dark' : 'light';
const tenant =
  params.get('tenant') === 'long'
    ? 'Örnek Şirket İnsan Kaynakları ve Yönetim Çalışma Alanı'
    : 'Örnek Şirket';
const root = document.getElementById('root');
if (!root) throw new Error('Missing test root');

createRoot(root).render(
  <AppProviders initialThemeChoice={theme}>
    <MemoryRouter>
      <ViewDataProvider
        value={{
          workspaces: { current: 'example', items: [{ id: 'example', name: tenant }] },
          modules: { tenant: 'example.test', user: 'example', mode },
          navigation: {
            loadSidebars: async () => [],
            loadReadable: async () => new Set(['Leave Application']),
          },
        }}
      >
        <AppShell>
          <div className="shell-page">
            <h1>Kimlik şeridi denemesi</h1>
          </div>
        </AppShell>
      </ViewDataProvider>
    </MemoryRouter>
  </AppProviders>,
);
