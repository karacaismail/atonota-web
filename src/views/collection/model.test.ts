import { describe, expect, it } from 'vitest';
import metaV2 from './fixtures/meta-v2.json';
import { createDefinition, parsePage } from './model';
import { readQuery, writeQuery, toListRequest } from './query';
import { exampleMeta, exampleSource } from './example';
describe('collection contract and URL', () => {
  it('preserves validated record and field sensitivity without hiding authorized fields', () => {
    const meta = structuredClone(exampleMeta);
    meta.schema.sensitivity = 'restricted';
    meta.schema.fields = meta.schema.fields.map((field) => ({
      ...field,
      sensitivity: 'restricted',
    }));
    const definition = createDefinition(meta);
    expect(definition.sensitivity).toBe('restricted');
    expect(definition.columns.find((field) => field.fieldname === 'name')?.sensitivity).toBe(
      'restricted',
    );
    expect(definition.columns.find((field) => field.fieldname === 'subject')?.sensitivity).toBe(
      'restricted',
    );
    expect(() =>
      createDefinition({ ...meta, schema: { ...meta.schema, sensitivity: 'unknown' } }),
    ).toThrow();
    expect(() =>
      createDefinition({ ...meta, schema: { ...meta.schema, sensitivity: undefined } }),
    ).toThrow();
  });
  it('orders tied server results by their stable record identity', () => {
    const definition = createDefinition(exampleMeta);
    const query = readQuery(new URLSearchParams('sort=hours&direction=desc'), definition);
    expect(toListRequest(definition, query).order_by).toBe('hours desc, name asc');
  });
  it('accepts the actual backend catalog v2 fixture and keeps its readable title', () => {
    const definition = createDefinition(metaV2);
    expect(definition.titleField).toBe('title');
    expect(definition.columns.map((field) => field.fieldname)).toContain('title');
    expect(() => createDefinition({ ...metaV2, catalog_version: 99 })).toThrow();
  });
  it('keeps only readable list fields and rejects truncated metadata', () => {
    const meta = structuredClone(exampleMeta);
    meta.schema.fields.push({
      fieldname: 'secret',
      label: 'Gizli alan',
      fieldtype: 'Password',
      read_only: true,
      component: 'Input',
      sensitivity: 'restricted',
      in_list_view: true,
    });
    expect(createDefinition(meta).columns.map((field) => field.fieldname)).not.toContain('secret');
    expect(() => createDefinition({ ...meta, truncated: true })).toThrow();
    expect(() => createDefinition({ schema: {} })).toThrow();
  });
  it('bounds untrusted URL values and preserves unrelated parameters', () => {
    const definition = createDefinition(exampleMeta);
    const query = readQuery(
      new URLSearchParams(
        'view=script&page=-2&size=999&sort=password&direction=drop&filter=secret&value=x',
      ),
      definition,
    );
    expect(query).toMatchObject({
      view: 'table',
      page: 1,
      size: 20,
      sort: 'name',
      direction: 'asc',
      filter: '',
      value: '',
    });
    const next = { ...query, view: 'pivot' as const, search: 'Örnek %_', page: 2 };
    const params = writeQuery(new URLSearchParams('workspace=sample'), next);
    expect(params.get('workspace')).toBe('sample');
    expect(readQuery(params, definition)).toEqual(next);
    expect(toListRequest(definition, next)).toMatchObject({
      limit_start: 20,
      limit_page_length: 20,
      order_by: 'name asc',
    });
  });
  it('rejects malformed server rows and preserves unknown total', () => {
    expect(() => parsePage({ data: [{ name: 2 }], has_next_page: false })).toThrow();
    expect(() => parsePage({ data: [], has_next_page: 'false' })).toThrow();
    expect(parsePage({ data: [{ name: 'DOC-1' }], has_next_page: true }).total).toBeUndefined();
  });
  it('filters, sorts and paginates at the data source boundary', async () => {
    const definition = createDefinition(exampleMeta);
    const query = readQuery(new URLSearchParams('size=10&sort=hours&direction=desc'), definition);
    const first = parsePage(
      await exampleSource.list(toListRequest(definition, query), new AbortController().signal),
    );
    expect(first.data).toHaveLength(10);
    expect(first.has_next_page).toBe(true);
    expect(Number(first.data[0]?.['hours'])).toBeGreaterThanOrEqual(
      Number(first.data[1]?.['hours']),
    );
    const filtered = parsePage(
      await exampleSource.list(
        toListRequest(definition, { ...query, filter: 'status', value: 'Done' }),
        new AbortController().signal,
      ),
    );
    expect(filtered.data.every((row) => row['status'] === 'Done')).toBe(true);
    const controller = new AbortController();
    controller.abort();
    await expect(
      exampleSource.list(toListRequest(definition, query), controller.signal),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });
});
