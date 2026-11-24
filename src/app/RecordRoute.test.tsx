import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ApiClient } from '@/api';
import type * as RecordModule from '@/views/record';
import type { RecordDataAdapter, RecordViewProps } from '@/views/record';

const seen: { adapter?: RecordDataAdapter; renderLink?: RecordViewProps['renderRecordLink'] } = {};

vi.mock('@/views/record', async (importOriginal) => ({
  ...(await importOriginal<typeof RecordModule>()),
  RecordView: (props: RecordViewProps) => {
    seen.adapter = props.adapter;
    seen.renderLink = props.renderRecordLink;
    return <p>{`${props.doctype}|${props.name ?? ''}|${props.locale ?? ''}`}</p>;
  },
}));

const { default: RecordRoute } = await import('./RecordRoute');

function fakeApi() {
  const frappeDocument = vi.fn<ApiClient['frappeDocument']>().mockResolvedValue({
    ok: true,
    status: 200,
    etag: undefined,
    body: { data: { name: 'ORNEK-0001', modified: '2026-11-23 10:00:00' } },
  });
  return { api: { frappeDocument } as Pick<ApiClient, 'frappeDocument'>, frappeDocument };
}

describe('RecordRoute', () => {
  it('adresteki DocType ve kayıt adını kayıt görünümüne verir', () => {
    const { api } = fakeApi();
    render(
      <RecordRoute api={api} module="hr" doctype="leave-application" name="HR-LAP-2026-00001" />,
    );
    expect(screen.getByText('Leave Application|HR-LAP-2026-00001|tr')).toBeInTheDocument();
  });

  it('kodlanmış kayıt adını çözer', () => {
    const { api } = fakeApi();
    render(<RecordRoute api={api} module="core" doctype="user" name="kisi%40example.test" />);
    expect(screen.getByText('User|kisi@example.test|tr')).toBeInTheDocument();
  });

  it('kayıt isteklerini ortak API istemcisiyle gönderir (inceleme 2, Ö3)', async () => {
    const { api, frappeDocument } = fakeApi();
    render(<RecordRoute api={api} module="ornek" doctype="örnek-kayıt" name="ORNEK-0001" />);
    const record = await seen.adapter?.getRecord({ doctype: 'Örnek Kayıt', name: 'ORNEK-0001' });
    expect(record?.name).toBe('ORNEK-0001');
    expect(frappeDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        path: `/api/resource/${encodeURIComponent('Örnek Kayıt')}/ORNEK-0001`,
      }),
    );
  });

  it('kabuğun sayfa çerçevesini çizmez; yalnız içeriği verir (inceleme 2, K3)', () => {
    const { api } = fakeApi();
    const { container } = render(
      <RecordRoute api={api} module="ornek" doctype="örnek-kayıt" name="ORNEK-0001" />,
    );
    expect(container.querySelector('[class*="shell-"]')).toBeNull();
  });
});

describe('RecordRoute: bağlantı alanı', () => {
  it('hedef kayda aynı modül yolunda bağlantı çizer; yönlendirici panel yolunu ekler', async () => {
    const { MemoryRouter } = await import('react-router-dom');
    const { api } = fakeApi();
    render(<RecordRoute api={api} module="ornek" doctype="örnek-kayıt" name="ORNEK-0003" />);
    expect(seen.renderLink).toBeDefined();
    render(
      <MemoryRouter basename="/panel" initialEntries={['/panel/']}>
        {seen.renderLink?.({ doctype: 'Örnek Kayıt', name: 'ORNEK-0002' }, 'ORNEK-0002')}
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'ORNEK-0002' }).getAttribute('href')).toBe(
      `/panel/ornek/${encodeURIComponent('örnek-kayıt')}/ORNEK-0002`,
    );
  });

  it('adrese geri çevrilemeyen türde bağlantı çizmez', async () => {
    const { slugFromDoctype } = await import('./record-slug');
    expect(slugFromDoctype('Örnek Kayıt')).toBe('örnek-kayıt');
    expect(slugFromDoctype('Sales Invoice')).toBe('sales-invoice');
    expect(slugFromDoctype('ToDo')).toBeUndefined();
  });
});
