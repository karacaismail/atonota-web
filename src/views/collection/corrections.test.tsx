import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Link, MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { CollectionView } from './CollectionView';
import { exampleDefinition, exampleSource } from './example';
import { displayCell } from './presentation';
import { CollectionError } from './types';

describe('review corrections', () => {
  it('refetches a cached page after permission revocation instead of showing old data', async () => {
    let finish: ((value: unknown) => void) | undefined;
    const list = vi
      .fn()
      .mockResolvedValueOnce({ data: [{ name: 'Old protected row' }], has_next_page: true })
      .mockRejectedValueOnce(new CollectionError('unauthorized', 'Revoked'))
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      );
    render(
      <MemoryRouter>
        <CollectionView definition={exampleDefinition} source={{ kind: 'api', list }} />
      </MemoryRouter>,
    );
    await screen.findByText('Old protected row');
    fireEvent.click(screen.getByRole('button', { name: 'Sonraki sayfa' }));
    await screen.findByText('Bu kayıtları görme yetkiniz yok.');
    fireEvent.click(screen.getByRole('button', { name: 'Önceki sayfa' }));
    expect(screen.queryByText('Old protected row')).not.toBeInTheDocument();
    await waitFor(() => expect(list).toHaveBeenCalledTimes(3));
    await act(async () => {
      finish?.({ data: [{ name: 'New authorized row' }], has_next_page: false });
    });
    await screen.findByText('New authorized row');
  });
  it('cannot restore a revoked cache through an aborted late response', async () => {
    let late: ((value: unknown) => void) | undefined;
    let fresh: ((value: unknown) => void) | undefined;
    const list = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            late = resolve;
          }),
      )
      .mockRejectedValueOnce(new CollectionError('unauthorized', 'Revoked'))
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            fresh = resolve;
          }),
      );
    render(
      <MemoryRouter>
        <Link to="?page=2">İkinci sayfaya git</Link>
        <CollectionView definition={exampleDefinition} source={{ kind: 'api', list }} />
      </MemoryRouter>,
    );
    await waitFor(() => expect(list).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('link', { name: 'İkinci sayfaya git' }));
    await screen.findByText('Bu kayıtları görme yetkiniz yok.');
    fireEvent.click(screen.getByRole('button', { name: 'Önceki sayfa' }));
    await waitFor(() => expect(list).toHaveBeenCalledTimes(3));
    await act(async () => {
      late?.({ data: [{ name: 'Late protected row' }], has_next_page: false });
    });
    expect(screen.queryByText('Late protected row')).not.toBeInTheDocument();
    expect(screen.getByText('Kayıtlar yükleniyor.')).toBeInTheDocument();
    await act(async () => {
      fresh?.({ data: [{ name: 'Fresh row' }], has_next_page: false });
    });
    await screen.findByText('Fresh row');
    expect(screen.queryByText('Late protected row')).not.toBeInTheDocument();
  });

  it('reuses a validated page when returning within the same collection scope', async () => {
    const list = vi.fn(exampleSource.list);
    render(
      <MemoryRouter>
        <CollectionView definition={exampleDefinition} source={{ kind: 'api', list }} />
      </MemoryRouter>,
    );
    await screen.findByText('EXAMPLE-001');
    fireEvent.click(screen.getByRole('button', { name: 'Sonraki sayfa' }));
    await screen.findByText('EXAMPLE-021');
    fireEvent.click(screen.getByRole('button', { name: 'Önceki sayfa' }));
    await screen.findByText('EXAMPLE-001');
    expect(list).toHaveBeenCalledTimes(2);
  });

  it.each(['kanban', 'pivot', 'report', 'gantt', 'timesheet'])(
    'keeps %s unavailable by default even from a shared URL',
    async (view) => {
      render(
        <MemoryRouter initialEntries={['/?view=' + view]}>
          <CollectionView definition={exampleDefinition} source={exampleSource} />
        </MemoryRouter>,
      );
      await screen.findByText('EXAMPLE-001');
      expect(document.querySelector('[data-view="' + view + '"]')).not.toBeInTheDocument();
      expect(document.querySelector('[data-view="table"]')).toBeInTheDocument();
    },
  );
  it('uses a translated collection label and a level-two section heading', async () => {
    render(
      <MemoryRouter>
        <CollectionView
          definition={{ ...exampleDefinition, label: 'Örnek işler' }}
          source={exampleSource}
        />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'Örnek işler', level: 2 })).toBeInTheDocument();
  });
  it('keeps the previous-page recovery path enabled after a request fails', async () => {
    const list = vi
      .fn()
      .mockRejectedValueOnce(new Error('Unavailable'))
      .mockResolvedValue({ data: [{ name: 'Recovered' }], has_next_page: false });
    render(
      <MemoryRouter initialEntries={['/?page=2']}>
        <CollectionView definition={exampleDefinition} source={{ kind: 'api', list }} />
      </MemoryRouter>,
    );
    await screen.findByText('Kayıtlar yüklenemedi.');
    const button = screen.getByRole('button', { name: 'Önceki sayfa' });
    expect(button).toBeEnabled();
    fireEvent.click(button);
    await screen.findByText('Recovered');
  });
  it('renders unsupported scalar text without JSON quotation marks', () => {
    expect(
      displayCell(
        { name: 'DOC-1', title: '<b>Örnek</b>' },
        {
          fieldname: 'title',
          label: 'Başlık',
          fieldtype: 'Unknown',
          component: null,
          choices: [],
          filterable: false,
          sensitivity: 'standard',
        },
      ),
    ).toBe('<b>Örnek</b>');
  });
  it('preserves keyboard active option when stationary pointer events fire during scroll, while still allowing real mouse motion', async () => {
    render(
      <MemoryRouter>
        <CollectionView
          definition={exampleDefinition}
          source={exampleSource}
          enableExperimentalCollectionViews
        />
      </MemoryRouter>,
    );
    await screen.findByText('EXAMPLE-001');
    const combobox = screen.getByRole('combobox', { name: 'Görünüm' });
    fireEvent.mouseMove(combobox, { clientX: 104, clientY: 231 });
    fireEvent.mouseDown(combobox, { clientX: 104, clientY: 231 });
    fireEvent.focus(combobox);
    fireEvent.keyDown(combobox, { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40, which: 40 });
    await screen.findByRole('listbox');
    expect(combobox).toHaveAttribute('aria-activedescendant', expect.stringMatching(/_0$/));

    fireEvent.keyDown(combobox, { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40, which: 40 });
    expect(combobox).toHaveAttribute('aria-activedescendant', expect.stringMatching(/_1$/));

    const firstOption = screen.getByRole('option', { name: 'Tablo' });
    fireEvent.mouseMove(firstOption, { clientX: 104, clientY: 231 });
    expect(combobox).toHaveAttribute('aria-activedescendant', expect.stringMatching(/_1$/));

    fireEvent.mouseMove(firstOption, { clientX: 140, clientY: 295 });
    expect(combobox).toHaveAttribute('aria-activedescendant', expect.stringMatching(/_0$/));

    fireEvent.keyDown(combobox, { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40, which: 40 });
    fireEvent.mouseMove(firstOption, { clientX: 140, clientY: 295 });
    expect(combobox).toHaveAttribute('aria-activedescendant', expect.stringMatching(/_1$/));

    fireEvent.keyDown(combobox, { key: 'Enter', code: 'Enter', keyCode: 13, which: 13 });
    await screen.findByText('Bu sayfadaki kayıtlar durumlarına göre gruplanır.');
  });
});
