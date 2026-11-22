import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { CollectionView } from './CollectionView';
import { exampleDefinition, exampleSource } from './example';
import { displayCell } from './presentation';

describe('review corrections', () => {
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
});
