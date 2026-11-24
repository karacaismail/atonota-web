import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import {
  RESTRICTED_SAMPLE_DOCTYPE,
  SAMPLE_COLLECTION_DOCTYPE,
  sampleDocTypeMeta,
} from './fixtures';
import { mockState, resetMockState } from './handlers';
import { mockServer } from './node';

const SITE = 'https://kiraci.example.test';

function searchUrl(doctype: string, txt: string): string {
  const url = new URL(`${SITE}/api/method/frappe.desk.search.search_link`);
  url.searchParams.set('doctype', doctype);
  url.searchParams.set('txt', txt);
  url.searchParams.set('page_length', '10');
  return url.toString();
}

beforeAll(() => mockServer.listen({ onUnhandledFrame: 'error' }));
afterEach(() => {
  mockServer.resetHandlers();
  resetMockState();
});
afterAll(() => mockServer.close());

describe('sahte sunucu: bağlantı araması (frappe.desk.search.search_link)', () => {
  it('örnek kayıt türünde başlığa göre arar ve en çok page_length sonuç verir', async () => {
    const response = await fetch(searchUrl(SAMPLE_COLLECTION_DOCTYPE, 'veri 5'));
    expect(response.status).toBe(200);
    const body = (await response.json()) as { message: { value: string; label?: string }[] };
    expect(body.message).toEqual([{ value: 'ORNEK-0005', label: 'Örnek veri 5' }]);

    const all = (await (await fetch(searchUrl(SAMPLE_COLLECTION_DOCTYPE, ''))).json()) as {
      message: unknown[];
    };
    expect(all.message).toHaveLength(10);
  });

  it('izni olmayan türde 403 verir ve kayıt adı sızdırmaz', async () => {
    const response = await fetch(searchUrl(RESTRICTED_SAMPLE_DOCTYPE, ''));
    expect(response.status).toBe(403);
    const text = await response.text();
    expect(text).not.toMatch(/ORNEK-|GIZLI-/);
  });

  it('oturum yoksa 401 verir', async () => {
    mockState.signedIn = false;
    const response = await fetch(searchUrl(SAMPLE_COLLECTION_DOCTYPE, ''));
    expect(response.status).toBe(401);
  });

  it('örnek kayıt türünün tanımında arka ucun link-select adıyla bağlantı alanları vardır', () => {
    const links = sampleDocTypeMeta.schema.fields.filter((f) => f.fieldtype === 'Link');
    expect(links.map((f) => [f.fieldname, f.component, f.read_only])).toEqual([
      ['ilgili_kayit', 'link-select', false],
      ['kaynak_kayit', 'link-select', true],
      ['gizli_kayit', 'link-select', false],
    ]);
  });
});
