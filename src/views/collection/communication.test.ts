import { describe, expect, it, vi } from 'vitest';

import { createShellViewData } from '@/app/view-data';

import { createDefinition } from './model';
import { displayCell } from './presentation';
import { sampleMeta } from './sample';

/**
 * Sunucunun Communication için verdiği şemanın kısaltılmış biçimi (AJA-812, G-63).
 * Alanlar Frappe v16 `communication.json` dosyasından alındı.
 * Sunucu bileşen adlarını `platform_core/shell/catalog.py` içindeki tablodan verir.
 * `communication_medium` seçenekleri boş bir seçenekle başlar. Frappe'de bu "değer yok" demektir.
 */
function communicationMeta() {
  const field = (extra: Record<string, unknown>) => ({
    read_only: true,
    sensitivity: 'standard',
    ...extra,
  });
  return {
    schema: {
      name: 'Communication',
      module: 'Core',
      title_field: 'subject',
      search_fields: '',
      sort_field: 'creation',
      sensitivity: 'standard',
      fields: [
        field({
          fieldname: 'subject',
          fieldtype: 'Small Text',
          label: 'Subject',
          component: 'text-area',
        }),
        field({
          fieldname: 'communication_medium',
          fieldtype: 'Select',
          label: 'Type',
          component: 'select',
          in_list_view: true,
          in_standard_filter: true,
          options: '\nEmail\nChat',
          choices: [
            { value: '', label: '' },
            { value: 'Email', label: 'Email' },
            { value: 'Chat', label: 'Chat' },
          ],
        }),
        field({
          fieldname: 'status',
          fieldtype: 'Select',
          label: 'Status',
          component: 'select',
          in_list_view: true,
          in_standard_filter: true,
          options: 'Open\nReplied',
          choices: [
            { value: 'Open', label: 'Open' },
            { value: 'Replied', label: 'Replied' },
          ],
        }),
        field({
          fieldname: 'reference_doctype',
          fieldtype: 'Link',
          label: 'Reference Document Type',
          component: 'link-select',
          options: 'DocType',
        }),
        field({
          fieldname: 'reference_name',
          fieldtype: 'Dynamic Link',
          label: 'Reference Name',
          component: 'link-select',
          in_list_view: true,
          options: 'reference_doctype',
        }),
        field({
          fieldname: 'content',
          fieldtype: 'Text Editor',
          label: 'Message',
          component: 'rich-text',
          in_list_view: true,
        }),
        field({
          fieldname: 'message_id',
          fieldtype: 'Code',
          label: 'Message ID',
          component: 'code-editor',
          in_list_view: true,
        }),
        field({
          fieldname: 'future_field',
          fieldtype: 'Hologram',
          label: 'Gelecek alan',
          component: null,
          in_list_view: true,
        }),
      ],
    },
    child_tables: {},
    catalog_version: 1,
    meta_hash: 'communication',
    perm_version: 'communication',
    mobile_cache_allowed: false,
  };
}

describe('İletişim listesi (AJA-812, G-63)', () => {
  it('Communication şemasıyla liste tanımı kurulur', () => {
    const definition = createDefinition(communicationMeta(), { label: 'Communication' });
    expect(definition.doctype).toBe('Communication');
    expect(definition.titleField).toBe('subject');
    expect(definition.columns.map((column) => column.fieldname)).toEqual([
      'name',
      'subject',
      'communication_medium',
      'status',
      'reference_name',
      'content',
      'message_id',
      'future_field',
    ]);
  });

  it('boş seçenek süzgeçte ikinci bir "Tümü" seçeneği olmaz', () => {
    const definition = createDefinition(communicationMeta());
    const medium = definition.columns.find((c) => c.fieldname === 'communication_medium');
    expect(medium?.choices).toEqual([
      { value: 'Email', label: 'Email' },
      { value: 'Chat', label: 'Chat' },
    ]);
  });

  it('Dynamic Link, Code ve Text Editor değerleri düz metin olarak görünür', () => {
    const definition = createDefinition(communicationMeta());
    const column = (name: string) => {
      const found = definition.columns.find((c) => c.fieldname === name);
      if (!found) throw new Error(`${name} sütunu yok`);
      return found;
    };
    const row = {
      name: 'COMM-0001',
      reference_name: 'CRM-LEAD-0001',
      content: '<p>Merhaba <strong>Ayşe</strong> &amp; ekip</p><script>alert(1)</script>',
      message_id: '<abc@example.test>',
      future_field: 'ham değer',
    };
    expect(displayCell(row, column('reference_name'))).toBe('CRM-LEAD-0001');
    expect(displayCell(row, column('content'))).toBe('Merhaba Ayşe & ekip');
    expect(displayCell(row, column('message_id'))).toBe('<abc@example.test>');
    expect(displayCell(row, column('future_field'))).toBe('ham değer');
  });

  it('bilinmeyen alan türü ve geçersiz seçenek listeyi bozmaz', () => {
    const meta = communicationMeta();
    meta.schema.fields.push({
      fieldname: 'odd_select',
      fieldtype: 'Select',
      label: 'Garip seçim',
      component: 'select',
      in_list_view: true,
      read_only: true,
      sensitivity: 'standard',
      choices: [{ value: 'A', label: '' }, { value: 3 }, 'kırık'],
    } as never);
    const definition = createDefinition(meta);
    expect(definition.columns.find((c) => c.fieldname === 'odd_select')?.choices).toEqual([
      { value: 'A', label: 'A' },
    ]);
  });

  it('kabuk Communication tanımını hata vermeden yükler', async () => {
    const getDocType = vi.fn().mockResolvedValue({ status: 'fresh', meta: communicationMeta() });
    const data = createShellViewData({ listDocuments: vi.fn(), getDocType } as never);
    for (const module of ['crm', 'email']) {
      const definition = await data.collection?.loadDefinition(
        { module, doctype: 'Communication' },
        new AbortController().signal,
      );
      expect(definition?.label).toBe('Communication');
    }
    expect(getDocType).toHaveBeenCalledWith('Communication', undefined, expect.anything());
  });

  it('kişi listesi örnek şeması eskisi gibi açılır', () => {
    const definition = createDefinition(sampleMeta);
    expect(definition.columns.find((c) => c.fieldname === 'status')?.choices).toEqual([
      { value: 'Açık', label: 'Açık' },
      { value: 'Kapalı', label: 'Kapalı' },
    ]);
  });
});
