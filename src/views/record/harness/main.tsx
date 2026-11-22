/**
 * Kayıt ekranı deneme sayfası. Yalnız geliştirme ve tarayıcı testleri içindir.
 *
 * GEÇİCİ: `foundation` işinin `src/design` ve `src/app` sağlayıcısı `main` dalına
 * birleşince ortak tema sağlayıcısını kullanacaktır.
 */
import '@fontsource-variable/outfit';
import '@fontsource/jetbrains-mono/400.css';

import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';

import {
  type DocTypeMeta,
  RecordApiError,
  type RecordDataAdapter,
  type RecordDocument,
  RecordView,
} from '../index';

const HARNESS_META: DocTypeMeta = {
  schema: {
    name: 'Expense Claim',
    module: 'HRMS TR',
    sensitivity: 'standard',
    title_field: 'employee_name',
    search_fields: 'employee_name',
    sort_field: 'modified',
    fields: [
      {
        fieldname: 'tab_general',
        fieldtype: 'Tab Break',
        label: 'Genel',
        read_only: false,
        component: 'tab',
        sensitivity: 'standard',
      },
      {
        fieldname: 'sec_summary',
        fieldtype: 'Section Break',
        label: 'Başvuru Özeti',
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
        fieldname: 'department',
        fieldtype: 'Link',
        label: 'Departman',
        options: 'Department',
        read_only: false,
        component: 'link',
        sensitivity: 'standard',
      },
      {
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
      },
      {
        fieldname: 'col_second',
        fieldtype: 'Column Break',
        read_only: false,
        component: 'column',
        sensitivity: 'standard',
      },
      {
        fieldname: 'posting_date',
        fieldtype: 'Date',
        label: 'Belge Tarihi',
        read_only: false,
        component: 'date',
        sensitivity: 'standard',
      },
      {
        fieldname: 'is_paid',
        fieldtype: 'Check',
        label: 'Ödendi',
        read_only: false,
        component: 'check',
        sensitivity: 'standard',
      },
      {
        fieldname: 'service_rating',
        fieldtype: 'Rating',
        label: 'Hizmet Puanı',
        read_only: false,
        component: 'rating',
        sensitivity: 'standard',
      },
      {
        fieldname: 'tag_color',
        fieldtype: 'Color',
        label: 'Etiket Rengi',
        read_only: false,
        component: 'color',
        sensitivity: 'standard',
      },
      {
        fieldname: 'sec_items',
        fieldtype: 'Section Break',
        label: 'Kalemler ve İmza',
        read_only: false,
        component: 'section',
        sensitivity: 'standard',
      },
      {
        fieldname: 'items',
        fieldtype: 'Table',
        label: 'Harcama Kalemleri',
        options: 'Expense Item',
        read_only: false,
        component: 'table',
        sensitivity: 'standard',
      },
      {
        fieldname: 'notes_editor',
        fieldtype: 'Text Editor',
        label: 'Açıklama Metni',
        read_only: false,
        component: 'text-editor',
        sensitivity: 'standard',
      },
      {
        fieldname: 'attachment',
        fieldtype: 'Attach',
        label: 'Belge Eki',
        read_only: false,
        component: 'attach',
        sensitivity: 'standard',
      },
      {
        fieldname: 'signature',
        fieldtype: 'Signature',
        label: 'Onay İmzası',
        read_only: false,
        component: 'signature',
        sensitivity: 'standard',
      },
      {
        fieldname: 'unknown_legacy',
        fieldtype: 'LegacyPlugin',
        label: 'Eski Eklenti',
        read_only: true,
        component: null,
        sensitivity: 'standard',
      },
    ],
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
          label: 'Kalem Açıklaması',
          in_list_view: true,
          reqd: true,
          read_only: false,
          component: 'input',
          sensitivity: 'standard',
        },
        {
          fieldname: 'expense_date',
          fieldtype: 'Date',
          label: 'Tarih',
          in_list_view: true,
          read_only: false,
          component: 'date',
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
  },
  catalog_version: 2,
  meta_hash: 'aaaa',
  perm_version: 'bbbb',
  mobile_cache_allowed: false,
};

const HARNESS_RECORD: RecordDocument = {
  name: 'HR-EXP-0003',
  modified: '2026-11-22 09:00:00.000001',
  docstatus: 0,
  employee_name: 'Örnek Kişi',
  department: 'DEP-ENG',
  status: 'Open',
  posting_date: '2026-11-23',
  is_paid: 0,
  service_rating: 0.8,
  tag_color: '',
  notes_editor: 'Harici toplantı ulaşım gideri.',
  items: [
    {
      name: 'ROW-01',
      item_title: 'Şehir içi ulaşım',
      expense_date: '2026-11-23',
      amount: 450.75,
    },
  ],
};

export function HarnessApp() {
  const params = new URLSearchParams(window.location.search);
  const themeMode = params.get('theme') === 'dark' ? 'dark' : 'light';
  const scenario = params.get('scenario') ?? 'ready';
  const [linkFailOnce, setLinkFailOnce] = useState(params.get('linkError') === '1');
  const [currentIndex, setCurrentIndex] = useState(3);

  const adapter: RecordDataAdapter = {
    getDocTypeMeta: async () => HARNESS_META,
    getRecord: async () => {
      if (scenario === 'error') {
        throw new RecordApiError({
          code: 'network',
          message: 'Sunucuya ulaşılamadı.',
        });
      }
      if (scenario === 'unauthorized') {
        throw new RecordApiError({
          code: 'unauthorized',
          status: 403,
          message: 'Bu kaydı görüntüleme yetkiniz bulunmuyor.',
        });
      }
      return HARNESS_RECORD;
    },
    saveRecord: async (saveParams) => ({
      ...HARNESS_RECORD,
      ...saveParams.data,
      modified: '2026-11-22 10:15:00.000001',
    }),
    searchLink: async ({ txt }) => {
      if (linkFailOnce) {
        setLinkFailOnce(false);
        throw new RecordApiError({
          code: 'network',
          message: 'Arama sunucusuna ulaşılamadı.',
        });
      }
      const all = [
        { value: 'DEP-ENG', label: 'Mühendislik', description: 'Yazılım geliştirme' },
        { value: 'DEP-OPS', label: 'Operasyon', description: 'Saha operasyonları' },
      ];
      return txt ? all.filter((item) => item.label.toLowerCase().includes(txt.toLowerCase())) : all;
    },
  };

  return (
    <main>
      <RecordView
        doctype="Expense Claim"
        {...(scenario === 'empty' ? {} : { name: `HR-EXP-000${currentIndex}` })}
        adapter={adapter}
        themeMode={themeMode}
        locale="tr"
        navigator={{
          currentIndex,
          totalCount: 1284,
          onNavigate: (next) => setCurrentIndex(next),
        }}
      />
    </main>
  );
}

const root = document.getElementById('root');
if (!root) {
  throw new Error('Kök öğe bulunamadı: #root');
}

createRoot(root).render(
  <StrictMode>
    <HarnessApp />
  </StrictMode>,
);
