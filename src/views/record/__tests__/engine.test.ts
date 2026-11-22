import { describe, expect, it, vi } from 'vitest';

import { createFrappeRecordAdapter, type RecordApiError, stripHtmlTagsSafe } from '../adapter';
import { evaluateFieldState } from '../conditions';
import { buildFormLayout } from '../layout';
import { formatRecordMessage, RECORD_MESSAGES } from '../messages';
import {
  SchemaValidationError,
  validateDocTypeMeta,
  validateLinkSearchResponse,
  validateRecordEnvelope,
} from '../schema';
import type { DocField, DocTypeMeta } from '../types';
import { computeDirtyFields, validateRecordDraft } from '../validation';

const SAMPLE_META_ENVELOPE = {
  message: {
    schema: {
      name: 'Leave Application',
      module: 'HRMS TR',
      sensitivity: 'standard',
      title_field: 'employee_name',
      search_fields: 'employee_name,leave_type',
      sort_field: 'modified',
      fields: [
        {
          fieldname: 'details_tab',
          fieldtype: 'Tab Break',
          label: 'Detay',
          read_only: false,
          component: 'tab',
          sensitivity: 'standard',
        },
        {
          fieldname: 'employee_section',
          fieldtype: 'Section Break',
          label: 'Çalışan Bilgileri',
          read_only: false,
          component: 'section',
          sensitivity: 'standard',
        },
        {
          fieldname: 'employee',
          fieldtype: 'Link',
          label: 'Çalışan',
          options: 'Employee',
          reqd: true,
          read_only: false,
          component: 'link',
          sensitivity: 'standard',
        },
        {
          fieldname: 'col_break_1',
          fieldtype: 'Column Break',
          read_only: false,
          component: 'column',
          sensitivity: 'standard',
        },
        {
          fieldname: 'employee_name',
          fieldtype: 'Data',
          label: 'Çalışan Adı',
          read_only: true,
          component: 'input',
          sensitivity: 'standard',
        },
        {
          fieldname: 'dates_tab',
          fieldtype: 'Tab Break',
          label: 'Tarihler',
          read_only: false,
          component: 'tab',
          sensitivity: 'standard',
        },
        {
          fieldname: 'total_leave_days',
          fieldtype: 'Float',
          label: 'Toplam İzin Günü',
          non_negative: true,
          read_only: false,
          component: 'float',
          sensitivity: 'standard',
        },
      ],
    },
    child_tables: {},
    catalog_version: 2,
    meta_hash: 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
    perm_version: 'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
    mobile_cache_allowed: false,
  },
};

