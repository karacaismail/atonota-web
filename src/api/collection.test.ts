import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import {
  RESTRICTED_SAMPLE_DOCTYPE,
  SAMPLE_COLLECTION_DOCTYPE,
  SAMPLE_CSRF_TOKEN,
  sampleCollection,
} from '@/mocks/fixtures';
import { handlers, mockState, resetMockState } from '@/mocks/handlers';
import { mockServer } from '@/mocks/node';

import { createApiClient } from './client';
import type { ApiConfig } from './config';
import { createCsrfStore } from './csrf';

const SITE = 'https://kiraci.example.test';

const config: ApiConfig = {
  siteUrl: SITE,
  credentials: 'same-origin',
  timeoutMs: 1_000,
  modelTimeoutMs: 2_000,
  keycloakUrl: 'https://kimlik.example.test',
  keycloakRealm: 'platform',
  aiRoute: 'ornek-rota',
  csrfMetaName: 'csrf-token',
};

function api() {
  return createApiClient({ config, csrf: createCsrfStore(SAMPLE_CSRF_TOKEN) });
}

const requests: { method: string; url: URL; csrf: string | null }[] = [];
beforeAll(() => {
  mockServer.listen({ onUnhandledFrame: 'error' });
  mockServer.events.on('request:start', ({ request }) => {
    requests.push({
      method: request.method,
      url: new URL(request.url),
      csrf: request.headers.get('X-Frappe-CSRF-Token'),
    });
  });
});
afterEach(() => {
  mockServer.resetHandlers();
  resetMockState();
  requests.length = 0;
});
afterAll(() => mockServer.close());

describe('listDocuments (Frappe API v2 kayıt listesi)', () => {
  it('sözleşmedeki yolu ve JSON sorgu alanlarını kullanır', async () => {
    const page = await api().listDocuments(SAMPLE_COLLECTION_DOCTYPE, {
      fields: ['name', 'title', 'status'],
      filters: { status: 'Açık' },
      orderBy: 'name asc',
      start: 0,
      limit: 5,
    });

    const sent = requests.at(-1);
    expect(sent?.method).toBe('GET');
    expect(sent?.url.pathname).toBe(
      `/api/v2/document/${encodeURIComponent(SAMPLE_COLLECTION_DOCTYPE)}`,
    );
    expect(JSON.parse(sent?.url.searchParams.get('fields') ?? '')).toEqual([
      'name',
      'title',
      'status',
    ]);
    expect(JSON.parse(sent?.url.searchParams.get('filters') ?? '')).toEqual({ status: 'Açık' });
    expect(sent?.url.searchParams.get('order_by')).toBe('name asc');
    expect(sent?.url.searchParams.get('start')).toBe('0');
    expect(sent?.url.searchParams.get('limit')).toBe('5');
    expect(sent?.csrf).toBeNull();

    expect(page.data).toHaveLength(5);
    expect(page.data[0]).toEqual({
      name: sampleCollection[0]?.name,
      title: sampleCollection[0]?.title,
      status: 'Açık',
    });
    expect(page.hasNextPage).toBe(true);
  });

  it('son sayfada hasNextPage yanlıştır', async () => {
    const total = sampleCollection.length;
    const page = await api().listDocuments(SAMPLE_COLLECTION_DOCTYPE, {
      orderBy: 'name asc',
      start: total - 3,
      limit: 20,
    });
    expect(page.data).toHaveLength(3);
    expect(page.hasNextPage).toBe(false);
  });

  it('alan verilmezse yalnız name döner', async () => {
    const page = await api().listDocuments(SAMPLE_COLLECTION_DOCTYPE, { limit: 1 });
    expect(page.data).toEqual([{ name: expect.any(String) }]);
  });

  it('operatörlü süzgeci gönderir', async () => {
    const page = await api().listDocuments(SAMPLE_COLLECTION_DOCTYPE, {
      filters: [['amount', '>', 400]],
      limit: 100,
    });
    expect(page.data.length).toBeGreaterThan(0);
    expect(JSON.parse(requests.at(-1)?.url.searchParams.get('filters') ?? '')).toEqual([
      ['amount', '>', 400],
    ]);
  });

  it.each([
    ['negatif başlangıç', { start: -1 }],
    ['kesirli başlangıç', { start: 1.5 }],
    ['sıfır sayfa boyu', { limit: 0 }],
    ['çok büyük sayfa boyu', { limit: 101 }],
  ])('%s için istek göndermez', async (_label, query) => {
    await expect(api().listDocuments(SAMPLE_COLLECTION_DOCTYPE, query)).rejects.toMatchObject({
      kind: 'invalid_request',
    });
    expect(requests).toHaveLength(0);
  });

  it('boş kayıt türü adı için istek göndermez', async () => {
    await expect(api().listDocuments('  ')).rejects.toMatchObject({ kind: 'invalid_request' });
    expect(requests).toHaveLength(0);
  });

  it('API v2 yetki reddini forbidden türüne çevirir', async () => {
    await expect(api().listDocuments(RESTRICTED_SAMPLE_DOCTYPE)).rejects.toMatchObject({
      kind: 'forbidden',
      code: 'PermissionError',
    });
  });

  it('oturum bitince session_expired verir', async () => {
    mockState.signedIn = false;
    await expect(api().listDocuments(SAMPLE_COLLECTION_DOCTYPE)).rejects.toMatchObject({
      kind: 'session_expired',
    });
  });

  it.each([
    ['data dizi değil', { data: {}, has_next_page: false }],
    ['kayıt nesne değil', { data: ['x'], has_next_page: false }],
    ['has_next_page yok', { data: [] }],
  ])('%s ise yanıtı reddeder', async (_label, body) => {
    mockServer.use(http.get('*/api/v2/document/:doctype', () => HttpResponse.json(body)));
    await expect(api().listDocuments(SAMPLE_COLLECTION_DOCTYPE)).rejects.toMatchObject({
      kind: 'invalid_response',
    });
  });
});

