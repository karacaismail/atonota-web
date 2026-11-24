import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { CatalogField } from '../catalog';
import { resolveCatalogEntry } from '../catalogRegistry';
import type { DocField, DocTypeMeta, RecordDataAdapter } from '../types';

/**
 * Arka uç Small Text, Text ve Long Text alanları için `text-area` bileşen adını yollar
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

function textField(overrides: Partial<DocField> = {}): DocField {
  return {
    fieldname: 'aciklama',
    fieldtype: 'Small Text',
    label: 'Açıklama',
    read_only: false,
    component: 'text-area',
    sensitivity: 'standard',
    ...overrides,
  };
}

function stubAdapter(): RecordDataAdapter {
  return { getDocTypeMeta: vi.fn(), getRecord: vi.fn(), saveRecord: vi.fn(), searchLink: vi.fn() };
}

describe('çok satırlı metin alanı: arka ucun text-area bileşen adı', () => {
  it.each(['Small Text', 'Text', 'Long Text'])(
    '%s alanı text-area adıyla desteklenir',
    (fieldtype) => {
      const entry = resolveCatalogEntry({ fieldtype, component: 'text-area' });
      expect(entry.supported).toBe(true);
      expect(entry.canonicalType).toBe(fieldtype);
    },
  );

  it('düzenlenebilir Small Text alanı çok satırlı metin kutusu olur', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <CatalogField
        field={textField()}
        value={'Birinci satır\nİkinci satır'}
        doc={{ aciklama: 'Birinci satır\nİkinci satır' }}
        doctype="Örnek Kayıt"
        meta={META}
        adapter={stubAdapter()}
        locale="tr"
        onChange={onChange}
      />,
    );

    expect(screen.queryByText(/Desteklenmeyen alan/)).toBeNull();
    const box = screen.getByRole('textbox', { name: /Açıklama/ });
    expect(box.tagName).toBe('TEXTAREA');
    expect(box).toHaveValue('Birinci satır\nİkinci satır');
    expect(box).not.toHaveAttribute('readonly');
    await user.type(box, '!');
    expect(onChange).toHaveBeenCalledWith('aciklama', 'Birinci satır\nİkinci satır!');
  });

  it('salt okunur Small Text alanı metni okunur biçimde gösterir', () => {
    render(
      <CatalogField
        field={textField({ read_only: true })}
        value="İzin nedeni"
        doc={{ aciklama: 'İzin nedeni' }}
        doctype="Örnek Kayıt"
        meta={META}
        adapter={stubAdapter()}
        locale="tr"
        onChange={vi.fn()}
      />,
    );

    expect(screen.queryByText(/Desteklenmeyen alan/)).toBeNull();
    const box = screen.getByRole('textbox', { name: /Açıklama/ });
    expect(box).toHaveValue('İzin nedeni');
    expect(box).toHaveAttribute('readonly');
  });
});
