import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { RESTRICTED_SAMPLE_DOCTYPE, SAMPLE_COLLECTION_DOCTYPE, sampleCollection } from '@/mocks';
import { mockState, resetMockState } from '@/mocks/handlers';
import { mockServer } from '@/mocks/node';
import { createApiSource } from './api-source';
import { parsePage } from './model';
import { readQuery, toListRequest } from './query';
import { sampleDefinition } from './sample';
import { sampleApiClient, sampleSource } from './test-support/api';
import { CollectionError } from './types';

const requests: URL[] = [];
beforeAll(() => {
  mockServer.listen({ onUnhandledFrame: 'error' });
  mockServer.events.on('request:start', ({ request }) => {
    requests.push(new URL(request.url));
  });
});
afterEach(() => {
  mockServer.resetHandlers();
  resetMockState();
  requests.length = 0;
});
afterAll(() => {
  mockServer.close();
});

function request(search = '') {
  return toListRequest(sampleDefinition, readQuery(new URLSearchParams(search), sampleDefinition));
}

describe('createApiSource (listDocuments bağlantısı)', () => {
  it('sends the list request to /api/v2/document with fields, filters, order and paging', async () => {
    const page = parsePage(
      await sampleSource().list(
        request('page=2&size=10&filter=status&value=Açık&sort=amount&direction=desc'),
        new AbortController().signal,
      ),
    );
    const sent = requests.at(-1);
    expect(sent?.pathname).toBe(
      '/api/v2/document/' + encodeURIComponent(SAMPLE_COLLECTION_DOCTYPE),
    );
    expect(JSON.parse(sent?.searchParams.get('fields') ?? '')).toEqual([
      'name',
      'title',
      'status',
      'amount',
    ]);
    expect(JSON.parse(sent?.searchParams.get('filters') ?? '')).toEqual([['status', '=', 'Açık']]);
    expect(sent?.searchParams.get('order_by')).toBe('amount desc, name asc');
    expect(sent?.searchParams.get('start')).toBe('10');
    expect(sent?.searchParams.get('limit')).toBe('10');
    expect(page.data.every((row) => row['status'] === 'Açık')).toBe(true);
    expect(page).not.toHaveProperty('total');
  });

  it('omits empty filters and uses hasNextPage from the server', async () => {
    const source = sampleSource();
    const first = parsePage(await source.list(request(), new AbortController().signal));
    expect(requests.at(-1)?.searchParams.has('filters')).toBe(false);
    expect(first.data).toHaveLength(20);
    expect(first.data[0]?.name).toBe(sampleCollection[0]?.name);
    expect(first.hasNextPage).toBe(true);
    const last = parsePage(await source.list(request('page=2'), new AbortController().signal));
    expect(last.data).toHaveLength(sampleCollection.length - 20);
    expect(last.hasNextPage).toBe(false);
  });

  it('sends the escaped title search as a like filter', async () => {
    await sampleSource().list(request('search=50%_x'), new AbortController().signal);
    expect(JSON.parse(requests.at(-1)?.searchParams.get('filters') ?? '')).toEqual([
      ['title', 'like', '%50\\%\\_x%'],
    ]);
  });

  it('forwards the abort signal to the shared client', async () => {
    const client = { listDocuments: vi.fn().mockResolvedValue({ data: [], hasNextPage: false }) };
    const controller = new AbortController();
    await createApiSource(client).list(request(), controller.signal);
    expect(client.listDocuments).toHaveBeenCalledWith(
      SAMPLE_COLLECTION_DOCTYPE,
      expect.objectContaining({ start: 0, limit: 20, orderBy: 'name asc' }),
      { signal: controller.signal },
    );
  });

  it('maps permission denial to an unauthorized collection error', async () => {
    const source = sampleSource();
    await expect(
      source.list(
        { ...request(), doctype: RESTRICTED_SAMPLE_DOCTYPE },
        new AbortController().signal,
      ),
    ).rejects.toEqual(expect.objectContaining({ name: 'CollectionError', kind: 'unauthorized' }));
  });

  it('maps an expired session to an unauthorized collection error', async () => {
    mockState.signedIn = false;
    await expect(
      createApiSource(sampleApiClient()).list(request(), new AbortController().signal),
    ).rejects.toBeInstanceOf(CollectionError);
    await expect(
      createApiSource(sampleApiClient()).list(request(), new AbortController().signal),
    ).rejects.toMatchObject({ kind: 'unauthorized' });
  });

  it('hides raw server details behind a retryable collection error', async () => {
    mockServer.use(
      http.get('*/api/v2/document/:doctype', () =>
        HttpResponse.json({ errors: [{ type: 'Traceback', message: 'secret' }] }, { status: 500 }),
      ),
    );
    const error: unknown = await sampleSource()
      .list(request(), new AbortController().signal)
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(CollectionError);
    expect(error).toMatchObject({ kind: 'error' });
    expect(String((error as Error).message)).not.toContain('secret');
  });

  it('rethrows aborts unchanged so the cache can ignore them', async () => {
    const abort = new DOMException('Aborted', 'AbortError');
    const client = { listDocuments: vi.fn().mockRejectedValue(abort) };
    await expect(
      createApiSource(client).list(request(), new AbortController().signal),
    ).rejects.toBe(abort);
  });
});
