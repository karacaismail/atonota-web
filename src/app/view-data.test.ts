import { render, screen } from '@testing-library/react';
import { createElement, Suspense } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('./RecordRoute', () => ({
  default: (props: { api: unknown; doctype: string; name: string }) =>
    createElement('p', null, `${props.doctype}|${props.name}|${String(props.api === recordApi)}`),
}));

const recordApi = { listDocuments: vi.fn(), getDocType: vi.fn(), frappeDocument: vi.fn() };

import { createShellViewData, doctypeFromSlug, loadShellAccount } from './view-data';

describe('doctypeFromSlug', () => {
  it('adres parçasını DocType adına çevirir', () => {
    expect(doctypeFromSlug('sales-invoice')).toBe('Sales Invoice');
    expect(doctypeFromSlug('user')).toBe('User');
    expect(doctypeFromSlug('Leave%20Application')).toBe('Leave Application');
  });
});

describe('createShellViewData', () => {
  it('kayıt rotasını kayıt görünümüne bağlar', () => {
    const data = createShellViewData({ listDocuments: vi.fn(), getDocType: vi.fn() } as never);
    expect(data.record?.Component).toBeDefined();
  });

  it('kayıt rotasına oturumun ortak API istemcisini verir (inceleme 2, Ö3)', async () => {
    const data = createShellViewData(recordApi as never);
    const Record = data.record?.Component;
    if (!Record) throw new Error('kayıt bağlantısı yok');
    render(
      createElement(
        Suspense,
        { fallback: null },
        createElement(Record, { module: 'ornek', doctype: 'örnek-kayıt', name: 'ORNEK-0001' }),
      ),
    );
    expect(await screen.findByText('örnek-kayıt|ORNEK-0001|true')).toBeInTheDocument();
  });

  it('liste isteğini API v2 sorgusuna çevirir', async () => {
    const listDocuments = vi.fn().mockResolvedValue({ data: [{ name: 'A' }], hasNextPage: true });
    const data = createShellViewData({ listDocuments, getDocType: vi.fn() } as never);
    const signal = new AbortController().signal;
    const page = await data.collection?.source.list(
      {
        doctype: 'User',
        fields: ['name', 'full_name'],
        filters: [['enabled', '=', '1']],
        order_by: 'modified desc',
        limit_start: 20,
        limit_page_length: 20,
      },
      signal,
    );
    expect(listDocuments).toHaveBeenCalledWith(
      'User',
      {
        fields: ['name', 'full_name'],
        filters: [['enabled', '=', '1']],
        orderBy: 'modified desc',
        start: 20,
        limit: 20,
      },
      { signal },
    );
    expect(page).toEqual({ data: [{ name: 'A' }], hasNextPage: true });
  });

  it('tanımı sunucunun DocType bilgisinden kurar', async () => {
    const getDocType = vi.fn().mockResolvedValue({ status: 'not_modified' });
    const data = createShellViewData({ listDocuments: vi.fn(), getDocType } as never);
    await expect(
      data.collection?.loadDefinition(
        { module: 'core', doctype: 'user' },
        new AbortController().signal,
      ),
    ).rejects.toThrow();
    expect(getDocType).toHaveBeenCalledWith('User', undefined, expect.objectContaining({}));
  });
});

describe('loadShellAccount', () => {
  it('görünen adı açılış verisinden alır', async () => {
    const getBootstrap = vi
      .fn()
      .mockResolvedValue({ user: { name: 'a@example.test', full_name: 'Ada Kaya' } });
    await expect(loadShellAccount({ getBootstrap } as never, 'a@example.test')).resolves.toEqual({
      user: 'a@example.test',
      fullName: 'Ada Kaya',
    });
  });

  it('açılış verisi başka kullanıcıya aitse adı kullanmaz', async () => {
    const getBootstrap = vi
      .fn()
      .mockResolvedValue({ user: { name: 'b@example.test', full_name: 'Başka' } });
    await expect(loadShellAccount({ getBootstrap } as never, 'a@example.test')).resolves.toEqual({
      user: 'a@example.test',
    });
  });

  it('istek başarısızsa yalnız kullanıcı kimliğini döner', async () => {
    const getBootstrap = vi.fn().mockRejectedValue(new Error('ağ'));
    await expect(loadShellAccount({ getBootstrap } as never, 'a@example.test')).resolves.toEqual({
      user: 'a@example.test',
    });
  });
});
