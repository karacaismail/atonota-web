import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ModuleProvider, type ModuleClient, type UserAdminClient } from '../runtime';
import AdministrationPage from './Page';

const SELF = 'yonetici@example.test';
const OTHER = 'ornek.calisan@example.test';

function fakeClient(overrides: Partial<UserAdminClient> = {}): UserAdminClient {
  return {
    listUsers: vi.fn().mockResolvedValue({
      users: [
        { name: SELF, fullName: 'Örnek Yönetici', enabled: true, lastLogin: null },
        { name: OTHER, fullName: 'Örnek Çalışan', enabled: false, lastLogin: null },
      ],
      hasNext: false,
    }),
    getUser: vi.fn(async (name: string) => ({
      name,
      fullName: name === SELF ? 'Örnek Yönetici' : 'Örnek Çalışan',
      enabled: true,
      lastLogin: null,
      roleProfiles: ['Satış Çalışanı'],
      roles: ['Sales User'],
    })),
    listRoleProfiles: vi.fn().mockResolvedValue(['Satış Çalışanı', 'İzin Onaycısı']),
    getRoleProfile: vi.fn(async (name: string) => ({
      name,
      roles: name === 'İzin Onaycısı' ? ['Leave Approver'] : ['Sales User'],
    })),
    previewInvite: vi.fn().mockResolvedValue({
      digest: 'd'.repeat(64),
      operations: [{ operation: 'create_user', target: 'yeni@example.test', destructive: false }],
    }),
    sendInvite: vi.fn().mockResolvedValue(undefined),
    setRoleProfiles: vi
      .fn()
      .mockResolvedValue({ roleProfiles: ['İzin Onaycısı'], roles: ['Leave Approver'] }),
    ...overrides,
  };
}

function renderPage(admin: UserAdminClient | undefined) {
  const client: ModuleClient = admin ? { userAdmin: () => Promise.resolve(admin) } : {};
  return render(
    <ModuleProvider value={{ tenant: 'example-site', user: SELF, mode: 'example', client }}>
      <AdministrationPage />
    </ModuleProvider>,
  );
}

afterEach(cleanup);

