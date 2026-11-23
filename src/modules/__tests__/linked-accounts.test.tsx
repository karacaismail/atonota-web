// Hesap sayfasındaki "Bağlı hesaplar" bölümü (G-160).
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../../api';
import AccountPage from '../account/Page';
import { ModuleProvider, type LinkedAccountsClient, type ModuleClient } from '../runtime';

const SITE = 'https://kiraci.example.test';

interface Accounts {
  providers: { alias: string; display_name: string; linked: boolean }[];
  local_sign_in_methods: number;
}

const accounts = (linked: string[], local = 0): Accounts => ({
  providers: [
    { alias: 'google', display_name: 'Google', linked: linked.includes('google') },
    { alias: 'facebook', display_name: 'Facebook', linked: linked.includes('facebook') },
    { alias: 'linkedin', display_name: 'LinkedIn', linked: linked.includes('linkedin') },
  ],
  local_sign_in_methods: local,
});

/** Bağlı hesap istemcisi tembel yüklenir. Test istemciyi aynı biçimde verir. */
function linked(
  listLinkedAccounts: LinkedAccountsClient['listLinkedAccounts'],
  unlinkAccount: LinkedAccountsClient['unlinkAccount'] = vi.fn(),
): ModuleClient {
  return { linkedAccounts: () => Promise.resolve({ listLinkedAccounts, unlinkAccount }) };
}

function renderPage(client: ModuleClient) {
  render(
    <ModuleProvider value={{ tenant: SITE, user: 'example-user', mode: 'example', client }}>
      <AccountPage />
    </ModuleProvider>,
  );
  return screen.findByRole('region', { name: 'Bağlı hesaplar' });
}

afterEach(cleanup);

