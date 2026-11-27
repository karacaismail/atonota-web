import '@fontsource-variable/outfit';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { createApiClient, createCsrfStore, readApiConfig } from '@/api';
import { RESTRICTED_SAMPLE_DOCTYPE, SAMPLE_CSRF_TOKEN } from '@/mocks/fixtures';
import { SampleDataNotice } from '@/mocks/SampleDataNotice';
import { createApiSource } from '../api-source';
import { CollectionView } from '../CollectionView';
import { sampleDefinition } from '../sample';
import type { CollectionSource } from '../types';
import { TemporaryFoundation } from './TemporaryFoundation';
import './preview.css';

/**
 * The preview uses the shared API client. Records come from the shared mock server handlers (MSW).
 * `@/mocks/start` starts the worker with `onUnhandledFrame: 'error'`. While the worker controls
 * the page, that setting rejects a second page load (HTML and file requests). So the preview
 * starts the worker with the same handlers but with `bypass`. Use `startApiMocks` once the
 * shared file is fixed.
 */
async function startPreviewMocks(): Promise<boolean> {
  if (!(import.meta.env.DEV || import.meta.env.VITE_API_MOCKS === 'on')) return false;
  const [{ setupWorker }, { handlers }] = await Promise.all([
    import('msw/browser'),
    import('@/mocks/handlers'),
  ]);
  await setupWorker(...handlers).start({ onUnhandledFrame: 'bypass', quiet: true });
  return true;
}
const mocks = { active: await startPreviewMocks(), csrfToken: SAMPLE_CSRF_TOKEN };
const params = new URLSearchParams(window.location.search);
const state = params.get('state');
const api = createApiSource(
  createApiClient({
    config: readApiConfig({}, window.location.origin),
    csrf: createCsrfStore(mocks.active ? mocks.csrfToken : undefined),
  }),
);
// The loading, empty and error states are chosen by hand only in the preview.
const source: CollectionSource =
  state === 'loading'
    ? {
        list: (_request, signal) =>
          new Promise((_resolve, reject) => {
            signal.addEventListener(
              'abort',
              () => {
                reject(new DOMException('Aborted', 'AbortError'));
              },
              { once: true },
            );
          }),
      }
    : state === 'empty'
      ? { list: () => Promise.resolve({ data: [], hasNextPage: false }) }
      : state === 'error'
        ? { list: () => Promise.reject(new Error('Önizleme hatası')) }
        : api;
const definition =
  state === 'unauthorized'
    ? { ...sampleDefinition, doctype: RESTRICTED_SAMPLE_DOCTYPE }
    : sampleDefinition;
const mode = params.get('theme') === 'light' ? 'light' : 'dark';
const container = document.getElementById('root');
if (!container) throw new Error('Missing preview root');
createRoot(container).render(
  <TemporaryFoundation mode={mode}>
    {mocks.active ? <SampleDataNotice /> : null}
    <BrowserRouter>
      <CollectionView
        enableExperimentalCollectionViews={params.get('experimentalViews') === '1'}
        definition={definition}
        source={source}
        mode={mode}
      />
    </BrowserRouter>
  </TemporaryFoundation>,
);