describe('user management (G-98)', () => {
  it('lists users instead of the old "not yet" notice', async () => {
    renderPage(fakeClient());
    const list = await screen.findByRole('list', { name: 'Kullanıcı listesi' });
    expect(within(list).getByText('Örnek Yönetici')).toBeVisible();
    expect(within(list).getByText(OTHER)).toBeVisible();
    expect(within(list).getByText('Kapalı')).toBeVisible();
    expect(screen.queryByText('Bu ekrandan henüz kullanıcıları yönetemezsiniz.')).toBeNull();
    expect(screen.getByRole('button', { name: 'Davet et' })).toBeVisible();
  });

  it('shows the unavailable notice when the client has no user endpoints', async () => {
    renderPage(undefined);
    expect(await screen.findAllByText('Bu hizmet henüz bağlı değil.')).not.toHaveLength(0);
    expect(screen.queryByText('Bu ekrandan henüz kullanıcıları yönetemezsiniz.')).toBeNull();
  });

  it('refuses an empty or invalid e-mail before any request', async () => {
    const admin = fakeClient();
    renderPage(admin);
    fireEvent.click(await screen.findByRole('button', { name: 'Davet et' }));
    fireEvent.click(screen.getByRole('button', { name: 'Daveti gönder' }));
    expect(await screen.findByText('E-posta adresini kontrol edin.')).toBeVisible();
    fireEvent.change(screen.getByLabelText(/^E-posta/), { target: { value: 'gecersiz' } });
    fireEvent.click(screen.getByRole('button', { name: 'Daveti gönder' }));
    expect(screen.getByText('E-posta adresini kontrol edin.')).toBeVisible();
    expect(admin.previewInvite).not.toHaveBeenCalled();
  });

  it('previews the invitation, then sends it with the preview digest', async () => {
    const admin = fakeClient();
    renderPage(admin);
    fireEvent.click(await screen.findByRole('button', { name: 'Davet et' }));
    fireEvent.change(screen.getByLabelText(/^E-posta/), {
      target: { value: 'yeni@example.test' },
    });
    fireEvent.change(screen.getByLabelText('Ad'), { target: { value: 'Yeni' } });
    fireEvent.click(screen.getByRole('button', { name: 'Daveti gönder' }));
    expect(await screen.findByText('Davet şu işlemleri yapacak:')).toBeVisible();
    expect(admin.sendInvite).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Onayla ve gönder' }));
    expect(await screen.findByText('Davet gönderildi.')).toBeVisible();
    expect(admin.previewInvite).toHaveBeenCalledWith(
      { email: 'yeni@example.test', firstName: 'Yeni', lastName: '' },
      expect.anything(),
    );
    expect(admin.sendInvite).toHaveBeenCalledWith(
      { email: 'yeni@example.test', firstName: 'Yeni', lastName: '' },
      'd'.repeat(64),
      expect.anything(),
    );
  });

  it('says the user already exists when the server reports a conflict', async () => {
    const admin = fakeClient({
      previewInvite: vi.fn().mockRejectedValue({ kind: 'conflict', status: 409 }),
    });
    renderPage(admin);
    fireEvent.click(await screen.findByRole('button', { name: 'Davet et' }));
    fireEvent.change(screen.getByLabelText(/^E-posta/), { target: { value: OTHER } });
    fireEvent.click(screen.getByRole('button', { name: 'Daveti gönder' }));
    expect(await screen.findByText('Bu e-posta ile bir kullanıcı zaten var.')).toBeVisible();
  });

  it('assigns a role profile and shows the roles before and after', async () => {
    const admin = fakeClient();
    renderPage(admin);
    fireEvent.click(await screen.findByRole('button', { name: /Örnek Çalışan/ }));
    expect(await screen.findByRole('heading', { name: 'Örnek Çalışan' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Rol profilini değiştir' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.mouseDown(within(dialog).getByRole('combobox'));
    fireEvent.click(await screen.findByTitle('İzin Onaycısı'));
    // antd opens the dialog with a motion. jsdom never finishes it, so presence is checked here.
    // The Playwright test checks visibility in a real browser.
    expect(await within(dialog).findByText('Leave Approver')).toBeInTheDocument();
    expect(within(dialog).getByText('(yeni)', { exact: false })).toBeInTheDocument();
    expect(within(dialog).getByText('Sales User kalkar.')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Profili ata' }));
    await waitFor(() =>
      expect(admin.setRoleProfiles).toHaveBeenCalledWith(
        OTHER,
        ['İzin Onaycısı'],
        expect.anything(),
      ),
    );
    expect(await screen.findByText('Rol profili atandı.')).toBeVisible();
  });

  it('keeps the role profile button closed on the own account', async () => {
    renderPage(fakeClient());
    fireEvent.click(await screen.findByRole('button', { name: /Örnek Yönetici/ }));
    expect(await screen.findByRole('button', { name: 'Rol profilini değiştir' })).toBeDisabled();
    expect(
      screen.getByText(
        'Kendi rol profilinizi değiştiremezsiniz. Başka bir yönetici değiştirebilir.',
      ),
    ).toBeVisible();
  });

  it('says when the server hides the role profile of a user', async () => {
    renderPage(
      fakeClient({
        getUser: vi.fn().mockResolvedValue({
          name: OTHER,
          fullName: 'Örnek Çalışan',
          enabled: true,
          lastLogin: null,
        }),
      }),
    );
    fireEvent.click(await screen.findByRole('button', { name: /Örnek Çalışan/ }));
    expect(
      await screen.findByText('Sunucu bu kullanıcının rol profilini göstermiyor.'),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Rol profilini değiştir' })).toBeEnabled();
  });
});
