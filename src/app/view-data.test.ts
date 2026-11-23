import { describe, expect, it, vi } from 'vitest';

import { createShellViewData, doctypeFromSlug } from './view-data';

describe('doctypeFromSlug', () => {
  it('adres parçasını DocType adına çevirir', () => {
    expect(doctypeFromSlug('sales-invoice')).toBe('Sales Invoice');
    expect(doctypeFromSlug('user')).toBe('User');
    expect(doctypeFromSlug('Leave%20Application')).toBe('Leave Application');
  });
});

describe('createShellViewData', () => {
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
    expect(page).toEqual({ data: [{ name: 'A' }], has_next_page: true });
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
