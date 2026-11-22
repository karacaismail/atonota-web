import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { RecordApiError } from '../adapter';
import { CatalogField } from '../catalog';
import type {
  DocField,
  DocTypeMeta,
  LinkOption,
  LinkSearchParams,
  RecordDataAdapter,
} from '../types';

const BASE_META: DocTypeMeta = {
  schema: {
    name: 'Leave Application',
    module: 'HRMS TR',
    sensitivity: 'standard',
    fields: [],
    title_field: null,
    search_fields: '',
    sort_field: null,
  },
  child_tables: {},
  catalog_version: 2,
  meta_hash: 'aaaa',
  perm_version: 'bbbb',
  mobile_cache_allowed: false,
};

describe('LinkField & Dynamic Link server search (Goal 4, RE-7, Review 2 Finding 7)', () => {
  it('searches on server via antd Select and selects returned option', async () => {
    const user = userEvent.setup();
    const searchLink = vi.fn(async (params: LinkSearchParams): Promise<readonly LinkOption[]> => {
      if (params.txt.includes('Örnek')) {
        return [{ value: 'HR-EMP-001', label: 'Örnek Çalışan', description: 'Mühendislik' }];
      }
      return [{ value: 'HR-EMP-002', label: 'Başka Kayıt', description: 'Operasyon' }];
    });

    const adapter: RecordDataAdapter = {
      getDocTypeMeta: vi.fn(),
      getRecord: vi.fn(),
      saveRecord: vi.fn(),
      searchLink,
    };

    const onChange = vi.fn();
    const linkField: DocField = {
      fieldname: 'employee',
      fieldtype: 'Link',
      label: 'Çalışan',
      options: 'Employee',
      reqd: true,
      read_only: false,
      component: 'link',
      sensitivity: 'standard',
    };

    const { container } = render(
      <CatalogField
        field={linkField}
        value=""
        doc={{ employee: '' }}
        doctype="Leave Application"
        meta={BASE_META}
        adapter={adapter}
        locale="tr"
        onChange={onChange}
      />,
    );

    expect(container.querySelector('select')).toBeNull();

    const combobox = screen.getByRole('combobox', { name: /Çalışan/ });
    await user.click(combobox);
    await user.type(combobox, 'Örnek');

    await waitFor(() => {
      expect(searchLink).toHaveBeenCalledWith(
        expect.objectContaining({
          doctype: 'Employee',
          txt: 'Örnek',
          referenceDoctype: 'Leave Application',
          linkFieldname: 'employee',
        }),
      );
    });

    const option = await screen.findByText('Örnek Çalışan');
    await user.click(option);
    expect(onChange).toHaveBeenCalledWith('employee', 'HR-EMP-001');
  });

  it('shows error message and Retry button instead of "No matching records" when link search fails (Review 2 Finding 7)', async () => {
    const user = userEvent.setup();
    let failSearch = true;

    const searchLink = vi.fn(async (): Promise<readonly LinkOption[]> => {
      if (failSearch) {
        throw new RecordApiError({
          code: 'network',
          message: 'Arama sunucusuna ulaşılamadı.',
        });
      }
      return [{ value: 'EMP-OK', label: 'Kurtarılan Çalışan' }];
    });

    const adapter: RecordDataAdapter = {
      getDocTypeMeta: vi.fn(),
      getRecord: vi.fn(),
      saveRecord: vi.fn(),
      searchLink,
    };

    const linkField: DocField = {
      fieldname: 'approver',
      fieldtype: 'Link',
      label: 'Onaylayıcı',
      options: 'User',
      read_only: false,
      component: 'link',
      sensitivity: 'standard',
    };

    render(
      <CatalogField
        field={linkField}
        value=""
        doc={{ approver: '' }}
        doctype="Leave Application"
        meta={BASE_META}
        adapter={adapter}
        locale="tr"
        onChange={vi.fn()}
      />,
    );

    const combobox = screen.getByRole('combobox', { name: /Onaylayıcı/ });
    await user.click(combobox);

    await screen.findByText('Arama sunucusuna ulaşılamadı.');
    expect(screen.queryByText('Eşleşen kayıt yok')).toBeNull();

    failSearch = false;
    await user.click(screen.getByRole('button', { name: 'Yeniden dene' }));

    await screen.findByText('Kurtarılan Çalışan');
  });

  it('aborts previous search request and ignores stale responses (RE-7)', async () => {
    const user = userEvent.setup();
    const resolvers: {
      txt: string;
      signal: AbortSignal | undefined;
      resolve: (items: readonly LinkOption[]) => void;
    }[] = [];

    const searchLink = vi.fn(
      (params: LinkSearchParams) =>
        new Promise<readonly LinkOption[]>((resolve) => {
          resolvers.push({ txt: params.txt, signal: params.signal, resolve });
        }),
    );

    const adapter: RecordDataAdapter = {
      getDocTypeMeta: vi.fn(),
      getRecord: vi.fn(),
      saveRecord: vi.fn(),
      searchLink,
    };

    const linkField: DocField = {
      fieldname: 'department',
      fieldtype: 'Link',
      label: 'Departman',
      options: 'Department',
      read_only: false,
      component: 'link',
      sensitivity: 'standard',
    };

    render(
      <CatalogField
        field={linkField}
        value=""
        doc={{ department: '' }}
        doctype="Leave Application"
        meta={BASE_META}
        adapter={adapter}
        locale="tr"
        onChange={vi.fn()}
      />,
    );

    const combobox = screen.getByRole('combobox', { name: /Departman/ });
    await user.click(combobox);
    await user.type(combobox, 'AB');

    await waitFor(() => {
      expect(resolvers.length).toBeGreaterThanOrEqual(2);
    });

    const earlier = resolvers[resolvers.length - 2];
    const latest = resolvers[resolvers.length - 1];
    expect(earlier?.signal?.aborted).toBe(true);

    latest?.resolve([{ value: 'DEP-NEW', label: 'Güncel Departman' }]);
    await screen.findByText('Güncel Departman');

    earlier?.resolve([{ value: 'DEP-OLD', label: 'Eski Sonuç' }]);
    expect(screen.queryByText('Eski Sonuç')).toBeNull();
    expect(screen.getByText('Güncel Departman')).toBeInTheDocument();
  });

  it('Dynamic Link disables selection until target DocType field is set and searches target DocType', async () => {
    const user = userEvent.setup();
    const searchLink = vi.fn(async () => [{ value: 'PRJ-10', label: 'Proje On' }]);

    const adapter: RecordDataAdapter = {
      getDocTypeMeta: vi.fn(),
      getRecord: vi.fn(),
      saveRecord: vi.fn(),
      searchLink,
    };

    const dynamicLinkField: DocField = {
      fieldname: 'reference_name',
      fieldtype: 'Dynamic Link',
      label: 'Bağlı Kayıt',
      options: 'reference_doctype',
      read_only: false,
      component: 'dynamic-link',
      sensitivity: 'standard',
    };

    const { rerender } = render(
      <CatalogField
        field={dynamicLinkField}
        value=""
        doc={{ reference_doctype: '' }}
        doctype="Journal Entry"
        meta={BASE_META}
        adapter={adapter}
        locale="tr"
        onChange={vi.fn()}
      />,
    );

    const disabledCombo = screen.getByRole('combobox', { name: /Bağlı Kayıt/ });
    expect(disabledCombo).toBeDisabled();

    rerender(
      <CatalogField
        field={dynamicLinkField}
        value=""
        doc={{ reference_doctype: 'Project' }}
        doctype="Journal Entry"
        meta={BASE_META}
        adapter={adapter}
        locale="tr"
        onChange={vi.fn()}
      />,
    );

    const enabledCombo = screen.getByRole('combobox', { name: /Bağlı Kayıt/ });
    expect(enabledCombo).not.toBeDisabled();
    await user.click(enabledCombo);

    await waitFor(() => {
      expect(searchLink).toHaveBeenCalledWith(
        expect.objectContaining({
          doctype: 'Project',
        }),
      );
    });
  });
});
