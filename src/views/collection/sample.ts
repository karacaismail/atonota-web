import type { DocTypeMeta } from '@/api';
import { sampleDocTypeMeta } from '@/mocks/fixtures';
import { createDefinition } from './model';

/**
 * Sample record definition for the preview and tests. No data lives here.
 * Records come from the `/api/v2/document` handler of the `@/mocks` mock server.
 * The definition is based on `sampleDocTypeMeta`. The field list matches the mock records' fields.
 * The production collection entry does not import this file.
 */
const sampleFields: DocTypeMeta['schema']['fields'] = [
  {
    fieldname: 'title',
    fieldtype: 'Data',
    label: 'Başlık',
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
      { value: 'Açık', label: 'Açık' },
      { value: 'Kapalı', label: 'Kapalı' },
    ],
    read_only: true,
    sensitivity: 'standard',
  },
  {
    fieldname: 'amount',
    fieldtype: 'Float',
    label: 'Tutar',
    component: 'InputNumber',
    in_list_view: true,
    read_only: true,
    sensitivity: 'standard',
  },
];

export const sampleMeta: DocTypeMeta = {
  ...sampleDocTypeMeta,
  schema: { ...sampleDocTypeMeta.schema, sort_field: 'name', fields: sampleFields },
};

export const sampleDefinition = createDefinition(sampleMeta, {
  label: 'Örnek kayıtlar',
  groupField: 'status',
});