describe('Bağlı hesaplar', () => {
  it('bağlı ve bağlı olmayan platformları gösterir', async () => {
    const region = await renderPage(
      linked(vi.fn().mockResolvedValue(accounts(['google', 'linkedin']))),
    );
    const rows = await within(region).findAllByRole('listitem');
    expect(rows.map((row) => row.querySelector('strong')?.textContent)).toEqual([
      'Google',
      'Facebook',
      'LinkedIn',
    ]);
    expect(rows[0]).toHaveTextContent('Bağlı');
    expect(rows[1]).toHaveTextContent('Bağlı değil');
  });

  it('bağlama bağlantısı backend bağlama yoluna gider', async () => {
    const region = await renderPage(
      linked(vi.fn().mockResolvedValue(accounts(['google', 'linkedin']))),
    );
    const link = await within(region).findByRole('link', { name: 'Facebook hesabını bağla' });
    expect(link).toHaveAttribute(
      'href',
      `${SITE}/api/method/platform_core.api.auth.start_link?provider=facebook&redirect_to=%2Faccount`,
    );
  });

  it('bağı kaldırma onay ister, sonra yeni listeyi gösterir', async () => {
    const unlinkAccount = vi.fn().mockResolvedValue(accounts(['google']));
    const region = await renderPage(
      linked(vi.fn().mockResolvedValue(accounts(['google', 'linkedin'])), unlinkAccount),
    );
    const user = userEvent.setup();
    await user.click(await within(region).findByRole('button', { name: 'LinkedIn bağını kaldır' }));
    expect(unlinkAccount).not.toHaveBeenCalled();
    const confirm = within(region).getByRole('group', { name: 'LinkedIn bağını kaldırma onayı' });
    expect(within(confirm).getByRole('button', { name: 'Vazgeç' })).toHaveFocus();
    await user.click(within(confirm).getByRole('button', { name: 'Bağı kaldır' }));
    expect(unlinkAccount).toHaveBeenCalledWith('linkedin', expect.anything());
    expect(await within(region).findByRole('status')).toHaveTextContent(
      'LinkedIn bağı kaldırıldı.',
    );
    expect(within(region).getByRole('link', { name: 'LinkedIn hesabını bağla' })).toBeVisible();
  });

  it('durum bölgesi baştan boş çizilir, metin sonra yazılır (inceleme 2, bulgu 4)', async () => {
    const region = await renderPage(
      linked(
        vi.fn().mockResolvedValue(accounts(['google', 'linkedin'])),
        vi.fn().mockResolvedValue(accounts(['google'])),
      ),
    );
    await within(region).findByRole('button', { name: 'LinkedIn bağını kaldır' });
    const status = within(region).getByTestId('linked-status');
    expect(status).toHaveAttribute('role', 'status');
    expect(status).toBeEmptyDOMElement();
    const user = userEvent.setup();
    await user.click(within(region).getByRole('button', { name: 'LinkedIn bağını kaldır' }));
    await user.click(within(region).getByRole('button', { name: 'Bağı kaldır' }));
    expect(await within(region).findByTestId('linked-status')).toHaveTextContent(
      'LinkedIn bağı kaldırıldı.',
    );
    expect(within(region).getByTestId('linked-status')).toBe(status);
  });

  it('vazgeçince istek gönderilmez ve odak düğmeye döner', async () => {
    const unlinkAccount = vi.fn();
    const region = await renderPage(
      linked(vi.fn().mockResolvedValue(accounts(['google', 'linkedin'])), unlinkAccount),
    );
    const user = userEvent.setup();
    await user.click(await within(region).findByRole('button', { name: 'LinkedIn bağını kaldır' }));
    await user.keyboard('{Enter}');
    expect(unlinkAccount).not.toHaveBeenCalled();
    expect(within(region).getByRole('button', { name: 'LinkedIn bağını kaldır' })).toHaveFocus();
  });

  it('bağ kalkınca odak aynı satırdaki bağlama bağlantısına gider (inceleme 1, bulgu 7)', async () => {
    const region = await renderPage(
      linked(
        vi.fn().mockResolvedValue(accounts(['google', 'linkedin'])),
        vi.fn().mockResolvedValue(accounts(['google'])),
      ),
    );
    const user = userEvent.setup();
    await user.click(await within(region).findByRole('button', { name: 'LinkedIn bağını kaldır' }));
    await user.click(within(region).getByRole('button', { name: 'Bağı kaldır' }));
    const link = await within(region).findByRole('link', { name: 'LinkedIn hesabını bağla' });
    expect(link).toHaveFocus();
  });

  it('istek sürerken bekleme metni görünür', async () => {
    const region = await renderPage(
      linked(
        vi.fn().mockResolvedValue(accounts(['google', 'linkedin'])),
        vi.fn().mockReturnValue(new Promise(() => undefined)),
      ),
    );
    const user = userEvent.setup();
    await user.click(await within(region).findByRole('button', { name: 'LinkedIn bağını kaldır' }));
    await user.click(within(region).getByRole('button', { name: 'Bağı kaldır' }));
    expect(await within(region).findByRole('status')).toHaveTextContent('Bağ kaldırılıyor.');
  });

  it('son giriş yolu kaldırılamaz ve nedeni yazılır', async () => {
    const region = await renderPage(
      linked(vi.fn().mockResolvedValue(accounts(['google'])), vi.fn()),
    );
    const row = (await within(region).findAllByRole('listitem'))[0]!;
    expect(within(row).queryByRole('button')).not.toBeInTheDocument();
    expect(row).toHaveTextContent('Bu sizin son giriş yolunuz. Bu bağı kaldıramazsınız.');
  });

  it('yerel giriş yolu varsa tek bağ da kaldırılabilir', async () => {
    const region = await renderPage(
      linked(vi.fn().mockResolvedValue(accounts(['google'], 1)), vi.fn()),
    );
    expect(
      await within(region).findByRole('button', { name: 'Google bağını kaldır' }),
    ).toBeVisible();
  });

  it('sunucu son giriş yolu derse yalın uyarı gösterir', async () => {
    const region = await renderPage(
      linked(
        vi.fn().mockResolvedValue(accounts(['google', 'linkedin'])),
        vi
          .fn()
          .mockRejectedValue(
            new ApiError({ kind: 'conflict', status: 409, code: 'LastSignInMethod' }),
          ),
      ),
    );
    const user = userEvent.setup();
    await user.click(await within(region).findByRole('button', { name: 'Google bağını kaldır' }));
    await user.click(within(region).getByRole('button', { name: 'Bağı kaldır' }));
    expect(await within(region).findByRole('alert')).toHaveTextContent(
      'Bu sizin son giriş yolunuz. Bu bağı kaldıramazsınız.',
    );
  });

  it('istemci yoksa bölüm bağlı değil yazar', async () => {
    const region = await renderPage({});
    expect(region).toHaveTextContent('Bu hizmet henüz bağlı değil.');
  });
});
