import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { RecordApiError } from '../adapter';
import { RecordErrorBoundary, RecordView } from '../index';
import type { DocTypeMeta, RecordDataAdapter, RecordDocument } from '../types';

const SAMPLE_META: DocTypeMeta = {
  schema: {
    name: 'Leave Application',
    module: 'HRMS TR',
    sensitivity: 'standard',
    title_field: 'employee_name',
    search_fields: 'employee_name',
    sort_field: 'modified',
    fields: [
      {
        fieldname: 'general_tab',
        fieldtype: 'Tab Break',
        label: 'Detay',
        read_only: false,
        component: 'tab',
        sensitivity: 'standard',
      },
      {
        fieldname: 'main_section',
        fieldtype: 'Section Break',
        label: 'Başvuru Bilgileri',
        collapsible: true,
        read_only: false,
        component: 'section',
        sensitivity: 'standard',
      },
      {
        fieldname: 'employee_name',
        fieldtype: 'Data',
        label: 'Çalışan Adı',
        reqd: true,
        read_only: false,
        component: 'input',
        sensitivity: 'standard',
      },
      {
        fieldname: 'col_1',
        fieldtype: 'Column Break',
        read_only: false,
        component: 'column',
        sensitivity: 'standard',
      },
      {
        fieldname: 'description',
        fieldtype: 'Small Text',
        label: 'Açıklama',
        read_only: false,
        component: 'small-text',
        sensitivity: 'standard',
      },
      {
        fieldname: 'extra_tab',
        fieldtype: 'Tab Break',
        label: 'Ek Bilgiler',
        read_only: false,
        component: 'tab',
        sensitivity: 'standard',
      },
      {
        fieldname: 'total_leave_days',
        fieldtype: 'Float',
        label: 'Toplam Gün',
        non_negative: true,
        read_only: false,
        component: 'float',
        sensitivity: 'standard',
      },
    ],
  },
  child_tables: {},
  catalog_version: 2,
  meta_hash: 'aaaa',
  perm_version: 'bbbb',
  mobile_cache_allowed: false,
};

const SAMPLE_RECORD: RecordDocument = {
  name: 'HR-LAP-TEST-01',
  modified: '2026-11-22 09:00:00.000001',
  docstatus: 0,
  employee_name: 'Örnek Kişi',
  description: 'Yıllık izin talebi',
  total_leave_days: 2,
};

function createMockAdapter(overrides?: Partial<RecordDataAdapter>): RecordDataAdapter {
  return {
    getDocTypeMeta: vi.fn(async () => SAMPLE_META),
    getRecord: vi.fn(async () => SAMPLE_RECORD),
    saveRecord: vi.fn(async (params) => ({
      ...SAMPLE_RECORD,
      ...params.data,
      name: params.name ?? SAMPLE_RECORD.name,
      modified: '2026-11-22 10:00:00.000001',
    })),
    searchLink: vi.fn(async () => []),
    ...overrides,
  };
}

