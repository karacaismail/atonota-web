import type { DocTypeMeta } from '@/api';
import { sampleDocTypeMeta } from '@/mocks/fixtures';
import fixture from './fixtures/example-collection.json';
import { createDefinition, parsePage } from './model';
import type { CollectionSource } from './types';

/**
 * Preview and test adapter. Metadata derives from `api-client`'s `sampleDocTypeMeta`
 * (`platform_core.api.meta.get_doctype`) and extends its schema with preview fields for
 * group, date and duration roles.
 *
 * Kaldırma koşulu: `api-client` tipli Frappe `/api/v2/document` istemcisini ve sahte
 * işleyicisini `main` dalına getirdiğinde yerel `exampleSource` liste uyarlayıcısı ve
 * `fixtures/example-collection.json` kaldırılır, doğrudan tipli istemciye bağlanılır.
 * Üretim koleksiyon girişinden içe aktarılmaz.
 */
const previewFields: DocTypeMeta['schema']['fields'] = [
  {
    fieldname: 'subject',
    fieldtype: 'Data',
    label: 'İş',
    component: 'Input',
    in_list_view: true,
    read_only: true,
    sensitivity: 'standard',
  },
  {
    fieldname: 'status',
    fieldtype: 'Select',
    label: 'Durum',
    component: 'Select',
    in_list_view: true,
    in_standard_filter: true,
    choices: [
      { value: 'Open', label: 'Açık' },
      { value: 'In Progress', label: 'Sürüyor' },
      { value: 'Done', label: 'Bitti' },
    ],
    read_only: true,
    sensitivity: 'standard',
  },
  {
    fieldname: 'start_date',
    fieldtype: 'Date',
    label: 'Başlangıç',
    component: 'DatePicker',
    in_list_view: true,
    read_only: true,
    sensitivity: 'standard',
  },
  {
    fieldname: 'end_date',
    fieldtype: 'Date',
    label: 'Bitiş',
    component: 'DatePicker',
    in_list_view: true,
    read_only: true,
    sensitivity: 'standard',
  },
  {
    fieldname: 'hours',
    fieldtype: 'Float',
    label: 'Süre (saat)',
    component: 'InputNumber',
    in_list_view: true,
    read_only: true,
    sensitivity: 'standard',
  },
];

export const exampleMeta: DocTypeMeta = {
  ...sampleDocTypeMeta,
  schema: {
    ...sampleDocTypeMeta.schema,
    name: 'Example Task',
    module: 'Example',
    title_field: 'subject',
    search_fields: 'subject',
    sort_field: 'name',
    fields: previewFields,
  },
};

export const exampleDefinition = createDefinition(exampleMeta, {
  label: 'Örnek işler',
  groupField: 'status',
  startField: 'start_date',
  endField: 'end_date',
  durationField: 'hours',
});

const rows = parsePage(fixture.list).data;

/** Yalnız bu örnek kaynak yerel sorgu çalıştırır. Üretim bağlantısı isteği `/api/v2/document` ucuna gönderir. */
export const exampleSource: CollectionSource = {
  kind: 'example',
  async list(request, signal) {
    await Promise.resolve();
    signal.throwIfAborted();
    if (request.doctype !== exampleDefinition.doctype) throw new Error('Unknown example DocType');
    let data = rows.filter((row) =>
      request.filters.every(([field, operator, value]) => {
        if (operator === '=') return String(row[field]) === value;
        const search = value
          .slice(1, -1)
          .replace(/\\([\\%_])/g, '$1')
          .toLocaleLowerCase('tr');
        return String(row[field]).toLocaleLowerCase('tr').includes(search);
      }),
    );
    const [field = 'name', direction] = request.order_by.split(',')[0]?.trim().split(' ') ?? [];
    data = [...data].sort((a, b) => {
      const left = a[field];
      const right = b[field];
      const order =
        typeof left === 'number' && typeof right === 'number'
          ? left - right
          : String(left).localeCompare(String(right), 'tr', { numeric: true });
      return (direction === 'desc' ? -order : order) || a.name.localeCompare(b.name);
    });
    const total = data.length;
    return {
      data: data
        .slice(request.limit_start, request.limit_start + request.limit_page_length)
        .map((row) => Object.fromEntries(request.fields.map((key) => [key, row[key] ?? null]))),
      has_next_page: request.limit_start + request.limit_page_length < total,
      total,
    };
  },
};
