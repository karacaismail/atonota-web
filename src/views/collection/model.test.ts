import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createApiClient, createCsrfStore, readApiConfig } from '@/api';
import { resetMockState, sampleDocTypeMeta } from '@/mocks';
import { mockServer } from '@/mocks/node';
import { createDefinition, parsePage } from './model';
import { readQuery, writeQuery, toListRequest } from './query';
import { sampleMeta as exampleMeta } from './sample';

beforeAll(() => {
  mockServer.listen({ onUnhandledFrame: 'error' });
});
afterEach(() => {
  mockServer.resetHandlers();
  resetMockState();
});
afterAll(() => {
  mockServer.close();
});

describe('collection contract and URL', () => {
  it('preserves validated record and field sensitivity without hiding authorized fields', () => {
    const meta = structuredClone(exampleMeta);
    meta.schema.sensitivity = 'restricted';
    meta.schema.fields = meta.schema.fields.map((field): (typeof meta.schema.fields)[number] => ({
      ...field,
      sensitivity: 'restricted',
    }));
    const definition = createDefinition(meta);
    expect(definition.sensitivity).toBe('restricted');
    expect(definition.columns.find((field) => field.fieldname === 'name')?.sensitivity).toBe(
      'restricted',
    );
    expect(definition.columns.find((field) => field.fieldname === 'title')?.sensitivity).toBe(
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
    const query = readQuery(new URLSearchParams('sort=amount&direction=desc'), definition);
    expect(toListRequest(definition, query).order_by).toBe('amount desc, name asc');
  });
  it('accepts the api-client mock DocType metadata response and binds example metadata to it', async () => {
    const client = createApiClient({
      config: readApiConfig({}, 'https://kiraci.example.test'),
      csrf: createCsrfStore(),
    });
    const result = await client.getDocType(sampleDocTypeMeta.schema.name);
    expect(result.status).toBe('fresh');
    if (result.status !== 'fresh') throw new Error('Expected fresh DocType metadata');
    const definition = createDefinition(result.meta, { label: 'Örnek kayıtlar' });
    expect(definition.doctype).toBe(sampleDocTypeMeta.schema.name);
    expect(definition.label).toBe('Örnek kayıtlar');
    expect(definition.titleField).toBe('title');
    expect(definition.columns.map((field) => field.fieldname)).toEqual(['name', 'title']);
    expect(() => createDefinition({ ...result.meta, catalog_version: 99 })).toThrow();

    expect(exampleMeta.catalog_version).toBe(sampleDocTypeMeta.catalog_version);
    expect(exampleMeta.meta_hash).toBe(sampleDocTypeMeta.meta_hash);
    expect(exampleMeta.perm_version).toBe(sampleDocTypeMeta.perm_version);
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
  it('rejects malformed server rows and reads hasNextPage', () => {
    expect(() => parsePage({ data: [{ name: 2 }], hasNextPage: false })).toThrow();
    expect(() => parsePage({ data: [], hasNextPage: 'false' })).toThrow();
    expect(() => parsePage({ data: [], has_next_page: false })).toThrow();
    expect(parsePage({ data: [{ name: 'DOC-1' }], hasNextPage: true })).toEqual({
      data: [{ name: 'DOC-1' }],
      hasNextPage: true,
    });
  });
});
