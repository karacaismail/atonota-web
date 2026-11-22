import { describe, expect, it, vi } from 'vitest';

import { createFrappeRecordAdapter, type RecordApiError } from '../adapter';
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
                  // value missing for eq operator!
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
                  value: 'Open', // forbidden on truthy!
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
    expect(doc.amended_from).toBeNull();
    expect(doc.description).toBe('');
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

describe('layout builder (tabs, sections, columns, phone single-column)', () => {
  it('builds tabs, sections, and columns and forces single column on phone', () => {
    const meta: DocTypeMeta = validateDocTypeMeta(SAMPLE_META_ENVELOPE);
    const desktopLayout = buildFormLayout(meta.schema.fields, {
      doc: {},
      isPhoneViewport: false,
    });

    expect(desktopLayout.hasExplicitTabs).toBe(true);
    expect(desktopLayout.tabs).toHaveLength(2);
    expect(desktopLayout.tabs[0]?.label).toBe('Detay');
    expect(desktopLayout.tabs[0]?.sections[0]?.columns).toHaveLength(2);
    expect(desktopLayout.tabs[0]?.sections[0]?.effectiveColumnCount).toBe(2);

    const phoneLayout = buildFormLayout(meta.schema.fields, {
      doc: {},
      isPhoneViewport: true,
    });
    expect(phoneLayout.tabs[0]?.sections[0]?.effectiveColumnCount).toBe(1);
  });
});

describe('dirty tracking & contract validation (RE-3, AD-10)', () => {
  it('computes dirty field count accurately and validates required and non-negative rules', () => {
    const meta = validateDocTypeMeta(SAMPLE_META_ENVELOPE);
    const base = {
      name: 'HR-LAP-TEST-01',
      modified: '2026-11-22 09:00:00.000001',
      employee: 'HR-EMP-TEST-01',
      employee_name: 'Örnek Kişi',
      total_leave_days: 2,
    };
    const draft = {
      ...base,
      employee: '',
      total_leave_days: -3,
    };

    const dirty = computeDirtyFields(meta.schema.fields, base, draft);
    expect(dirty).toEqual(['employee', 'total_leave_days']);

    const errors = validateRecordDraft(meta, draft, 'tr');
    expect(errors.employee).toBeDefined();
    expect(errors.total_leave_days).toBeDefined();
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

describe('Frappe HTTP adapter (SZ-5, SZ-7, SZ-8, SZ-11)', () => {
  it('sends modified and X-Frappe-CSRF-Token on record update and translates TimestampMismatchError', async () => {
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

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [requestUrl, requestInit] = fetchMock.mock.calls[0] ?? [];
    expect(requestUrl).toBe('/api/resource/Leave%20Application/HR-LAP-TEST-01');
    expect(requestInit?.method).toBe('PUT');
    const headers = new Headers(requestInit?.headers);
    expect(headers.get('X-Frappe-CSRF-Token')).toBe('csrf-test-token');
    const sentBody = JSON.parse(String(requestInit?.body)) as Record<string, unknown>;
    expect(sentBody['modified']).toBe('2026-11-22 09:00:00.000001');
    expect(sentBody['description']).toBe('Güncel açıklama');

    // Simulate 417 TimestampMismatchError with double-encoded _server_messages
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          exc_type: 'TimestampMismatchError',
          exception: 'frappe.exceptions.TimestampMismatchError: Document has been modified',
          _server_messages: JSON.stringify([
            JSON.stringify({ message: '<b>Belge başka bir oturumda güncellendi</b>' }),
          ]),
        }),
        {
          status: 417,
          headers: { 'Content-Type': 'application/json' },
        },
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
  });

  it('disambiguates ambiguous 403 via get_logged_user without caching (SZ-8)', async () => {
    const fetchMock = vi.fn<typeof fetch>();

    // First call: 403 with empty JSON
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({}), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    // Second call: get_logged_user returns 401 SessionExpired
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ exc_type: 'SessionExpired', session_expired: 1 }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const adapter = createFrappeRecordAdapter({ fetchFn: fetchMock });

    await expect(
      adapter.getRecord({ doctype: 'Leave Application', name: 'HR-LAP-TEST-01' }),
    ).rejects.toMatchObject({
      code: 'session_expired',
    } satisfies Partial<RecordApiError>);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [probeUrl, probeInit] = fetchMock.mock.calls[1] ?? [];
    expect(probeUrl).toBe('/api/method/frappe.auth.get_logged_user');
    expect(probeInit?.cache).toBe('no-store');
  });
});
