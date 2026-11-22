import { describe, expect, it } from 'vitest';
import { createDefinition, parsePage } from './model';
import { readQuery, writeQuery, toListRequest } from './query';
import { exampleMeta, exampleSource } from './example';
describe('collection contract and URL', () => {
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