describe('groupSummary', () => {
  it('süzgeci, toplamı ve grup sınırını uygular', async () => {
    const filters = [[SAMPLE_COLLECTION_DOCTYPE, 'amount', '>=', 50]] as const;
    const result = await api().groupSummary(SAMPLE_COLLECTION_DOCTYPE, {
      groupBy: 'status',
      aggregate: 'sum',
      aggregateField: 'amount',
      filters,
      limit: 1,
    });
    const rows = sampleCollection.filter((row) => row.amount >= 50);
    const open = rows.filter((row) => row.status === 'Açık');

    expect(result).toEqual({
      groups: [
        {
          value: 'Açık',
          count: open.length,
          aggregate: open.reduce((sum, row) => sum + row.amount, 0),
        },
      ],
      totalCount: rows.length,
      truncated: true,
    });
    const sent = requests.at(-1);
    expect(sent?.method).toBe('GET');
    expect(sent?.url.pathname).toBe('/api/method/platform_core.api.collection.group_summary');
    expect(Object.fromEntries(sent?.url.searchParams ?? [])).toEqual({
      doctype: SAMPLE_COLLECTION_DOCTYPE,
      group_by: 'status',
      aggregate: 'sum',
      aggregate_field: 'amount',
      filters: JSON.stringify(filters),
      limit: '1',
    });
    expect(sent?.csrf).toBeNull();
  });

  it.each([
    [400, 'InvalidSummaryQuery', 'invalid_request'],
    [401, 'SessionExpired', 'session_expired'],
    [403, 'PermissionError', 'forbidden'],
    [404, 'DoesNotExistError', 'not_found'],
    [429, 'RateLimitExceededError', 'rate_limited'],
  ])('%i kodunu %s ile işler', async (status, code, kind) => {
    mockServer.use(
      http.get('*/api/method/platform_core.api.collection.group_summary', () =>
        HttpResponse.json({ exc_type: code }, { status, headers: { 'Retry-After': '5' } }),
      ),
    );
    await expect(
      api().groupSummary(SAMPLE_COLLECTION_DOCTYPE, { groupBy: 'status' }),
    ).rejects.toMatchObject({
      status,
      code,
      kind,
      ...(status === 429 ? { retryAfterSeconds: 5 } : {}),
    });
  });

  it('istekte hesaplama yoksa gruba aggregate alanı eklemez', async () => {
    const result = await api().groupSummary(SAMPLE_COLLECTION_DOCTYPE, {
      groupBy: 'status',
      filters: { status: 'Kapalı' },
    });
    expect(result).toEqual({
      groups: [{ value: 'Kapalı', count: 7 }],
      totalCount: 7,
      truncated: false,
    });
    expect(requests.at(-1)?.url.searchParams.has('aggregate')).toBe(false);
    expect(requests.at(-1)?.url.searchParams.has('limit')).toBe(false);
  });

  it('örnek kayıtlarda ortalama hesaplar', async () => {
    const result = await api().groupSummary(SAMPLE_COLLECTION_DOCTYPE, {
      groupBy: 'status',
      aggregate: 'avg',
      aggregateField: 'amount',
      filters: [
        ['amount', 'between', [75, 150]],
        ['status', 'like', 'Kap%'],
      ],
    });
    expect(result.groups).toEqual([{ value: 'Kapalı', count: 2, aggregate: 112.5 }]);
  });

  it('örnek kayıt türünde bilinmeyen alanı reddeder', async () => {
    await expect(
      api().groupSummary(SAMPLE_COLLECTION_DOCTYPE, { groupBy: 'unknown' }),
    ).rejects.toMatchObject({ kind: 'invalid_request', code: 'InvalidSummaryQuery' });
  });

  it('kısıtlı örnek kayıt türünü reddeder', async () => {
    await expect(
      api().groupSummary(RESTRICTED_SAMPLE_DOCTYPE, { groupBy: 'status' }),
    ).rejects.toMatchObject({ kind: 'forbidden', code: 'PermissionError' });
  });

  it('örnek dışındaki kayıt türüyle eşleşmez', async () => {
    const request = new Request(
      `${SITE}/api/method/platform_core.api.collection.group_summary?doctype=Other&group_by=status`,
    );
    const matches = await Promise.all(handlers.map((handler) => handler.test({ request })));
    expect(matches).not.toContain(true);
  });

  it('bozuk grup yanıtını reddeder', async () => {
    mockServer.use(
      http.get('*/api/method/platform_core.api.collection.group_summary', () =>
        HttpResponse.json({
          message: { groups: [{ value: 'Açık', count: 0 }], total_count: 0, truncated: false },
        }),
      ),
    );
    await expect(
      api().groupSummary(SAMPLE_COLLECTION_DOCTYPE, { groupBy: 'status' }),
    ).rejects.toMatchObject({ kind: 'invalid_response' });
  });
});
