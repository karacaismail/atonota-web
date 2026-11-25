// "Müşteriler" sayfası (G-169, G-170, AJA-834). Test koddan önce yazıldı.
// Sayfa bayinin bağlı müşterilerini ve site durumlarını gösterir.
// "Reseller Admin" yeni müşteri isteği gönderir. "Reseller Assistant" yalnız okur.
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import CustomersPage from '../customers/Page';
import SitePlanPage from '../site-plan/Page';
import { ModuleProvider, type ModuleClient, type ResellerClient } from '../runtime';

const customers = [
  { customer_tenant: 'musteri-a.example.test' },
  { customer_tenant: 'musteri-b.example.test' },
];

function resellerClient(overrides: Partial<ResellerClient> = {}): ResellerClient {
  return {
    listCustomers: vi.fn().mockResolvedValue(customers),
    customerStatus: vi.fn((tenant: string) =>
      Promise.resolve({
        customer_tenant: tenant,
        status: tenant.startsWith('musteri-a') ? 'active' : 'pending',
      }),
    ),
    requestCustomer: vi.fn().mockResolvedValue({ name: 'RCR-0001' }),
    ...overrides,
  };
}

function client(roles: string[], reseller = resellerClient()): ModuleClient {
  return {
    getProfile: vi
      .fn()
      .mockResolvedValue({ name: 'bayi@example.test', fullName: 'Örnek Bayi', roles }),
    resellers: () => Promise.resolve(reseller),
  };
}

function show(node: React.ReactNode, moduleClient: ModuleClient) {
  return render(
    <ModuleProvider
      value={{
        tenant: 'bayi.example.test',
        user: 'bayi@example.test',
        mode: 'example',
        client: moduleClient,
      }}
    >
      {node}
    </ModuleProvider>,
  );
}

afterEach(cleanup);

describe('"Müşteriler" sayfası', () => {
  it('bağlı müşterileri ve site durumlarını gösterir', async () => {
    show(<CustomersPage />, client(['Website User', 'Reseller Admin']));
    expect(screen.getByRole('heading', { level: 1, name: 'Müşteriler' })).toBeVisible();
    expect(await screen.findByText('musteri-a.example.test')).toBeVisible();
    expect(screen.getByText('musteri-b.example.test')).toBeVisible();
    expect(await screen.findByText('Çalışıyor')).toBeVisible();
    expect(screen.getByText('Kuruluyor')).toBeVisible();
  });

  it('"Reseller Admin" yeni müşteri isteği gönderir', async () => {
    const reseller = resellerClient();
    show(<CustomersPage />, client(['Website User', 'Reseller Admin'], reseller));
    fireEvent.click(await screen.findByRole('button', { name: 'Yeni müşteri isteği' }));
    fireEvent.change(screen.getByLabelText('Müşteri adı'), { target: { value: 'Örnek Müşteri' } });
    fireEvent.change(screen.getByLabelText('İletişim adresi'), {
      target: { value: 'yeni.musteri@example.test' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'İsteği gönder' }));
    await waitFor(() =>
      expect(reseller.requestCustomer).toHaveBeenCalledWith(
        { customer_name: 'Örnek Müşteri', contact_email: 'yeni.musteri@example.test' },
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      ),
    );
    expect(await screen.findByText(/İsteğiniz gönderildi/)).toBeVisible();
    expect(screen.getByText(/RCR-0001/)).toBeVisible();
    expect(screen.queryByText(/yalnız okuyabilirsiniz/i)).not.toBeInTheDocument();
  });

  it('"Reseller Assistant" sayfayı yalnız okur ve yeni müşteri düğmesini görmez', async () => {
    show(<CustomersPage />, client(['Website User', 'Reseller Assistant']));
    expect(await screen.findByText('musteri-a.example.test')).toBeVisible();
    expect(await screen.findByText(/yalnız okuyabilirsiniz/i)).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Yeni müşteri isteği' })).not.toBeInTheDocument();
  });

  it('müşteri yoksa boş liste notu görünür', async () => {
    const reseller = resellerClient({ listCustomers: vi.fn().mockResolvedValue([]) });
    show(<CustomersPage />, client(['Website User', 'Reseller Admin'], reseller));
    expect(await screen.findByText('Bağlı müşteriniz yok.')).toBeVisible();
  });

  it('sunucu reddederse yetki notu görünür', async () => {
    const reseller = resellerClient({
      listCustomers: vi.fn().mockRejectedValue({ kind: 'forbidden' }),
    });
    show(<CustomersPage />, client(['Website User', 'Reseller Admin'], reseller));
    expect(await screen.findByRole('alert')).toHaveTextContent('Bu işlem için yetkiniz yok.');
  });
});

describe('"Site ve plan" sayfasında yalnız okuma notu', () => {
  it('"Reseller Assistant" yalnız okuma notunu görür', async () => {
    show(<SitePlanPage />, client(['Website User', 'Reseller Assistant']));
    expect(await screen.findByText(/yalnız okuyabilirsiniz/i)).toBeVisible();
  });

  it('"Reseller Admin" yalnız okuma notunu görmez', async () => {
    const moduleClient = client(['Website User', 'Reseller Admin']);
    show(<SitePlanPage />, moduleClient);
    await waitFor(() => expect(moduleClient.getProfile).toHaveBeenCalled());
    await Promise.resolve();
    expect(screen.queryByText(/yalnız okuyabilirsiniz/i)).not.toBeInTheDocument();
  });
});
