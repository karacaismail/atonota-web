import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/errors';
import type { ConnectionCheck } from '@/api';
import { sampleProviderCatalog } from '@/mocks/fixtures';
import { ModuleProvider, type AiProviderClient, type ModuleClient } from '../runtime';
import ProvidersPage, { SavedPanel } from './Page';

const listing = {
  apis: [
    {
      name: 'API-1',
      api_name: 'Birincil bağlantı',
      account: 'H1',
      connection_status: 'connected',
      connection_checked_at: '2026-11-20 09:05:00',
    },
  ],
  accounts: [{ name: 'H1', account_name: 'Örnek hesap', provider: 'OpenAI' }],
  providers: [{ name: 'OpenAI', provider_name: 'OpenAI', catalog_provider: 'openai' }],
};

function providers(overrides: Partial<AiProviderClient> = {}): AiProviderClient {
  return {
    listProviderCatalog: vi.fn().mockResolvedValue(sampleProviderCatalog),
    listAiConnections: vi
      .fn()
      .mockResolvedValueOnce(listing)
      .mockResolvedValue({
        ...listing,
        apis: [
          ...listing.apis,
          { name: 'API-2', api_name: 'Birincil', account: 'H2', connection_status: 'not_checked' },
        ],
      }),
    saveProviderConnection: vi.fn().mockResolvedValue({
      provider: 'Anthropic',
      account: 'H2',
      api: 'API-2',
      connection_status: 'not_checked',
    }),
    checkProviderConnection: vi.fn().mockResolvedValue({
      api: 'API-2',
      status: 'connected',
      checked_at: '2026-11-23 10:00:00',
      models_visible: 3,
    } satisfies ConnectionCheck),
    ...overrides,
  };
}

/** The page lazy-loads the provider client. The fake client is supplied the same way. */
function client(overrides: Partial<AiProviderClient> = {}): ModuleClient & {
  providers: AiProviderClient;
} {
  const fake = providers(overrides);
  return { aiProviders: () => Promise.resolve(fake), providers: fake };
}

function renderPage(moduleClient: ModuleClient) {
  return render(
    <ModuleProvider
      value={{
        tenant: 'example-site',
        user: 'example-user',
        mode: 'example',
        client: moduleClient,
      }}
    >
      <ProvidersPage />
    </ModuleProvider>,
  );
}

/** Picks an antd Select option without the keyboard. */
async function choose(label: string, option: string) {
  const select = screen.getByLabelText(label);
  fireEvent.mouseDown(select);
  const items = await screen.findAllByText(option, { selector: '.ant-select-item-option-content' });
  fireEvent.click(items[items.length - 1]!);
}

async function fillAnthropic(secret: string) {
  fireEvent.click(await screen.findByRole('button', { name: 'API ekle' }));
  await choose('Kategori', 'AI LLM');
  await choose('Sağlayıcı', 'Anthropic');
  fireEvent.change(screen.getByLabelText(/^Hesap adı/), { target: { value: 'Ana hesap' } });
  fireEvent.change(screen.getByLabelText(/^Bağlantı adı/), { target: { value: 'Birincil' } });
  fireEvent.change(screen.getByLabelText(/^API anahtarı/), { target: { value: secret } });
}

afterEach(cleanup);

