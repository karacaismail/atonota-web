import '@fontsource-variable/outfit';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { CollectionView } from '../CollectionView';
import { exampleDefinition, exampleSource } from '../example';
import { CollectionError } from '../types';
import type { CollectionSource } from '../types';
import './preview.css';
const params = new URLSearchParams(window.location.search);
const state = params.get('state');
const source: CollectionSource = state
  ? {
      kind: 'example',
      async list(request, signal) {
        if (state === 'loading')
          return new Promise((_resolve, reject) => {
            signal.addEventListener(
              'abort',
              () => {
                reject(new DOMException('Aborted', 'AbortError'));
              },
              { once: true },
            );
          });
        if (state === 'empty') return { data: [], has_next_page: false };
        if (state === 'error' || state === 'unauthorized')
          throw new CollectionError(state, 'Preview');
        return exampleSource.list(request, signal);
      },
    }
  : exampleSource;
const container = document.getElementById('root');
if (!container) throw new Error('Missing preview root');
createRoot(container).render(
  <BrowserRouter>
    <CollectionView
      definition={exampleDefinition}
      source={source}
      mode={params.get('theme') === 'light' ? 'light' : 'dark'}
    />
  </BrowserRouter>,
);
