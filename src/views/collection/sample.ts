import type { DocTypeMeta } from '@/api';
import { sampleDocTypeMeta } from '@/mocks/fixtures';
import { createDefinition } from './model';

/**
 * Önizleme ve test için örnek kayıt tanımı. Veri burada yoktur.
 * Kayıtlar `@/mocks` sahte sunucusunun `/api/v2/document` işleyicisinden gelir.
 * Tanım `sampleDocTypeMeta` nesnesini temel alır. Alan listesi sahte kayıtların alanlarıyla eşleşir.
 * Üretim koleksiyon girişi bu dosyayı içe aktarmaz.
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