describe('AI providers page', () => {
  it('lists saved connections with their status', async () => {
    renderPage(client());
    const list = await screen.findByRole('list', { name: 'Bağlantılar' });
    expect(within(list).getByText('Birincil bağlantı')).toBeVisible();
    expect(within(list).getByText('Örnek hesap')).toBeVisible();
    expect(within(list).getByText('Bağlandı')).toBeVisible();
  });

  it('draws the form from the catalog, not from a list in code', async () => {
    const catalog = {
      version: 1,
      categories: [{ id: 'deneme', label: 'Deneme kategorisi', description: '' }],
      providers: [
        {
          ...sampleProviderCatalog.providers[0]!,
          id: 'yeni_saglayici',
          category: 'deneme',
          label: 'Yeni sağlayıcı',
          fields: [
            {
              name: 'bolge',
              label: 'Bölge kodu',
              kind: 'text' as const,
              required: true,
              scope: 'api' as const,
              description: 'Sağlayıcı bölgesi.',
            },
          ],
        },
      ],
    };
    renderPage(client({ listProviderCatalog: vi.fn().mockResolvedValue(catalog) }));
    fireEvent.click(await screen.findByRole('button', { name: 'API ekle' }));
    await choose('Kategori', 'Deneme kategorisi');
    await choose('Sağlayıcı', 'Yeni sağlayıcı');
    expect(screen.getByLabelText(/^Bölge kodu/)).toBeVisible();
    expect(screen.queryByLabelText(/^API anahtarı/)).toBeNull();
  });

  it('masks the secret, saves, then checks as a separate step', async () => {
    const fake = client();
    renderPage(fake);
    await fillAnthropic('gizli-anahtar');
    expect(screen.getByLabelText(/^API anahtarı/)).toHaveAttribute('type', 'password');
    const draft = screen.getByRole('region', { name: 'Yeni bağlantı' });
    expect(within(draft).queryByRole('button', { name: 'Bağlantıyı dene' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));
    expect(await screen.findByText('Bağlantı kaydedildi. Bağlantı henüz denenmedi.')).toBeVisible();
    expect(fake.providers.saveProviderConnection).toHaveBeenCalledWith(
      {
        provider: 'anthropic',
        account_name: 'Ana hesap',
        api_name: 'Birincil',
        fields: { api_key: 'gizli-anahtar' },
      },
      expect.anything(),
    );
    // After saving, the secret appears nowhere on screen.
    expect(document.body.innerHTML).not.toContain('gizli-anahtar');
    expect(fake.providers.checkProviderConnection).not.toHaveBeenCalled();

    const form = screen.getByRole('region', { name: 'Yeni bağlantı' });
    fireEvent.click(within(form).getByRole('button', { name: 'Bağlantıyı dene' }));
    const result = await screen.findByRole('status', { name: 'Deneme sonucu' });
    expect(within(result).getByText('Bağlandı')).toBeVisible();
    expect(
      within(result).getByText('Anahtar geçerli. Kalan kota bu denemede görünmez.'),
    ).toBeVisible();
    expect(fake.providers.checkProviderConnection).toHaveBeenCalledWith('API-2', expect.anything());
    // The result is written in one place only; the list draws no second message for the same
    // connection.
    expect(screen.getAllByRole('status', { name: 'Deneme sonucu' })).toHaveLength(1);
  });

  it('shows the check button as pending while the check runs', async () => {
    let finish: (value: ConnectionCheck) => void = () => undefined;
    const pending = new Promise<ConnectionCheck>((resolve) => (finish = resolve));
    renderPage(client({ checkProviderConnection: vi.fn().mockReturnValue(pending) }));
    await fillAnthropic('k');
    fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));
    await screen.findByText('Bağlantı kaydedildi. Bağlantı henüz denenmedi.');
    const form = screen.getByRole('region', { name: 'Yeni bağlantı' });
    const button = within(form).getByRole('button', { name: 'Bağlantıyı dene' });
    fireEvent.click(button);
    await waitFor(() => expect(button).toHaveAttribute('aria-busy', 'true'));
    expect(button.className).toContain('ant-btn-loading');
    finish({ api: 'API-2', status: 'invalid_credentials', checked_at: 'x', models_visible: null });
    const result = await within(form).findByRole('status', { name: 'Deneme sonucu' });
    expect(within(result).getByText('Anahtar geçersiz')).toBeVisible();
    expect(screen.queryByText('Anahtar geçerli. Kalan kota bu denemede görünmez.')).toBeNull();
  });

  it.each([
    ['network_error', 'Ağ hatası'],
    ['quota_exceeded', 'Kota doldu'],
  ] as const)('explains check result %s', async (status, text) => {
    renderPage(
      client({
        checkProviderConnection: vi
          .fn()
          .mockResolvedValue({ api: 'API-1', status, checked_at: 'x', models_visible: null }),
      }),
    );
    const list = await screen.findByRole('list', { name: 'Bağlantılar' });
    fireEvent.click(within(list).getByRole('button', { name: 'Bağlantıyı dene' }));
    const result = await screen.findByRole('status', { name: 'Deneme sonucu' });
    expect(within(result).getByText(text)).toBeVisible();
  });

  it('explains the gateway rate limit', async () => {
    const busy = new ApiError({ kind: 'rate_limited', status: 429, code: 'gateway_busy' });
    renderPage(client({ checkProviderConnection: vi.fn().mockRejectedValue(busy) }));
    const list = await screen.findByRole('list', { name: 'Bağlantılar' });
    fireEvent.click(within(list).getByRole('button', { name: 'Bağlantıyı dene' }));
    expect(
      await screen.findByText('Çok sık denendi. Bir dakika bekleyin, sonra yeniden deneyin.'),
    ).toBeVisible();
  });

  it('marks the fields the server rejected and keeps the form open', async () => {
    const rejected = new ApiError({
      kind: 'invalid_request',
      status: 400,
      code: 'invalid_fields',
      fields: ['api_key'],
    });
    renderPage(client({ saveProviderConnection: vi.fn().mockRejectedValue(rejected) }));
    await fillAnthropic('k');
    fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));
    expect(
      await screen.findByText('Sunucu bağlantıyı kaydetmedi. İşaretli alanları denetleyin.'),
    ).toBeVisible();
    expect(screen.getByLabelText(/^API anahtarı/)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText(/^Bağlantı adı/)).not.toHaveAttribute('aria-invalid', 'true');
  });

  it.each([
    ['503', new ApiError({ kind: 'unavailable', status: 503 })],
    ['timeout', new ApiError({ kind: 'timeout', status: 0 })],
  ])('reports an unknown outcome after a %s and reads the list again', async (_name, error) => {
    const fake = client({ saveProviderConnection: vi.fn().mockRejectedValue(error) });
    renderPage(fake);
    await fillAnthropic('k');
    await screen.findByRole('list', { name: 'Bağlantılar' });
    expect(fake.providers.listAiConnections).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/^İşlem sonucu bilinmiyor\./);
    expect(alert).not.toHaveTextContent(/Yeniden deneyin\./);
    await waitFor(() => expect(fake.providers.listAiConnections).toHaveBeenCalledTimes(2));
    // The new record row appears in the list; the admin sees that the connection was written.
    expect(await screen.findByText('Birincil', { selector: '.ai-provider-name' })).toBeVisible();
  });

  // "API ekle" review 2, K-1: on an unknown result the secret does not stay in the form. No second
  // save request is sent.
  it.each([
    ['503', new ApiError({ kind: 'unavailable', status: 503 })],
    ['timeout', new ApiError({ kind: 'timeout', status: 0 })],
    ['network error', new ApiError({ kind: 'network', status: 0 })],
  ])(
    'clears the secret after an unknown outcome (%s) and does not send it again',
    async (_n, error) => {
      const save = vi.fn().mockRejectedValue(error);
      renderPage(client({ saveProviderConnection: save }));
      await fillAnthropic('gizli-anahtar');
      fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));
      await screen.findByText(/^İşlem sonucu bilinmiyor\./);
      await waitFor(() => expect(screen.getByLabelText(/^API anahtarı/)).toHaveValue(''));
      // Non-secret fields stay. The admin only re-enters the secret.
      expect(screen.getByLabelText(/^Bağlantı adı/)).toHaveValue('Birincil');
      // The antd loading icon lingers during its closing motion. The name may be "loading Kaydet".
      fireEvent.click(screen.getByRole('button', { name: /Kaydet$/ }));
      expect(await screen.findByLabelText(/^API anahtarı/)).toHaveAttribute('aria-invalid', 'true');
      expect(save).toHaveBeenCalledTimes(1);
      expect(document.body.textContent).not.toContain('gizli-anahtar');
    },
  );

  it('keeps the secret after a conflict, because nothing was saved', async () => {
    const conflict = new ApiError({ kind: 'conflict', status: 409 });
    renderPage(client({ saveProviderConnection: vi.fn().mockRejectedValue(conflict) }));
    await fillAnthropic('k');
    fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));
    await screen.findByRole('alert');
    expect(screen.getByLabelText(/^API anahtarı/)).toHaveValue('k');
  });

  it('uses save wording for the rate limit', async () => {
    const busy = new ApiError({ kind: 'rate_limited', status: 429, code: 'gateway_busy' });
    renderPage(client({ saveProviderConnection: vi.fn().mockRejectedValue(busy) }));
    await fillAnthropic('k');
    fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Çok sık kaydedildi. Bir dakika bekleyin, sonra yeniden deneyin.',
    );
  });

  it('marks the account picker with aria-invalid and a text message', async () => {
    const rejected = new ApiError({
      kind: 'invalid_request',
      status: 400,
      code: 'invalid_fields',
      fields: ['account'],
    });
    renderPage(client({ saveProviderConnection: vi.fn().mockRejectedValue(rejected) }));
    await fillAnthropic('k');
    fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));
    await screen.findByRole('alert');
    const picker = screen.getByLabelText('Hesap');
    expect(picker).toHaveAttribute('aria-invalid', 'true');
    expect(picker).toHaveAccessibleDescription('Bu alanı denetleyin.');
  });

  it('moves focus to "Check connection" after saving and back to "Add API" on close', async () => {
    renderPage(client());
    await fillAnthropic('k');
    fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));
    await screen.findByText('Bağlantı kaydedildi. Bağlantı henüz denenmedi.');
    const form = screen.getByRole('region', { name: 'Yeni bağlantı' });
    await waitFor(() =>
      expect(within(form).getByRole('button', { name: 'Bağlantıyı dene' })).toHaveFocus(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Formu kapat' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'API ekle' })).toHaveFocus());
  });

  it('returns focus to "Add API" when the form closes before saving', async () => {
    renderPage(client());
    fireEvent.click(await screen.findByRole('button', { name: 'API ekle' }));
    fireEvent.click(screen.getByRole('button', { name: 'Formu kapat' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'API ekle' })).toHaveFocus());
  });

  it('hides "Add API" when the server denies the catalog', async () => {
    renderPage(
      client({
        listProviderCatalog: vi
          .fn()
          .mockRejectedValue(new ApiError({ kind: 'forbidden', status: 403 })),
      }),
    );
    expect(
      await screen.findByText('Bağlantıyı yalnız “AI Manager” ve “System Manager” rolleri ekler.'),
    ).toBeVisible();
    expect(screen.queryByRole('button', { name: 'API ekle' })).toBeNull();
  });

  it('offers existing accounts of the chosen provider and hides account fields for them', async () => {
    renderPage(client());
    fireEvent.click(await screen.findByRole('button', { name: 'API ekle' }));
    await choose('Kategori', 'AI LLM');
    await choose('Sağlayıcı', 'OpenAI');
    expect(screen.getByLabelText(/^Kurum kimliği/)).toBeVisible();
    await choose('Hesap', 'Örnek hesap');
    expect(screen.queryByLabelText(/^Hesap adı/)).toBeNull();
    expect(screen.queryByLabelText(/^Kurum kimliği/)).toBeNull();
    expect(screen.getByText('Var olan hesapta hesap alanları değişmez.')).toBeVisible();
  });
});

// "API ekle" review 2, K-2: if there is no check endpoint, focus moves to the record panel.
describe('SavedPanel focus', () => {
  function renderPanel(canCheck: boolean) {
    return render(
      <ModuleProvider
        value={{ tenant: 'example-site', user: 'example-user', mode: 'example', client: {} }}
      >
        <SavedPanel label="Birincil" state={undefined} onCheck={vi.fn()} canCheck={canCheck} />
      </ModuleProvider>,
    );
  }

  it('moves focus to the panel itself when the check is not offered', async () => {
    renderPanel(false);
    expect(screen.queryByRole('button', { name: 'Bağlantıyı dene' })).toBeNull();
    const message = screen.getByText('Bağlantı kaydedildi. Bağlantı henüz denenmedi.');
    const panel = message.closest<HTMLElement>('[tabindex="-1"]');
    expect(panel).not.toBeNull();
    await waitFor(() => expect(panel).toHaveFocus());
  });

  it('moves focus to "Check connection" when the check is offered', async () => {
    renderPanel(true);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Bağlantıyı dene' })).toHaveFocus(),
    );
  });
});
