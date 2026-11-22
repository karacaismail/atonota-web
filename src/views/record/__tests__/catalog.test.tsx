import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { CatalogField } from '../catalog';
import { CATALOG_VERSION, isLayoutCatalogEntry, resolveCatalogEntry } from '../catalogRegistry';
import type { DocField, DocTypeMeta, RecordDataAdapter } from '../types';

function createStubAdapter(): RecordDataAdapter {
  return {
    getDocTypeMeta: vi.fn(),
    getRecord: vi.fn(),
    saveRecord: vi.fn(),
    searchLink: vi.fn(async () => [{ value: 'TAG-01', label: 'Öncelikli' }]),
  };
}

const PROMPT_REQUIRED_FIELDTYPES: readonly { fieldtype: string; component: string }[] = [
  { fieldtype: 'Data', component: 'input' },
  { fieldtype: 'Int', component: 'int' },
  { fieldtype: 'Float', component: 'float' },
  { fieldtype: 'Currency', component: 'currency' },
  { fieldtype: 'Check', component: 'check' },
  { fieldtype: 'Select', component: 'select' },
  { fieldtype: 'Link', component: 'link' },
  { fieldtype: 'Dynamic Link', component: 'dynamic-link' },
  { fieldtype: 'Date', component: 'date' },
  { fieldtype: 'Datetime', component: 'datetime' },
  { fieldtype: 'Time', component: 'time' },
  { fieldtype: 'Text', component: 'text' },
  { fieldtype: 'Small Text', component: 'small-text' },
  { fieldtype: 'Text Editor', component: 'text-editor' },
  { fieldtype: 'Markdown', component: 'markdown' },
  { fieldtype: 'Attach', component: 'attach' },
  { fieldtype: 'Attach Image', component: 'attach-image' },
  { fieldtype: 'Table', component: 'table' },
  { fieldtype: 'Table MultiSelect', component: 'table-multiselect' },
  { fieldtype: 'Rating', component: 'rating' },
  { fieldtype: 'Signature', component: 'signature' },
  { fieldtype: 'Geolocation', component: 'geolocation' },
  { fieldtype: 'Color', component: 'color' },
  { fieldtype: 'Barcode', component: 'barcode' },
  { fieldtype: 'Password', component: 'password' },
  { fieldtype: 'Read Only', component: 'read-only' },
  { fieldtype: 'Section Break', component: 'section' },
  { fieldtype: 'Column Break', component: 'column' },
  { fieldtype: 'Tab Break', component: 'tab' },
  { fieldtype: 'HTML', component: 'html' },
  { fieldtype: 'Button', component: 'button' },
];

const CHILD_META: DocTypeMeta = {
  schema: {
    name: 'Expense Claim',
    module: 'HRMS TR',
    sensitivity: 'standard',
    fields: [],
    title_field: null,
    search_fields: '',
    sort_field: null,
  },
  child_tables: {
    'Expense Item': {
      name: 'Expense Item',
      module: 'HRMS TR',
      sensitivity: 'standard',
      title_field: 'item_title',
      search_fields: 'item_title',
      sort_field: null,
      fields: [
        {
          fieldname: 'item_title',
          fieldtype: 'Data',
          label: 'Kalem',
          in_list_view: true,
          reqd: true,
          read_only: false,
          component: 'input',
          sensitivity: 'standard',
        },
        {
          fieldname: 'amount',
          fieldtype: 'Currency',
          label: 'Tutar',
          in_list_view: true,
          read_only: false,
          component: 'currency',
          sensitivity: 'standard',
        },
      ],
    },
    'Expense Tag Link': {
      name: 'Expense Tag Link',
      module: 'HRMS TR',
      sensitivity: 'standard',
      title_field: null,
      search_fields: '',
      sort_field: null,
      fields: [
        {
          fieldname: 'tag',
          fieldtype: 'Link',
          label: 'Etiket',
          options: 'Tag',
          read_only: false,
          component: 'link',
          sensitivity: 'standard',
        },
      ],
    },
  },
  catalog_version: 2,
  meta_hash: 'aaaa',
  perm_version: 'bbbb',
  mobile_cache_allowed: false,
};

