import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { CollectionView } from './CollectionView';
import { exampleDefinition, exampleSource } from './example';
import { CollectionError } from './types';
import type { CollectionSource } from './types';
function LocationProbe() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <output aria-label="Adres">{location.search}</output>
      <button
        onClick={() => {
          void navigate(-1);
        }}
      >
        Geri dön
      </button>
    </>
  );
}
function mount(source: CollectionSource = exampleSource, search = '') {
  return render(
    <MemoryRouter initialEntries={['/' + search]}>
      <CollectionView definition={exampleDefinition} source={source} />
      <LocationProbe />
    </MemoryRouter>,
  );
}
describe('collection UI', () => {
  it('clears selection when the data source identity changes', async () => {
    const mounted = mount();
    await screen.findByText('EXAMPLE-001');
    fireEvent.click(screen.getByRole('checkbox', { name: 'EXAMPLE-001 seç' }));
    expect(screen.getByRole('toolbar', { name: 'Seçilen kayıtlar' })).toBeInTheDocument();
    mounted.rerender(
      <MemoryRouter>
        <CollectionView definition={exampleDefinition} source={{ ...exampleSource }} />
        <LocationProbe />
      </MemoryRouter>,
    );
    await screen.findByText('EXAMPLE-001');
    expect(screen.queryByRole('toolbar', { name: 'Seçilen kayıtlar' })).not.toBeInTheDocument();
  });
  it('restores search text with browser history after two searches', async () => {
    mount();
    await screen.findByText('EXAMPLE-001');
    const input = screen.getByRole('textbox', { name: 'Kayıt ara' });
    fireEvent.change(input, { target: { value: 'Örnek iş 2' } });
    fireEvent.submit(screen.getByRole('search'));
    await screen.findByText('EXAMPLE-002');
    fireEvent.change(input, { target: { value: 'Örnek iş 3' } });
    fireEvent.submit(screen.getByRole('search'));
    await screen.findByText('EXAMPLE-003');
    fireEvent.click(screen.getByRole('button', { name: 'Geri dön' }));
    await screen.findByText('EXAMPLE-002');
    expect(input).toHaveValue('Örnek iş 2');
  });
  it('shows loading, then selected-row actions and server pagination', async () => {
    mount();
    expect(screen.getByText('Kayıtlar yükleniyor.')).toBeInTheDocument();
    await screen.findByText('EXAMPLE-001');
    fireEvent.click(screen.getByRole('checkbox', { name: 'EXAMPLE-001 seç' }));
    expect(screen.getByRole('toolbar', { name: 'Seçilen kayıtlar' })).toHaveTextContent(
      '1 kayıt seçildi',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Sonraki sayfa' }));
    await screen.findByText('EXAMPLE-021');
    expect(screen.queryByRole('toolbar', { name: 'Seçilen kayıtlar' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Adres')).toHaveTextContent('page=2');
    fireEvent.click(screen.getByRole('button', { name: 'Geri dön' }));
    await screen.findByText('EXAMPLE-001');
  });
  it.each(['table', 'kanban', 'pivot', 'report', 'gantt', 'timesheet'])(
    'shows empty and unauthorized states in %s',
    async (view) => {
      const source: CollectionSource = {
        kind: 'api',
        list: vi.fn().mockResolvedValue({ data: [], has_next_page: false }),
      };
      const mounted = mount(source, '?view=' + view);
      await screen.findByText('Kayıt bulunamadı.');
      mounted.unmount();
      mount(
        {
          kind: 'api',
          list: vi
            .fn()
            .mockRejectedValue(new CollectionError('unauthorized', 'secret server detail')),
        },
        '?view=' + view,
      );
      await screen.findByText('Bu kayıtları görme yetkiniz yok.');
      expect(screen.queryByText('secret server detail')).not.toBeInTheDocument();
    },
  );
  it('retries failed requests without displaying server details', async () => {
    const list = vi
      .fn()
      .mockRejectedValueOnce(new Error('private traceback'))
      .mockResolvedValue({ data: [{ name: 'Recovered' }], has_next_page: false });
    mount({ kind: 'api', list });
    await screen.findByText('Kayıtlar yüklenemedi.');
    fireEvent.click(screen.getByRole('button', { name: 'Yeniden dene' }));
    await screen.findByText('Recovered');
    expect(list).toHaveBeenCalledTimes(2);
  });
  it('ignores an older response after URL query changes', async () => {
    let finish: ((value: unknown) => void) | undefined;
    const list = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      )
      .mockResolvedValue({
        data: [{ name: 'New result', subject: 'Yeni kayıt' }],
        has_next_page: false,
      });
    mount({ kind: 'api', list });
    fireEvent.change(screen.getByRole('textbox', { name: 'Kayıt ara' }), {
      target: { value: 'Yeni' },
    });
    fireEvent.submit(screen.getByRole('search'));
    await screen.findByText('New result');
    await act(async () => {
      finish?.({ data: [{ name: 'Old result' }], has_next_page: false });
    });
    expect(screen.queryByText('Old result')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(list).toHaveBeenCalledTimes(2);
    });
  });
  it.each(['kanban', 'pivot', 'report', 'gantt', 'timesheet'])(
    'loads the %s view',
    async (view) => {
      mount(exampleSource, '?view=' + view);
      await screen.findByRole('region', { name: 'Koleksiyon içeriği' });
      await waitFor(() => {
        expect(document.querySelector('[data-view="' + view + '"]')).toBeInTheDocument();
      });
      expect(screen.getByText('Örnek veri')).toBeInTheDocument();
    },
  );
});