describe('RecordView four states, record type checking, and error boundary (RE-1, RE-6, SZ-4, Goal 5)', () => {
  it('renders loading, error with retry, empty, and unauthorized states', async () => {
    const user = userEvent.setup();
    let shouldFail = true;

    const getRecord = vi.fn(async () => {
      if (shouldFail) {
        throw new RecordApiError({
          code: 'network',
          message: 'Sunucuya ulaşılamadı.',
        });
      }
      return SAMPLE_RECORD;
    });

    const adapter = createMockAdapter({ getRecord });

    const { rerender } = render(
      <RecordView doctype="Leave Application" name="HR-LAP-TEST-01" adapter={adapter} />,
    );

    expect(screen.getByText('Kayıt yükleniyor...')).toBeInTheDocument();

    await screen.findByText('Kayıt yüklenemedi');
    expect(screen.getByText('Sunucuya ulaşılamadı.')).toBeInTheDocument();

    shouldFail = false;
    await user.click(screen.getByRole('button', { name: 'Yeniden dene' }));

    await screen.findByDisplayValue('Örnek Kişi');

    rerender(<RecordView doctype="Leave Application" adapter={adapter} />);
    await screen.findByText('Gösterilecek kayıt yok');

    const unauthorizedAdapter = createMockAdapter({
      getRecord: vi.fn(async () => {
        throw new RecordApiError({
          code: 'unauthorized',
          status: 403,
          message: 'Bu kaydı görüntüleme yetkiniz bulunmuyor.',
        });
      }),
    });

    rerender(
      <RecordView doctype="Leave Application" name="HR-LAP-SECRET" adapter={unauthorizedAdapter} />,
    );
    await screen.findByText('Erişim izni yok');
    expect(screen.getByText('Bu kaydı görüntüleme yetkiniz bulunmuyor.')).toBeInTheDocument();
  });

  it('rejects record payload when a field value violates its DocType fieldtype (Review 1 Finding 5)', async () => {
    const malformedRecordAdapter = createMockAdapter({
      getRecord: vi.fn(async () => ({
        ...SAMPLE_RECORD,
        total_leave_days: { unexpectedObject: true },
      })),
    });

    render(
      <RecordView doctype="Leave Application" name="HR-LAP-BAD" adapter={malformedRecordAdapter} />,
    );

    await screen.findByText('Kayıt yüklenemedi');
    expect(screen.getByText(/Sunucu yanıtı beklenen sözleşmeyle uyuşmadı/)).toBeInTheDocument();
  });

  it('shows catalog version warning and unsupported fallback when server sends higher catalog_version (Review 1 Finding 1 & Review 2 Minor 5)', async () => {
    const user = userEvent.setup();
    const futureCatalogAdapter = createMockAdapter({
      getDocTypeMeta: vi.fn(async () => ({
        ...SAMPLE_META,
        catalog_version: 999,
        schema: {
          ...SAMPLE_META.schema,
          fields: [
            ...SAMPLE_META.schema.fields,
            {
              fieldname: 'future_widget',
              fieldtype: 'Totally Unknown',
              label: 'Gelecek Alanı',
              read_only: false,
              component: 'future-widget',
              sensitivity: 'standard' as const,
            },
          ],
        },
      })),
    });

    render(
      <RecordView
        doctype="Leave Application"
        name="HR-LAP-TEST-01"
        adapter={futureCatalogAdapter}
      />,
    );

    await screen.findByDisplayValue('Örnek Kişi');
    expect(screen.getByText(/katalog s999/)).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Ek Bilgiler' }));
    expect(screen.getByText('Desteklenmeyen alan (Totally Unknown)')).toBeInTheDocument();
  });

  it('keeps keyboard focus modality off on mouse click and enables it only on Tab / Shift+Tab (Review 2 Finding 8)', async () => {
    const adapter = createMockAdapter();
    const { container } = render(
      <RecordView doctype="Leave Application" name="HR-LAP-TEST-01" adapter={adapter} />,
    );

    await screen.findByDisplayValue('Örnek Kişi');
    const root = container.querySelector('.rv-root');
    expect(root).toHaveAttribute('data-rv-kbd', 'false');

    const nameInput = screen.getByLabelText(/Çalışan Adı/);
    fireEvent.pointerDown(nameInput);
    nameInput.focus();
    expect(root).toHaveAttribute('data-rv-kbd', 'false');

    fireEvent.keyDown(nameInput, { key: 'Tab' });
    expect(root).toHaveAttribute('data-rv-kbd', 'true');

    fireEvent.pointerDown(nameInput);
    expect(root).toHaveAttribute('data-rv-kbd', 'false');
  });

  it('catches rendering crashes inside RecordErrorBoundary without exposing raw stack trace (RE-1)', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    function BrokenChild(): never {
      throw new Error('INTERNAL_STACK_SECRET_TOKEN_XYZ');
    }

    render(
      <RecordErrorBoundary locale="tr">
        <BrokenChild />
      </RecordErrorBoundary>,
    );

    expect(screen.getByText('Bu form görüntülenemedi')).toBeInTheDocument();
    expect(screen.queryByText(/INTERNAL_STACK_SECRET_TOKEN_XYZ/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Görünümü yenile' })).toBeInTheDocument();

    consoleSpy.mockRestore();
  });
});

describe('RecordView navigator, dirty state, Discard/Save, createMode, and conflict draft preservation (Goals 2 & 3, SZ-11, AD-10)', () => {
  it('displays "‹ 3 / 1.284 ›" navigator, tracks dirty count, and discards or saves with modified', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    const saveRecord = vi.fn(async (params) => ({
      ...SAMPLE_RECORD,
      ...params.data,
      modified: '2026-11-22 11:30:00.000001',
    }));
    const adapter = createMockAdapter({ saveRecord });

    render(
      <RecordView
        doctype="Leave Application"
        name="HR-LAP-TEST-01"
        adapter={adapter}
        navigator={{
          currentIndex: 3,
          totalCount: 1284,
          onNavigate,
        }}
      />,
    );

    await screen.findByDisplayValue('Örnek Kişi');

    expect(screen.getByText('3 / 1.284')).toBeInTheDocument();
    const nextBtn = screen.getByRole('button', { name: 'Sonraki kayıt' });
    await user.click(nextBtn);
    expect(onNavigate).toHaveBeenCalledWith(4);

    const nameInput = screen.getByLabelText(/Çalışan Adı/);
    const descInput = screen.getByLabelText(/Açıklama/);
    await user.clear(nameInput);
    await user.type(nameInput, 'Örnek Çalışan İki');
    await user.clear(descInput);
    await user.type(descInput, 'Güncellenmiş açıklama');

    expect(screen.getByText('2 kaydedilmemiş değişiklik')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Vazgeç' }));
    expect(screen.getByDisplayValue('Örnek Kişi')).toBeInTheDocument();
    expect(screen.queryByText(/kaydedilmemiş değişiklik/)).toBeNull();

    await user.clear(descInput);
    await user.type(descInput, 'Onay için açıklama');
    expect(screen.getByText('1 kaydedilmemiş değişiklik')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Kaydet' }));

    await waitFor(() => {
      expect(saveRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          doctype: 'Leave Application',
          name: 'HR-LAP-TEST-01',
          modified: '2026-11-22 09:00:00.000001',
          data: expect.objectContaining({
            description: 'Onay için açıklama',
          }),
        }),
      );
    });
  });

  it('supports createMode for new records without modified version (Review 1 Minor 5)', async () => {
    const user = userEvent.setup();
    const saveRecord = vi.fn(async (params) => ({
      name: 'HR-LAP-NEW-01',
      modified: '2026-11-22 14:00:00.000001',
      docstatus: 0 as const,
      ...params.data,
    }));
    const adapter = createMockAdapter({ saveRecord });

    render(<RecordView doctype="Leave Application" createMode adapter={adapter} />);

    const nameInput = await screen.findByLabelText(/Çalışan Adı/);
    await user.type(nameInput, 'Yeni Örnek Kişi');
    await user.click(screen.getByRole('button', { name: 'Kaydet' }));

    await waitFor(() => {
      expect(saveRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          doctype: 'Leave Application',
          name: undefined,
          data: expect.objectContaining({
            employee_name: 'Yeni Örnek Kişi',
          }),
        }),
      );
    });
  });

  it('preserves user draft on TimestampMismatchError conflict and shows newer server version (SZ-11)', async () => {
    const user = userEvent.setup();
    let getCallCount = 0;

    const getRecord = vi.fn(async () => {
      getCallCount += 1;
      if (getCallCount === 1) {
        return SAMPLE_RECORD;
      }
      return {
        ...SAMPLE_RECORD,
        description: 'Başka kullanıcının kaydı',
        modified: '2026-11-22 12:45:00.000001',
      };
    });

    const saveRecord = vi.fn(async () => {
      throw new RecordApiError({
        code: 'conflict',
        status: 417,
        message: 'Belge başka bir oturumda güncellendi.',
      });
    });

    const adapter = createMockAdapter({ getRecord, saveRecord });

    render(<RecordView doctype="Leave Application" name="HR-LAP-TEST-01" adapter={adapter} />);

    await screen.findByDisplayValue('Örnek Kişi');

    const descInput = screen.getByLabelText(/Açıklama/);
    await user.clear(descInput);
    await user.type(descInput, 'Korunacak önemli taslağım');

    await user.click(screen.getByRole('button', { name: 'Kaydet' }));

    await screen.findByText('Kayıt sunucuda değişti');
    expect(screen.getByDisplayValue('Korunacak önemli taslağım')).toBeInTheDocument();
    expect(screen.getByText(/2026-11-22 12:45:00\.000001/)).toBeInTheDocument();
  });

  it('cancels stale record request when navigating quickly between records (RE-7)', async () => {
    const resolvers: {
      name: string;
      signal: AbortSignal | undefined;
      resolve: (doc: RecordDocument) => void;
    }[] = [];

    const getRecord = vi.fn(
      (params: { doctype: string; name: string; signal?: AbortSignal | undefined }) =>
        new Promise<RecordDocument>((resolve) => {
          resolvers.push({ name: params.name, signal: params.signal, resolve });
        }),
    );

    const adapter = createMockAdapter({ getRecord });

    const { rerender } = render(
      <RecordView doctype="Leave Application" name="REC-OLD" adapter={adapter} />,
    );

    await waitFor(() => {
      expect(resolvers).toHaveLength(1);
    });

    rerender(<RecordView doctype="Leave Application" name="REC-NEW" adapter={adapter} />);

    await waitFor(() => {
      expect(resolvers).toHaveLength(2);
    });

    expect(resolvers[0]?.signal?.aborted).toBe(true);

    resolvers[1]?.resolve({
      ...SAMPLE_RECORD,
      name: 'REC-NEW',
      employee_name: 'Yeni Kayıt Sahibi',
    });

    await screen.findByDisplayValue('Yeni Kayıt Sahibi');

    resolvers[0]?.resolve({
      ...SAMPLE_RECORD,
      name: 'REC-OLD',
      employee_name: 'Eski Kayıt Sahibi',
    });

    expect(screen.queryByDisplayValue('Eski Kayıt Sahibi')).toBeNull();
    expect(screen.getByDisplayValue('Yeni Kayıt Sahibi')).toBeInTheDocument();
  });
});