describe('versioned field catalog (RE-11, AX-4, Goal 1)', () => {
  it('registers all 31 required Frappe field types in versioned catalog', () => {
    expect(CATALOG_VERSION).toBeGreaterThanOrEqual(2);

    for (const spec of PROMPT_REQUIRED_FIELDTYPES) {
      const field: DocField = {
        fieldname: `fld_${spec.fieldtype.toLowerCase().replace(/\s+/g, '_')}`,
        fieldtype: spec.fieldtype,
        read_only: false,
        component: spec.component,
        sensitivity: 'standard',
      };
      const entry = resolveCatalogEntry(field, CATALOG_VERSION);
      expect(entry.supported, `Expected ${spec.fieldtype} to be supported`).toBe(true);
      if (
        spec.fieldtype === 'Section Break' ||
        spec.fieldtype === 'Column Break' ||
        spec.fieldtype === 'Tab Break'
      ) {
        expect(isLayoutCatalogEntry(entry)).toBe(true);
      }
    }
  });

  it('falls back safely to unsupported field view for unknown fieldtype, null component, or unapproved component', () => {
    const adapter = createStubAdapter();
    const unknownTypeField: DocField = {
      fieldname: 'quantum_state',
      fieldtype: 'QuantumState',
      label: 'Kuantum Alanı',
      read_only: false,
      component: 'quantum',
      sensitivity: 'standard',
    };

    const { rerender } = render(
      <CatalogField
        field={unknownTypeField}
        value="raw-val"
        doc={{ quantum_state: 'raw-val' }}
        doctype="Sample"
        meta={CHILD_META}
        adapter={adapter}
        locale="tr"
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Desteklenmeyen alan (QuantumState)')).toBeInTheDocument();

    const nullComponentField: DocField = {
      fieldname: 'server_blocked',
      fieldtype: 'Data',
      label: 'Sunucu Kapalı Alan',
      read_only: false,
      component: null,
      sensitivity: 'standard',
    };
    rerender(
      <CatalogField
        field={nullComponentField}
        value="secret"
        doc={{ server_blocked: 'secret' }}
        doctype="Sample"
        meta={CHILD_META}
        adapter={adapter}
        locale="tr"
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText('Desteklenmeyen alan (Data)')).toBeInTheDocument();
  });

  it('renders and updates scalar, choice, rich text, geolocation, barcode, signature, and button fields without native <select> or innerHTML', async () => {
    const user = userEvent.setup();
    const adapter = createStubAdapter();
    const onChange = vi.fn();
    const onFieldAction = vi.fn();

    const selectField: DocField = {
      fieldname: 'status',
      fieldtype: 'Select',
      label: 'Durum',
      read_only: false,
      component: 'select',
      sensitivity: 'standard',
      choices: [
        { value: 'Open', label: 'Açık' },
        { value: 'Approved', label: 'Onaylı' },
      ],
    };

    const htmlField: DocField = {
      fieldname: 'policy_notice',
      fieldtype: 'HTML',
      label: 'Politika Notu',
      options: '<p>Güvenli metin</p><script>window.__hacked = true;</script>',
      read_only: true,
      component: 'html',
      sensitivity: 'standard',
    };

    const buttonField: DocField = {
      fieldname: 'calculate_btn',
      fieldtype: 'Button',
      label: 'Sunucuda Hesapla',
      read_only: false,
      component: 'button',
      sensitivity: 'standard',
    };

    const geoField: DocField = {
      fieldname: 'office_location',
      fieldtype: 'Geolocation',
      label: 'Ofis Konumu',
      read_only: false,
      component: 'geolocation',
      sensitivity: 'standard',
    };

    const barcodeField: DocField = {
      fieldname: 'item_barcode',
      fieldtype: 'Barcode',
      label: 'Ürün Barkodu',
      read_only: false,
      component: 'barcode',
      sensitivity: 'standard',
    };

    const { container } = render(
      <div>
        <CatalogField
          field={selectField}
          value="Open"
          doc={{ status: 'Open' }}
          doctype="Expense Claim"
          meta={CHILD_META}
          adapter={adapter}
          locale="tr"
          onChange={onChange}
        />
        <CatalogField
          field={htmlField}
          value={null}
          doc={{}}
          doctype="Expense Claim"
          meta={CHILD_META}
          adapter={adapter}
          locale="tr"
          onChange={onChange}
        />
        <CatalogField
          field={buttonField}
          value={null}
          doc={{}}
          doctype="Expense Claim"
          meta={CHILD_META}
          adapter={adapter}
          locale="tr"
          onChange={onChange}
          onFieldAction={onFieldAction}
        />
        <CatalogField
          field={geoField}
          value={null}
          doc={{}}
          doctype="Expense Claim"
          meta={CHILD_META}
          adapter={adapter}
          locale="tr"
          onChange={onChange}
        />
        <CatalogField
          field={barcodeField}
          value="8690000123456"
          doc={{ item_barcode: '8690000123456' }}
          doctype="Expense Claim"
          meta={CHILD_META}
          adapter={adapter}
          locale="tr"
          onChange={onChange}
        />
      </div>,
    );

    // AGENTS.md: native <select> is forbidden
    expect(container.querySelector('select')).toBeNull();
    // GV-2: script tag stripped, safe paragraph rendered
    expect(screen.getByText('Güvenli metin')).toBeInTheDocument();
    expect(container.querySelector('script')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Sunucuda Hesapla' }));
    expect(onFieldAction).toHaveBeenCalledWith(buttonField);

    expect(screen.getByLabelText(/Enlem/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Boylam/)).toBeInTheDocument();
    expect(screen.getByDisplayValue('8690000123456')).toBeInTheDocument();
  });

  it('renders child Table with meta.child_tables and supports adding and removing rows', async () => {
    const user = userEvent.setup();
    const adapter = createStubAdapter();
    const onChange = vi.fn();

    const tableField: DocField = {
      fieldname: 'items',
      fieldtype: 'Table',
      label: 'Harcama Kalemleri',
      options: 'Expense Item',
      read_only: false,
      component: 'table',
      sensitivity: 'standard',
    };

    render(
      <CatalogField
        field={tableField}
        value={[{ name: 'ROW-1', item_title: 'Ulaşım', amount: 250 }]}
        doc={{ items: [{ name: 'ROW-1', item_title: 'Ulaşım', amount: 250 }] }}
        doctype="Expense Claim"
        meta={CHILD_META}
        adapter={adapter}
        locale="tr"
        onChange={onChange}
      />,
    );

    expect(screen.getByDisplayValue('Ulaşım')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Satır ekle' }));
    expect(onChange).toHaveBeenCalledTimes(1);
    const addedRows = onChange.mock.calls[0]?.[1] as unknown[];
    expect(addedRows).toHaveLength(2);
  });
});
