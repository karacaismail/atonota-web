import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import type { CollectionSource } from '@/views/collection';
import { sampleDefinition } from '@/views/collection/sample';

import type { ShellViewData } from '../view-data';
import { ViewDataProvider } from '../view-data';
import CollectionRoute from './CollectionRoute';

/** Sahte sunucuya gitmeyen yerel kaynak. Tek örnek satır döner. */
const sampleSource: CollectionSource = {
  list: () =>
    Promise.resolve({
      data: [{ name: 'ORNEK-0001', title: 'Örnek veri 1', status: 'Açık', amount: 25 }],
      hasNextPage: false,
    }),
};

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
    const loadDefinition = vi.fn(() => Promise.resolve(sampleDefinition));
    mount({ collection: { loadDefinition, source: sampleSource } });
    expect(await screen.findByText('ORNEK-0001')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Örnek kayıtlar' })).toBeInTheDocument();
    expect(loadDefinition).toHaveBeenCalledWith(
      { module: 'satis', doctype: 'teklif' },
      expect.any(AbortSignal),
    );
  });

  it('kabuk kendi örnek tablosunu çizmez', async () => {
    mount({
      collection: {
        loadDefinition: () => Promise.resolve(sampleDefinition),
        source: sampleSource,
      },
    });
    await screen.findByText('ORNEK-0001');
    expect(screen.queryByText('TEK-0001')).not.toBeInTheDocument();
  });

  it('veri kaynağı bağlı değilse bunu açıkça söyler', () => {
    mount(null);
    expect(screen.getByRole('status')).toHaveTextContent('Veri kaynağı bağlı değil');
  });

  it('tanım alınamazsa hata ve yeniden dene gösterir', async () => {
    mount({
      collection: { loadDefinition: () => Promise.reject(new Error('x')), source: sampleSource },
    });
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Yeniden dene' })).toBeInTheDocument();
  });

  it('sayfa değişince eski tanım isteği iptal edilir (RE-7)', async () => {
    const signals: AbortSignal[] = [];
    const loadDefinition = vi.fn((_: unknown, signal: AbortSignal) => {
      signals.push(signal);
      return new Promise<typeof sampleDefinition>(() => undefined);
    });
    const r = mount({ collection: { loadDefinition, source: sampleSource } });
    r.unmount();
    await waitFor(() => expect(signals[0]?.aborted).toBe(true));
  });
});
