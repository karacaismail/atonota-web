import { describe, expect, it, vi } from 'vitest';

import { sampleDocTypeMeta as sampleMeta } from '@/mocks/fixtures';

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

  it('liste başlığı DocType adını gösterir, "Kayıtlar" yazmaz', async () => {
    const getDocType = vi.fn().mockResolvedValue({ status: 'fresh', meta: sampleMeta });
    const data = createShellViewData({ listDocuments: vi.fn(), getDocType } as never);
    const definition = await data.collection?.loadDefinition(
      { module: 'ornek', doctype: encodeURIComponent('örnek-kayıt') },
      new AbortController().signal,
    );
    expect(definition?.label).toBe('Örnek Kayıt');
  });

  it('tanım gelmeden de sayfa başlığını adresten verir', () => {
    const data = createShellViewData({ listDocuments: vi.fn(), getDocType: vi.fn() } as never);
    expect(data.collection?.title?.({ module: 'satis', doctype: 'teklif' })).toBe('Teklif');
    expect(data.collection?.title?.({ module: 'm', doctype: 'sales-invoice' })).toBe(
      'Sales Invoice',
    );
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

describe('menü verisi (navigation)', () => {
  const sidebar = (name: string, data: Record<string, unknown>) => ({ name, data });

  it('açılış verisindeki sidebar satırlarından yalnız DocType bağlantılarını alır', async () => {
    const getBootstrap = vi.fn().mockResolvedValue({
      sidebars: [
        sidebar('Satış', {
          label: 'Satış',
          module: 'Selling',
          items: [
            { label: 'Teklifler', link_type: 'DocType', link_to: 'Quotation' },
            { label: 'Rapor', link_type: 'Report', link_to: 'Sales Register' },
            { label: 'Gizli', link_type: 'DocType', link_to: 'Customer', hidden: 1 },
            { label: null, link_type: 'DocType', link_to: 'Sales Order' },
            // Adresten geri çevrilemeyen ad menüye girmez: tıklanınca başka türe giderdi.
            { label: 'Fiyat', link_type: 'DocType', link_to: 'Item-Price' },
            { label: 'Ayraç', type: 'Section Break' },
          ],
        }),
        sidebar('Boş', { label: 'Boş', items: [{ link_type: 'Workspace', link_to: 'Boş' }] }),
      ],
    });
    const data = createShellViewData({
      listDocuments: vi.fn(),
      getDocType: vi.fn(),
      getBootstrap,
    } as never);
    const signal = new AbortController().signal;
    await expect(data.navigation?.loadSidebars(signal)).resolves.toEqual([
      {
        id: 'Satış',
        label: 'Satış',
        module: 'selling',
        links: [
          { label: 'Teklifler', doctype: 'Quotation' },
          { label: 'Sales Order', doctype: 'Sales Order' },
        ],
      },
    ]);
    expect(getBootstrap).toHaveBeenCalledWith({ signal });
  });

  it('sahte sunucunun açılış verisinde sidebar yoksa menüye grup eklemez', async () => {
    const getBootstrap = vi.fn().mockResolvedValue({ sidebars: [] });
    const data = createShellViewData({ getBootstrap } as never);
    await expect(data.navigation?.loadSidebars(new AbortController().signal)).resolves.toEqual([]);
  });

  it('istek başarısızsa uydurma grup göstermez', async () => {
    const getBootstrap = vi.fn().mockRejectedValue(new Error('ağ'));
    const data = createShellViewData({ getBootstrap } as never);
    await expect(data.navigation?.loadSidebars(new AbortController().signal)).resolves.toEqual([]);
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
