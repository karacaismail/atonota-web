import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { CollectionView } from './CollectionView';
import { mockServer } from '@/mocks/node';
import { resetMockState } from '@/mocks/handlers';
import { sampleDefinition as exampleDefinition } from './sample';
import { LAZY_VIEW, sampleSource } from './test-support/api';
import { CollectionError } from './types';
import { RESTRICTED_SAMPLE_DOCTYPE } from '@/mocks/fixtures';
import type { CollectionSource, CollectionSummarySource, ListRequest } from './types';
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
function mount(source: CollectionSource = sampleSource(), search = '') {
  return render(
    <MemoryRouter initialEntries={['/' + search]}>
      <CollectionView
        definition={exampleDefinition}
        source={source}
        enableExperimentalCollectionViews
      />
      <LocationProbe />
    </MemoryRouter>,
  );
}
beforeAll(() => {
  mockServer.listen({ onUnhandledFrame: 'error' });
});
afterEach(() => {
  mockServer.resetHandlers();
  resetMockState();
});
afterAll(() => {
  mockServer.close();
});
describe('collection UI', () => {
  it('explains shared URL filters whose fields have no choices', async () => {
    const definition = {
      ...exampleDefinition,
      columns: exampleDefinition.columns.map((field) => ({
        ...field,
        filterable: field.fieldname === 'title' || field.filterable,
      })),
    };
    render(
      <MemoryRouter initialEntries={['/?filter=title&value=Example']}>
        <CollectionView definition={definition} source={sampleSource()} />
      </MemoryRouter>,
    );
    await screen.findByText('Başlık alanında "Example" değeri aranıyor.');
    expect(screen.queryByText('Etkin süzgeç yok.')).not.toBeInTheDocument();
  });
  it('clears selection when the data source identity changes', async () => {
    const mounted = mount();
    await screen.findByText('ORNEK-0001');
    fireEvent.click(screen.getByRole('checkbox', { name: 'ORNEK-0001 seç' }));
    expect(screen.getByRole('toolbar', { name: 'Seçilen kayıtlar' })).toBeInTheDocument();
    mounted.rerender(
      <MemoryRouter>
        <CollectionView definition={exampleDefinition} source={sampleSource()} />
        <LocationProbe />
      </MemoryRouter>,
    );
    await screen.findByText('ORNEK-0001');
    expect(screen.queryByRole('toolbar', { name: 'Seçilen kayıtlar' })).not.toBeInTheDocument();
  });
  it('restores search text with browser history after two searches', async () => {
    const list = vi.fn((request: ListRequest) => {
      const search = request.filters.find(([field]) => field === 'title')?.[2] ?? '';
      return Promise.resolve({
        data: [{ name: search ? 'Arama ' + search.slice(1, -1) : 'İlk kayıt' }],
        hasNextPage: false,
      });
    });
    mount({ list });
    await screen.findByText('İlk kayıt');
    const input = screen.getByRole('textbox', { name: 'Kayıt ara' });
    fireEvent.change(input, { target: { value: 'Örnek 2' } });
    fireEvent.submit(screen.getByRole('search'));
    await screen.findByText('Arama Örnek 2');
    fireEvent.change(input, { target: { value: 'Örnek 3' } });
    fireEvent.submit(screen.getByRole('search'));
    await screen.findByText('Arama Örnek 3');
    fireEvent.click(screen.getByRole('button', { name: 'Geri dön' }));
    await screen.findByText('Arama Örnek 2');
    expect(input).toHaveValue('Örnek 2');
  });
  it('shows loading, then selected-row actions and server pagination', async () => {
    mount();
    expect(screen.getByText('Kayıtlar yükleniyor.')).toBeInTheDocument();
    await screen.findByText('ORNEK-0001');
    fireEvent.click(screen.getByRole('checkbox', { name: 'ORNEK-0001 seç' }));
    expect(screen.getByRole('toolbar', { name: 'Seçilen kayıtlar' })).toHaveTextContent(
      '1 kayıt seçildi',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Sonraki sayfa' }));
    await screen.findByText('ORNEK-0021');
    expect(screen.queryByRole('toolbar', { name: 'Seçilen kayıtlar' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Adres')).toHaveTextContent('page=2');
    fireEvent.click(screen.getByRole('button', { name: 'Geri dön' }));
    await screen.findByText('ORNEK-0001');
  });
  it.each(['table', 'kanban', 'pivot', 'report', 'gantt', 'timesheet'])(
    'shows empty and unauthorized states in %s',
    async (view) => {
      const source: CollectionSource = {
        list: vi.fn().mockResolvedValue({ data: [], hasNextPage: false }),
      };
      const mounted = mount(source, '?view=' + view);
      await screen.findByText('Kayıt bulunamadı.');
      mounted.unmount();
      mount(
        {
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
      .mockResolvedValue({ data: [{ name: 'Recovered' }], hasNextPage: false });
    mount({ list });
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
        data: [{ name: 'New result', title: 'Yeni kayıt' }],
        hasNextPage: false,
      });
    mount({ list });
    fireEvent.change(screen.getByRole('textbox', { name: 'Kayıt ara' }), {
      target: { value: 'Yeni' },
    });
    fireEvent.submit(screen.getByRole('search'));
    await screen.findByText('New result');
    await act(async () => {
      finish?.({ data: [{ name: 'Old result' }], hasNextPage: false });
    });
    expect(screen.queryByText('Old result')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(list).toHaveBeenCalledTimes(2);
    });
  });
  it.each(['kanban', 'pivot', 'report', 'gantt', 'timesheet'])(
    'loads the %s view',
    async (view) => {
      mount(sampleSource(), '?view=' + view);
      await screen.findByRole('region', { name: 'Koleksiyon içeriği' });
      await waitFor(() => {
        expect(document.querySelector('[data-view="' + view + '"]')).toBeInTheDocument();
      }, LAZY_VIEW);
    },
  );
  it('pages with hasNextPage from the shared client and never shows a total', async () => {
    mount();
    await screen.findByText('ORNEK-0001');
    expect(screen.getByRole('navigation', { name: 'Kayıt sayfaları' })).toHaveTextContent(
      '1. sayfa.',
    );
    expect(screen.queryByText(/Toplam/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sonraki sayfa' }));
    await screen.findByText('ORNEK-0023');
    expect(screen.getByRole('button', { name: 'Sonraki sayfa' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Önceki sayfa' })).toBeEnabled();
  });
  it('shows the forbidden state when the server denies the DocType', async () => {
    render(
      <MemoryRouter>
        <CollectionView
          definition={{ ...exampleDefinition, doctype: RESTRICTED_SAMPLE_DOCTYPE }}
          source={sampleSource()}
        />
      </MemoryRouter>,
    );
    await screen.findByText('Bu kayıtları görme yetkiniz yok.');
  });
});

describe('group summary views', () => {
  const summary = {
    groups: [
      { value: 'Açık', count: 16 },
      { value: 'Kapalı', count: 7 },
    ],
    totalCount: 23,
    truncated: false,
  };
  function mountSummary(
    summarySource: CollectionSummarySource | undefined,
    search: string,
    enabled = true,
  ) {
    return render(
      <MemoryRouter initialEntries={['/' + search]}>
        <CollectionView
          definition={exampleDefinition}
          source={sampleSource()}
          summarySource={summarySource}
          enableExperimentalCollectionViews={enabled}
        />
      </MemoryRouter>,
    );
  }
  it.each(['pivot', 'report'])(
    'uses server counts for all matching records in %s',
    async (view) => {
      const groupSummary = vi.fn().mockResolvedValue(summary);
      mountSummary({ groupSummary }, '?view=' + view + '&filter=status&value=Açık');
      await screen.findByText(
        'Özet bütün uygun kayıtları kapsar. Toplam 23 kayıt.',
        undefined,
        LAZY_VIEW,
      );
      expect(screen.queryByText(/yalnız bu sayfadaki/)).not.toBeInTheDocument();
      expect(document.querySelector('[data-view="' + view + '"]')).toHaveTextContent('16');
      expect(groupSummary).toHaveBeenCalledWith(
        {
          doctype: exampleDefinition.doctype,
          groupBy: 'status',
          filters: [['status', '=', 'Açık']],
          limit: 100,
        },
        expect.any(AbortSignal),
      );
    },
  );
  it('says when the server left groups out', async () => {
    mountSummary(
      { groupSummary: vi.fn().mockResolvedValue({ ...summary, truncated: true }) },
      '?view=pivot',
    );
    await screen.findByText(
      'Grup sayısı sınırı aşıldı. Bazı gruplar gösterilmiyor.',
      undefined,
      LAZY_VIEW,
    );
  });
  it('keeps the page-only summary without a summary source', async () => {
    mountSummary(undefined, '?view=pivot');
    await screen.findByText(
      'Özet tablo yalnız bu sayfadaki kayıtları kapsar.',
      undefined,
      LAZY_VIEW,
    );
  });
  it('falls back to the page and hides server details when the summary fails', async () => {
    mountSummary(
      { groupSummary: vi.fn().mockRejectedValue(new Error('private traceback')) },
      '?view=report',
    );
    await screen.findByText(
      'Sunucu özeti alınamadı. Yalnız bu sayfa özetlenir.',
      undefined,
      LAZY_VIEW,
    );
    expect(screen.getByText('Rapor yalnız bu sayfadaki kayıtları kapsar.')).toBeInTheDocument();
    expect(screen.queryByText('private traceback')).not.toBeInTheDocument();
  });
  it('rejects a malformed summary and falls back to the page', async () => {
    mountSummary({ groupSummary: vi.fn().mockResolvedValue({ groups: 'x' }) }, '?view=pivot');
    await screen.findByText(
      'Sunucu özeti alınamadı. Yalnız bu sayfa özetlenir.',
      undefined,
      LAZY_VIEW,
    );
  });
  it('does not request a summary while the views are off or in the table', async () => {
    const groupSummary = vi.fn().mockResolvedValue(summary);
    const first = mountSummary({ groupSummary }, '?view=pivot', false);
    await screen.findByText('ORNEK-0001');
    first.unmount();
    mountSummary({ groupSummary }, '?view=table');
    await screen.findByText('ORNEK-0001');
    expect(groupSummary).not.toHaveBeenCalled();
  });
  it('does not show a summary from a replaced summary source', async () => {
    const definition = exampleDefinition;
    const source = sampleSource();
    const first = { groupSummary: vi.fn().mockResolvedValue(summary) };
    const second = { groupSummary: vi.fn(() => new Promise(() => undefined)) };
    const view = (summarySource: CollectionSummarySource) => (
      <MemoryRouter initialEntries={['/?view=pivot']}>
        <CollectionView
          definition={definition}
          source={source}
          summarySource={summarySource}
          enableExperimentalCollectionViews
        />
      </MemoryRouter>
    );
    const mounted = render(view(first));
    await screen.findByText(
      'Özet bütün uygun kayıtları kapsar. Toplam 23 kayıt.',
      undefined,
      LAZY_VIEW,
    );
    mounted.rerender(view(second));
    await screen.findByText('Sunucu özeti yükleniyor. Şimdilik bu sayfa özetlenir.');
    expect(screen.queryByText(/Toplam 23 kayıt/)).not.toBeInTheDocument();
  });
  it('aborts the summary request when the view unmounts', async () => {
    let signal: AbortSignal | undefined;
    const groupSummary = vi.fn((_request: unknown, abort: AbortSignal) => {
      signal = abort;
      return new Promise(() => undefined);
    });
    const mounted = mountSummary({ groupSummary }, '?view=pivot');
    await waitFor(() => {
      expect(groupSummary).toHaveBeenCalled();
    });
    mounted.unmount();
    expect(signal?.aborted).toBe(true);
  });
});
