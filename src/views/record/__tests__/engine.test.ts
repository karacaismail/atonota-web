import { afterEach, describe, expect, it, vi } from 'vitest';

import { createApiClient, createCsrfStore, readApiConfig } from '@/api';

import { createFrappeRecordAdapter, type RecordApiError, stripHtmlTagsSafe } from '../adapter';
import { evaluateFieldState } from '../conditions';
import { buildFormLayout } from '../layout';
import { formatRecordMessage, RECORD_MESSAGES } from '../messages';
import {
  SchemaValidationError,
  validateDocTypeMeta,
  validateLinkSearchResponse,
  validateRecordAgainstMeta,
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

  it('validates record field types against DocTypeMeta, strips undeclared keys, and preserves null vs empty string (Review 1 Finding 5)', () => {
    const meta = validateDocTypeMeta(SAMPLE_META_ENVELOPE);
    const sanitized = validateRecordAgainstMeta(
      {
        name: 'HR-LAP-TEST-01',
        modified: '2026-11-22 09:00:00.000001',
        docstatus: 0,
        amended_from: null,
        employee: '',
        employee_name: null,
        total_leave_days: 3.5,
        undeclared_internal_tag: 'should-be-dropped',
      },
      meta,
    );

    expect(sanitized['employee']).toBe('');
    expect(sanitized['employee_name']).toBeNull();
    expect(sanitized['amended_from']).toBeNull();
    expect(sanitized['total_leave_days']).toBe(3.5);
    expect('undeclared_internal_tag' in sanitized).toBe(false);

    expect(() =>
      validateRecordAgainstMeta(
        {
          name: 'HR-LAP-BAD',
          total_leave_days: { bad: true },
        },
        meta,
      ),
    ).toThrow(SchemaValidationError);
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
  const SITE = 'https://kiraci.example.test';

  /**
   * Bağdaştırıcı ortak API istemcisini kullanır (inceleme 2, Ö3 ve B3).
   * İstemci gerçek `createApiClient` ile kurulur. Yalnız ağ (`fetch`) taklit edilir.
   */
  function setup(csrfToken = 'csrf-test-token') {
    const fetchMock = vi.fn<(request: Request) => Promise<Response>>();
    vi.stubGlobal('fetch', fetchMock);
    const onSessionExpired = vi.fn();
    const csrf = createCsrfStore(csrfToken);
    const api = createApiClient({
      config: { ...readApiConfig({ VITE_SITE_URL: SITE }, SITE), timeoutMs: 1_000 },
      csrf,
      onSessionExpired,
    });
    const adapter = createFrappeRecordAdapter({ api });
    const requestAt = (index: number): Request => {
      const request = fetchMock.mock.calls[index]?.[0];
      if (!(request instanceof Request)) throw new Error(`istek yok: ${index}`);
      return request;
    };
    return { fetchMock, adapter, csrf, onSessionExpired, requestAt };
  }

  afterEach(() => {
    vi.unstubAllGlobals();
    document.head.querySelectorAll('meta[name="csrf-token"]').forEach((meta) => meta.remove());
  });

  it('preserves "<" comparisons and decodes HTML entities when stripping HTML tags (Review 1 Minor 1)', () => {
    expect(stripHtmlTagsSafe('Tutar: a < b &amp; <b>önemli</b>')).toBe('Tutar: a < b & önemli');
  });

  it('handles HTTP 304 Not Modified on getDocTypeMeta with ETag cache instead of throwing server_error (Review 1 Finding 2)', async () => {
    const { fetchMock, adapter, requestAt } = setup();

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

    const firstMeta = await adapter.getDocTypeMeta({ doctype: 'Leave Application' });
    expect(firstMeta.schema.name).toBe('Leave Application');

    const cachedMeta = await adapter.getDocTypeMeta({
      doctype: 'Leave Application',
      etag: '"etag-v1"',
    });
    expect(cachedMeta.schema.name).toBe('Leave Application');
    expect(requestAt(1).headers.get('If-None-Match')).toBe('"etag-v1"');
  });

  it('treats 403 Guest or Guest message on get_logged_user session probe as session_expired (Review 1 Finding 3)', async () => {
    const { fetchMock, adapter, onSessionExpired } = setup();

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

    await expect(
      adapter.getRecord({ doctype: 'Leave Application', name: 'HR-LAP-TEST-01' }),
    ).rejects.toMatchObject({
      code: 'session_expired',
    } satisfies Partial<RecordApiError>);
    // Oturum bitince ortak oturum işi (girişe dönüş) çalışır.
    expect(onSessionExpired).toHaveBeenCalledTimes(1);

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
    const { fetchMock, adapter, requestAt } = setup();

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ data: { name: 'HR-LAP-TEST-01', modified: '2026-11-22 10:00:00' } }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );

    await adapter.saveRecord({
      doctype: 'Leave Application',
      name: 'HR-LAP-TEST-01',
      modified: '2026-11-22 09:00:00.000001',
      data: { description: 'Güncel açıklama' },
    });

    const request = requestAt(0);
    expect(request.url).toBe(`${SITE}/api/resource/Leave%20Application/HR-LAP-TEST-01`);
    expect(request.method).toBe('PUT');
    expect(request.headers.get('X-Frappe-CSRF-Token')).toBe('csrf-test-token');
    expect(await request.json()).toEqual({
      description: 'Güncel açıklama',
      modified: '2026-11-22 09:00:00.000001',
    });

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
      message: 'Belge başka bir oturumda güncellendi',
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
    expect(requestAt(3).headers.get('X-Frappe-CSRF-Token')).toBe('csrf-test-token');
  });

  it('CSRF belirtecini sayfadaki meta öğesinden değil ortak depodan alır (inceleme 2, B3)', async () => {
    const { fetchMock, adapter, csrf, requestAt } = setup('ilk-belirtec');
    const meta = document.createElement('meta');
    meta.name = 'csrf-token';
    meta.content = 'eski-sayfa-belirteci';
    document.head.append(meta);
    const saved = () =>
      new Response(JSON.stringify({ data: { name: 'ORNEK-0001', modified: '2026-11-23' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    fetchMock.mockResolvedValueOnce(saved()).mockResolvedValueOnce(saved());
    const save = () =>
      adapter.saveRecord({
        doctype: 'Örnek Kayıt',
        name: 'ORNEK-0001',
        modified: '2026-11-23 09:00:00',
        data: { title: 'Yeni' },
      });

    await save();
    // Çıkışta ortak depo belirteci siler. Sayfadaki eski belirteç yine de gönderilmez.
    csrf.clear();
    await save();

    expect(requestAt(0).headers.get('X-Frappe-CSRF-Token')).toBe('ilk-belirtec');
    expect(requestAt(1).headers.has('X-Frappe-CSRF-Token')).toBe(false);
  });

  it('ağ hatasını ve geçersiz yanıtı kayıt hata koduna çevirir', async () => {
    const { fetchMock, adapter } = setup();
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(adapter.getRecord({ doctype: 'User', name: 'x' })).rejects.toMatchObject({
      code: 'network',
    } satisfies Partial<RecordApiError>);

    fetchMock.mockResolvedValueOnce(
      new Response('<html></html>', { status: 200, headers: { 'Content-Type': 'text/html' } }),
    );
    await expect(adapter.getRecord({ doctype: 'User', name: 'x' })).rejects.toMatchObject({
      code: 'invalid_response',
    } satisfies Partial<RecordApiError>);
  });

  it('doğrulama hatasında sunucunun temizlenmiş iletisini verir', async () => {
    const { fetchMock, adapter } = setup();
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          exc_type: 'MandatoryError',
          _server_messages: JSON.stringify([JSON.stringify({ message: '<b>Başlık</b> zorunlu' })]),
        }),
        { status: 417, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    await expect(
      adapter.saveRecord({ doctype: 'Örnek Kayıt', data: { title: '' } }),
    ).rejects.toMatchObject({
      code: 'validation',
      message: 'Başlık zorunlu',
    } satisfies Partial<RecordApiError>);
  });
});