describe('schema validation (SZ-4, TS-5, RE-11)', () => {
  it('accepts a valid platform_core get_doctype Meta envelope', () => {
    const meta = validateDocTypeMeta(SAMPLE_META_ENVELOPE);
    expect(meta.schema.name).toBe('Leave Application');
    expect(meta.catalog_version).toBe(2);
    expect(meta.schema.fields).toHaveLength(7);
  });

  it('rejects malformed, extra-property, or executable-code payloads (TE-7)', () => {
    expect(() => validateDocTypeMeta(null)).toThrow(SchemaValidationError);

    expect(() =>
      validateDocTypeMeta({
        message: {
          ...SAMPLE_META_ENVELOPE.message,
          extra_script: 'alert(1)',
        },
      }),
    ).toThrow(SchemaValidationError);

    expect(() =>
      validateDocTypeMeta({
        message: {
          ...SAMPLE_META_ENVELOPE.message,
          schema: {
            ...SAMPLE_META_ENVELOPE.message.schema,
            fields: [
              {
                fieldname: 'bad_cond',
                fieldtype: 'Data',
                read_only: false,
                component: 'input',
                sensitivity: 'standard',
                depends_on: {
                  scope: 'doc',
                  field: 'status',
                  op: 'eq',
                },
              },
            ],
          },
        },
      }),
    ).toThrow(SchemaValidationError);

    expect(() =>
      validateDocTypeMeta({
        message: {
          ...SAMPLE_META_ENVELOPE.message,
          schema: {
            ...SAMPLE_META_ENVELOPE.message.schema,
            fields: [
              {
                fieldname: 'bad_truthy',
                fieldtype: 'Data',
                read_only: false,
                component: 'input',
                sensitivity: 'standard',
                depends_on: {
                  scope: 'doc',
                  field: 'status',
                  op: 'truthy',
                  value: 'Open',
                },
              },
            ],
          },
        },
      }),
    ).toThrow(SchemaValidationError);
  });

  it('marks truncated metadata explicitly and rejects inconsistent truncated fields', () => {
    const validTruncated = validateDocTypeMeta({
      message: {
        schema: {
          name: 'Huge DocType',
          module: 'Core',
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
        truncated: true,
      },
    });
    expect(validTruncated.truncated).toBe(true);

    expect(() =>
      validateDocTypeMeta({
        message: {
          ...SAMPLE_META_ENVELOPE.message,
          truncated: true,
        },
      }),
    ).toThrow(SchemaValidationError);
  });

  it('preserves distinction between missing field, null, and empty string in record envelope (SZ-9)', () => {
    const doc = validateRecordEnvelope({
      data: {
        name: 'HR-LAP-TEST-01',
        modified: '2026-11-22 09:00:00.000001',
        docstatus: 0,
        amended_from: null,
        description: '',
      },
    });
    expect(doc.name).toBe('HR-LAP-TEST-01');
    expect(doc['amended_from']).toBeNull();
    expect(doc['description']).toBe('');
    expect('leave_balance' in doc).toBe(false);
  });

  it('validates search_link response items', () => {
    const items = validateLinkSearchResponse({
      message: [{ value: 'HR-EMP-TEST-01', label: 'Örnek Çalışan', description: 'İK Bölümü' }],
    });
    expect(items).toEqual([
      { value: 'HR-EMP-TEST-01', label: 'Örnek Çalışan', description: 'İK Bölümü' },
    ]);
    expect(() => validateLinkSearchResponse({ message: [{ label: 'Missing value' }] })).toThrow(
      SchemaValidationError,
    );
  });
});

describe('declarative conditions & unsupported_conditions', () => {
  it('evaluates doc and parent conditions and enforces read_only when read_only_depends_on is unsupported', () => {
    const conditionalField: DocField = {
      fieldname: 'rejection_reason',
      fieldtype: 'Small Text',
      label: 'Ret Nedeni',
      read_only: false,
      component: 'small-text',
      sensitivity: 'standard',
      depends_on: { scope: 'doc', field: 'status', op: 'eq', value: 'Rejected' },
      mandatory_depends_on: { scope: 'doc', field: 'status', op: 'eq', value: 'Rejected' },
    };

    const hiddenState = evaluateFieldState(conditionalField, {
      doc: { status: 'Open' },
    });
    expect(hiddenState.visible).toBe(false);
    expect(hiddenState.required).toBe(false);

    const shownState = evaluateFieldState(conditionalField, {
      doc: { status: 'Rejected' },
    });
    expect(shownState.visible).toBe(true);
    expect(shownState.required).toBe(true);

    const unsupportedReadOnlyField: DocField = {
      fieldname: 'salary_note',
      fieldtype: 'Data',
      read_only: false,
      component: 'input',
      sensitivity: 'restricted',
      unsupported_conditions: ['read_only_depends_on'],
    };
    const lockedState = evaluateFieldState(unsupportedReadOnlyField, { doc: {} });
    expect(lockedState.readOnly).toBe(true);
  });
});

describe('layout builder (tabs, sections, columns, hidden fields, phone single-column)', () => {
  it('builds tabs, sections, and columns and forces single column on phone', () => {
    const meta: DocTypeMeta = validateDocTypeMeta(SAMPLE_META_ENVELOPE);
    const desktopLayout = buildFormLayout(meta.schema.fields, {
      doc: {},
      isPhoneViewport: false,
      defaultTabLabel: 'Detaylar',
    });

    expect(desktopLayout.hasExplicitTabs).toBe(true);
    expect(desktopLayout.tabs).toHaveLength(2);
    expect(desktopLayout.tabs[0]?.label).toBe('Detay');
    expect(desktopLayout.tabs[0]?.sections[0]?.columns).toHaveLength(2);
    expect(desktopLayout.tabs[0]?.sections[0]?.effectiveColumnCount).toBe(2);

    const phoneLayout = buildFormLayout(meta.schema.fields, {
      doc: {},
      isPhoneViewport: true,
      defaultTabLabel: 'Detaylar',
    });
    expect(phoneLayout.tabs[0]?.sections[0]?.effectiveColumnCount).toBe(1);
  });

  it('excludes hidden fields, hidden columns, empty sections, and empty tabs (Review 1 Finding 4 & Minor 3)', () => {
    const fieldsWithHidden: DocField[] = [
      {
        fieldname: 'tab_visible',
        fieldtype: 'Tab Break',
        label: 'Görünür Sekme',
        read_only: false,
        component: 'tab',
        sensitivity: 'standard',
      },
      {
        fieldname: 'sec_hidden_only',
        fieldtype: 'Section Break',
        label: 'Gizli Bölüm',
        read_only: false,
        component: 'section',
        sensitivity: 'standard',
      },
      {
        fieldname: 'secret_field',
        fieldtype: 'Data',
        hidden: true,
        read_only: false,
        component: 'input',
        sensitivity: 'standard',
      },
      {
        fieldname: 'sec_mixed',
        fieldtype: 'Section Break',
        label: 'Karma Bölüm',
        read_only: false,
        component: 'section',
        sensitivity: 'standard',
      },
      {
        fieldname: 'visible_field',
        fieldtype: 'Data',
        label: 'Açık Alan',
        read_only: false,
        component: 'input',
        sensitivity: 'standard',
      },
      {
        fieldname: 'col_2',
        fieldtype: 'Column Break',
        read_only: false,
        component: 'column',
        sensitivity: 'standard',
      },
      {
        fieldname: 'conditional_hidden_field',
        fieldtype: 'Data',
        label: 'Koşullu Gizli',
        read_only: false,
        component: 'input',
        sensitivity: 'standard',
        depends_on: { scope: 'doc', field: 'status', op: 'eq', value: 'Closed' },
      },
      {
        fieldname: 'tab_empty',
        fieldtype: 'Tab Break',
        label: 'Boş Sekme',
        read_only: false,
        component: 'tab',
        sensitivity: 'standard',
      },
      {
        fieldname: 'hidden_in_tab2',
        fieldtype: 'Data',
        hidden: true,
        read_only: false,
        component: 'input',
        sensitivity: 'standard',
      },
    ];

    const layout = buildFormLayout(fieldsWithHidden, {
      doc: { status: 'Open' },
      isPhoneViewport: false,
      defaultTabLabel: 'Detaylar',
    });

    // Empty second tab should be omitted
    expect(layout.tabs).toHaveLength(1);
    expect(layout.tabs[0]?.label).toBe('Görünür Sekme');
    // Section with only hidden fields should be omitted
    expect(layout.tabs[0]?.sections).toHaveLength(1);
    expect(layout.tabs[0]?.sections[0]?.label).toBe('Karma Bölüm');
    // Second column had only a false-depends_on field, so effectiveColumnCount must be 1
    expect(layout.tabs[0]?.sections[0]?.effectiveColumnCount).toBe(1);
  });
});

describe('dirty tracking & contract validation (RE-3, AD-10, Review 1 Minor 2 & 4)', () => {
  it('computes dirty field count respecting read_only_depends_on and rejects whitespace-only numbers', () => {
    const fields: DocField[] = [
      {
        fieldname: 'employee',
        fieldtype: 'Link',
        label: 'Çalışan',
        options: 'Employee',
        reqd: true,
        read_only: false,
        component: 'link',
        sensitivity: 'standard',
      },
      {
        fieldname: 'days_int',
        fieldtype: 'Int',
        label: 'Gün Sayısı',
        non_negative: true,
        read_only: false,
        component: 'int',
        sensitivity: 'standard',
      },
      {
        fieldname: 'locked_by_cond',
        fieldtype: 'Data',
        label: 'Koşullu Salt Okunur',
        read_only: false,
        component: 'input',
        sensitivity: 'standard',
        read_only_depends_on: { scope: 'doc', field: 'status', op: 'eq', value: 'Locked' },
      },
    ];

    const meta: DocTypeMeta = {
      schema: {
        name: 'Sample',
        module: 'Core',
        sensitivity: 'standard',
        fields,
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

    const base = {
      name: 'REC-1',
      status: 'Locked',
      employee: 'EMP-1',
      days_int: 3,
      locked_by_cond: 'eski',
    };
    const draft = {
      ...base,
      employee: '',
      days_int: '   ',
      locked_by_cond: 'yeni',
    };

    // locked_by_cond is read-only under status === 'Locked' so must not count as dirty
    const dirty = computeDirtyFields(fields, base, draft);
    expect(dirty).toEqual(['employee', 'days_int']);

    // Whitespace string '   ' on Int field must fail integer validation instead of coercing to 0
    const errors = validateRecordDraft(meta, draft, 'tr');
    expect(errors['employee']).toBeDefined();
    expect(errors['days_int']).toBeDefined();
  });
});

describe('translation catalog parity (IC-1, IC-3)', () => {
  it('keeps identical message keys across tr and en and interpolates placeholders', () => {
    expect(Object.keys(RECORD_MESSAGES.tr).sort()).toEqual(Object.keys(RECORD_MESSAGES.en).sort());
    expect(formatRecordMessage('tr', 'unsavedChangesCount', { count: 2 })).toBe(
      '2 kaydedilmemiş değişiklik',
    );
    expect(formatRecordMessage('tr', 'navigatorPosition', { current: '3', total: '1.284' })).toBe(
      '3 / 1.284',
    );
  });
});

describe('Frappe HTTP adapter (SZ-5, SZ-7, SZ-8, SZ-11, Review 1 Findings 2, 3 & Minor 1, 5)', () => {
  it('preserves "<" comparisons and decodes HTML entities when stripping HTML tags (Review 1 Minor 1)', () => {
    expect(stripHtmlTagsSafe('Tutar: a < b &amp; <b>önemli</b>')).toBe('Tutar: a < b & önemli');
  });

  it('handles HTTP 304 Not Modified on getDocTypeMeta with ETag cache instead of throwing server_error (Review 1 Finding 2)', async () => {
    const fetchMock = vi.fn<typeof fetch>();

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(SAMPLE_META_ENVELOPE), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ETag: '"etag-v1"',
        },
      }),
    );

    fetchMock.mockResolvedValueOnce(
      new Response(null, {
        status: 304,
        headers: {
          ETag: '"etag-v1"',
        },
      }),
    );

    const adapter = createFrappeRecordAdapter({ fetchFn: fetchMock });

    const firstMeta = await adapter.getDocTypeMeta({ doctype: 'Leave Application' });
    expect(firstMeta.schema.name).toBe('Leave Application');

    const cachedMeta = await adapter.getDocTypeMeta({
      doctype: 'Leave Application',
      etag: '"etag-v1"',
    });
    expect(cachedMeta.schema.name).toBe('Leave Application');
  });

  it('treats 403 Guest or Guest message on get_logged_user session probe as session_expired (Review 1 Finding 3)', async () => {
    const fetchMock = vi.fn<typeof fetch>();

    // Ambiguous 403 from record endpoint
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({}), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    // Frappe returns 403 for Guest on get_logged_user
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ exc_type: 'PermissionError' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const adapter = createFrappeRecordAdapter({ fetchFn: fetchMock });

    await expect(
      adapter.getRecord({ doctype: 'Leave Application', name: 'HR-LAP-TEST-01' }),
    ).rejects.toMatchObject({
      code: 'session_expired',
    } satisfies Partial<RecordApiError>);

    // Case 2: 200 with real non-Guest user means session IS active -> real permission denial ('unauthorized')
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({}), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'sample@example.test' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(
      adapter.getRecord({ doctype: 'Leave Application', name: 'HR-LAP-TEST-02' }),
    ).rejects.toMatchObject({
      code: 'unauthorized',
    } satisfies Partial<RecordApiError>);
  });

  it('sends modified and X-Frappe-CSRF-Token on record update and translates TimestampMismatchError, 429, and runDocAction', async () => {
    const fetchMock = vi.fn<typeof fetch>();

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ data: { name: 'HR-LAP-TEST-01', modified: '2026-11-22 10:00:00' } }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );

    const adapter = createFrappeRecordAdapter({
      fetchFn: fetchMock,
      getCsrfToken: () => 'csrf-test-token',
    });

    await adapter.saveRecord({
      doctype: 'Leave Application',
      name: 'HR-LAP-TEST-01',
      modified: '2026-11-22 09:00:00.000001',
      data: { description: 'Güncel açıklama' },
    });

    const [requestUrl, requestInit] = fetchMock.mock.calls[0] ?? [];
    expect(requestUrl).toBe('/api/resource/Leave%20Application/HR-LAP-TEST-01');
    expect(requestInit?.method).toBe('PUT');
    const headers = new Headers(requestInit?.headers);
    expect(headers.get('X-Frappe-CSRF-Token')).toBe('csrf-test-token');

    // 417 TimestampMismatchError
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          exc_type: 'TimestampMismatchError',
          _server_messages: JSON.stringify([
            JSON.stringify({ message: '<b>Belge başka bir oturumda güncellendi</b>' }),
          ]),
        }),
        { status: 417, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    await expect(
      adapter.saveRecord({
        doctype: 'Leave Application',
        name: 'HR-LAP-TEST-01',
        modified: '2026-11-22 09:00:00.000001',
        data: { description: 'Taslak metni' },
      }),
    ).rejects.toMatchObject({
      code: 'conflict',
    } satisfies Partial<RecordApiError>);

    // 429 RateLimitExceededError
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ exc_type: 'RateLimitExceededError' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(
      adapter.getRecord({ doctype: 'Leave Application', name: 'HR-LAP-TEST-01' }),
    ).rejects.toMatchObject({
      code: 'rate_limited',
    } satisfies Partial<RecordApiError>);

    // runDocAction sends modified
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ data: { name: 'HR-LAP-TEST-01', modified: '2026-11-22 11:00:00' } }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    const updated = await adapter.runDocAction?.({
      doctype: 'Leave Application',
      name: 'HR-LAP-TEST-01',
      action: 'recalculate',
      modified: '2026-11-22 10:00:00',
    });
    expect(updated?.modified).toBe('2026-11-22 11:00:00');
  });
});
