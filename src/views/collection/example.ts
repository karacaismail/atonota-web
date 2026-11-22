import { createDefinition } from './model';
import type { CollectionRow, CollectionSource } from './types';
export const exampleMeta = {
  schema: {
    name: 'Example Task',
    module: 'Example',
    title_field: 'subject',
    search_fields: 'subject',
    sort_field: 'name',
    sensitivity: 'standard',
    fields: [
      {
        fieldname: 'subject',
        fieldtype: 'Data',
        label: 'İş',
        component: 'Input',
        in_list_view: true,
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
      },
      {
        fieldname: 'start_date',
        fieldtype: 'Date',
        label: 'Başlangıç',
        component: 'DatePicker',
        in_list_view: true,
      },
      {
        fieldname: 'end_date',
        fieldtype: 'Date',
        label: 'Bitiş',
        component: 'DatePicker',
        in_list_view: true,
      },
      {
        fieldname: 'hours',
        fieldtype: 'Float',
        label: 'Süre (saat)',
        component: 'InputNumber',
        in_list_view: true,
      },
    ].map((field) => ({ ...field, read_only: true, sensitivity: 'standard' })),
  },
  meta_hash: 'example-only',
  perm_version: 'example-only',
  child_tables: {},
  catalog_version: 1,
  mobile_cache_allowed: false,
};
export const exampleDefinition = createDefinition(exampleMeta, {
  groupField: 'status',
  startField: 'start_date',
  endField: 'end_date',
  durationField: 'hours',
});
const rows: CollectionRow[] = Array.from({ length: 27 }, (_, index) => ({
  name: 'EXAMPLE-' + String(index + 1).padStart(3, '0'),
  subject:
    index === 0
      ? 'DocType Template Proposal uzun model adı için örnek kayıt'
      : 'Örnek iş ' + (index + 1),
  status: ['Open', 'In Progress', 'Done'][index % 3] ?? 'Open',
  start_date: '2026-11-' + String(1 + (index % 20)).padStart(2, '0'),
  end_date: '2026-11-' + String(3 + (index % 20)).padStart(2, '0'),
  hours: (index % 8) + 1,
}));
/** Only this example source performs local queries. API adapters must send the entire request to the server. */
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
