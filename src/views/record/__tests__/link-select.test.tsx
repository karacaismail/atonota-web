import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { CatalogField } from '../catalog';
import { resolveCatalogEntry } from '../catalogRegistry';
import { RecordLinkProvider, type RecordLinkRenderer } from '../recordLink';
import type { DocField, DocTypeMeta, LinkOption, RecordDataAdapter } from '../types';

/**
 * Arka uç bağlantı alanı için `link-select` bileşen adını yollar
 * (`platform_core/shell/catalog.py`, FIELD_COMPONENTS). Arayüz bu adı tanımalıdır.
 */
const META: DocTypeMeta = {
  schema: {
    name: 'Örnek Kayıt',
    module: 'Örnek',
    sensitivity: 'standard',
    fields: [],
    title_field: 'title',
    search_fields: 'title',
    sort_field: null,
  },
  child_tables: {},
  catalog_version: 2,
  meta_hash: 'aaaa',
  perm_version: 'bbbb',
  mobile_cache_allowed: false,
};

function linkField(overrides: Partial<DocField> = {}): DocField {
  return {
    fieldname: 'ilgili_kayit',
    fieldtype: 'Link',
    label: 'İlgili kayıt',
    options: 'Örnek Kayıt',
    read_only: false,
    component: 'link-select',
    sensitivity: 'standard',
    ...overrides,
  };
}

function adapterWith(searchLink: RecordDataAdapter['searchLink']): RecordDataAdapter {
  return { getDocTypeMeta: vi.fn(), getRecord: vi.fn(), saveRecord: vi.fn(), searchLink };
}

const renderLink: RecordLinkRenderer = (target, children) => (
  <a href={`/ornek/${encodeURIComponent(target.doctype)}/${encodeURIComponent(target.name)}`}>
    {children}
  </a>
);

describe('bağlantı alanı: arka ucun link-select bileşen adı', () => {
  it('Link alanı link-select adıyla desteklenir', () => {
    const entry = resolveCatalogEntry({ fieldtype: 'Link', component: 'link-select' });
    expect(entry.supported).toBe(true);
    expect(entry.canonicalType).toBe('Link');
  });

  it('Dynamic Link bu işte desteklenmez; link-select adıyla da desteklenmeyen alan kalır', () => {
    const entry = resolveCatalogEntry({ fieldtype: 'Dynamic Link', component: 'link-select' });
    expect(entry.supported).toBe(false);
  });

  it('düzenlemede "Desteklenmeyen alan" yerine arayan seçim alanı çizilir', async () => {
    const user = userEvent.setup();
    const searchLink = vi.fn(async (): Promise<readonly LinkOption[]> => [
      { value: 'ORNEK-0002', label: 'Örnek veri 2' },
    ]);
    const onChange = vi.fn();
    render(
      <CatalogField
        field={linkField()}
        value=""
        doc={{ ilgili_kayit: '' }}
        doctype="Örnek Kayıt"
        meta={META}
        adapter={adapterWith(searchLink)}
        locale="tr"
        onChange={onChange}
      />,
    );

    expect(screen.queryByText(/Desteklenmeyen alan/)).toBeNull();
    const combobox = screen.getByRole('combobox', { name: /İlgili kayıt/ });
    await user.click(combobox);
    await user.keyboard('veri');
    await waitFor(() =>
      expect(searchLink).toHaveBeenCalledWith(
        expect.objectContaining({ doctype: 'Örnek Kayıt', txt: 'veri' }),
      ),
    );
    await screen.findByText('Örnek veri 2');
    // Klavyeyle seçim: ilk seçenek etkin olur, Enter seçer.
    await user.keyboard('{ArrowDown}{Enter}');
    expect(onChange).toHaveBeenCalledWith('ilgili_kayit', 'ORNEK-0002');
  });
});

describe('bağlantı alanı: salt okunur görünüm', () => {
  it('hedef kaydın adını bağlantı olarak gösterir ve sunucuya istek atmaz', () => {
    const searchLink = vi.fn();
    render(
      <RecordLinkProvider value={renderLink}>
        <CatalogField
          field={linkField({ read_only: true })}
          value="ORNEK-0001"
          doc={{ ilgili_kayit: 'ORNEK-0001' }}
          doctype="Örnek Kayıt"
          meta={META}
          adapter={adapterWith(searchLink)}
          locale="tr"
          onChange={vi.fn()}
        />
      </RecordLinkProvider>,
    );

    const link = screen.getByRole('link', { name: 'ORNEK-0001' });
    expect(link.getAttribute('href')).toBe(
      `/ornek/${encodeURIComponent('Örnek Kayıt')}/ORNEK-0001`,
    );
    expect(screen.queryByRole('combobox')).toBeNull();
    // Salt okunur görünüm hedef kaydın başka bilgisini istemez. İzni olmayan kayıt sızmaz.
    expect(searchLink).not.toHaveBeenCalled();
  });

  it('bağlantı kurucusu yoksa adı düz metin olarak gösterir', () => {
    render(
      <CatalogField
        field={linkField({ read_only: true })}
        value="ORNEK-0001"
        doc={{ ilgili_kayit: 'ORNEK-0001' }}
        doctype="Örnek Kayıt"
        meta={META}
        adapter={adapterWith(vi.fn())}
        locale="tr"
        onChange={vi.fn()}
      />,
    );
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('ORNEK-0001')).toBeTruthy();
  });

  it('değer boşsa boş işareti gösterir ve bağlantı çizmez', () => {
    render(
      <RecordLinkProvider value={renderLink}>
        <CatalogField
          field={linkField({ read_only: true })}
          value={null}
          doc={{ ilgili_kayit: null }}
          doctype="Örnek Kayıt"
          meta={META}
          adapter={adapterWith(vi.fn())}
          locale="tr"
          onChange={vi.fn()}
        />
      </RecordLinkProvider>,
    );
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('—')).toBeTruthy();
  });
});
