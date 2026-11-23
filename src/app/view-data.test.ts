import { describe, expect, it, vi } from 'vitest';

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
