import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { exampleDefinition, exampleSource } from '@/views/collection/example';

import type { ShellViewData } from '../view-data';
import { ViewDataProvider } from '../view-data';
import CollectionRoute from './CollectionRoute';

function mount(data: ShellViewData | null, path = '/satis/teklif') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ViewDataProvider value={data}>
        <Routes>
          <Route path="/:module/:doctype" element={<CollectionRoute />} />
        </Routes>
      </ViewDataProvider>
    </MemoryRouter>,
  );
}

describe('CollectionRoute', () => {
  it('koleksiyonu views-collection CollectionView bileşeniyle çizer', async () => {
    const loadDefinition = vi.fn(() => Promise.resolve(exampleDefinition));
    mount({ collection: { loadDefinition, source: exampleSource } });
    expect(await screen.findByText('EXAMPLE-001')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Örnek işler' })).toBeInTheDocument();
    expect(loadDefinition).toHaveBeenCalledWith(
      { module: 'satis', doctype: 'teklif' },
      expect.any(AbortSignal),
    );
  });

  it('kabuk kendi örnek tablosunu çizmez', async () => {
    mount({
      collection: {
        loadDefinition: () => Promise.resolve(exampleDefinition),
        source: exampleSource,
      },
    });
    await screen.findByText('EXAMPLE-001');
    expect(screen.queryByText('TEK-0001')).not.toBeInTheDocument();
  });

  it('veri kaynağı bağlı değilse bunu açıkça söyler', () => {
    mount(null);
    expect(screen.getByRole('status')).toHaveTextContent('Veri kaynağı bağlı değil');
  });

  it('tanım alınamazsa hata ve yeniden dene gösterir', async () => {
    mount({
      collection: { loadDefinition: () => Promise.reject(new Error('x')), source: exampleSource },
    });
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Yeniden dene' })).toBeInTheDocument();
  });

  it('sayfa değişince eski tanım isteği iptal edilir (RE-7)', async () => {
    const signals: AbortSignal[] = [];
    const loadDefinition = vi.fn((_: unknown, signal: AbortSignal) => {
      signals.push(signal);
      return new Promise<typeof exampleDefinition>(() => undefined);
    });
    const r = mount({ collection: { loadDefinition, source: exampleSource } });
    r.unmount();
    await waitFor(() => expect(signals[0]?.aborted).toBe(true));
  });
});
