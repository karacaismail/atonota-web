import { describe, expect, it } from 'vitest';
import { ApiError } from '@/api/errors';
import { CONNECTION_STATUSES, type ProviderDefinition } from '@/api/provider-client';
import { providerMessages } from './messages';
import {
  NEW_ACCOUNT,
  accountsFor,
  buildConnectionInput,
  checkFailureKey,
  joinConnections,
  saveFailureKey,
  statusKey,
  withoutSecrets,
} from './model';

const field = (
  name: string,
  kind: 'secret' | 'text' | 'url',
  scope: 'account' | 'api',
  required = true,
) => ({ name, label: name, kind, required, scope, description: '' });

const openai: ProviderDefinition = {
  id: 'openai',
  category: 'ai_llm',
  label: 'OpenAI',
  description: '',
  auth_type: 'api_key',
  fields: [field('api_key', 'secret', 'api'), field('organization_id', 'text', 'account', false)],
  common_fields: [field('account_name', 'text', 'account'), field('api_name', 'text', 'api')],
};

describe('buildConnectionInput', () => {
  it('sends a new account name and skips empty optional fields', () => {
    expect(
      buildConnectionInput(openai, {
        account: NEW_ACCOUNT,
        accountName: '  Ana hesap ',
        apiName: ' Birincil ',
        values: { api_key: ' anahtar ', organization_id: '   ' },
      }),
    ).toEqual({
      provider: 'openai',
      account_name: 'Ana hesap',
      api_name: 'Birincil',
      // The secret is sent as is. Whitespace is not trimmed.
      fields: { api_key: ' anahtar ' },
    });
  });

  it('uses an existing account and leaves account fields out', () => {
    expect(
      buildConnectionInput(openai, {
        account: 'HESAP-1',
        accountName: 'yok sayılır',
        apiName: 'Yedek',
        values: { api_key: 'k', organization_id: 'org' },
      }),
    ).toEqual({
      provider: 'openai',
      account: 'HESAP-1',
      api_name: 'Yedek',
      fields: { api_key: 'k' },
    });
  });

  it('never sends fields that are not in the provider definition', () => {
    const input = buildConnectionInput(openai, {
      account: NEW_ACCOUNT,
      accountName: 'A',
      apiName: 'B',
      values: { api_key: 'k', base_url: 'https://example.test' },
    });
    expect(Object.keys(input.fields)).toEqual(['api_key']);
  });
});

describe('messages', () => {
  it('has a message for every connection status in both languages', () => {
    for (const status of [...CONNECTION_STATUSES, 'not_checked' as const]) {
      const key = statusKey(status);
      expect(providerMessages.tr[key]).toBeTruthy();
      expect(providerMessages.en[key]).toBeTruthy();
    }
    expect(providerMessages.tr[statusKey('connected')]).toBe('Bağlandı');
    expect(providerMessages.tr[statusKey('invalid_credentials')]).toBe('Anahtar geçersiz');
    expect(providerMessages.tr[statusKey('network_error')]).toBe('Ağ hatası');
    expect(providerMessages.tr[statusKey('quota_exceeded')]).toBe('Kota doldu');
  });

  it('maps the gateway rate limit to "too often"', () => {
    const busy = new ApiError({ kind: 'rate_limited', status: 429, code: 'gateway_busy' });
    expect(checkFailureKey(busy)).toBe('tooFrequent');
    expect(providerMessages.tr.tooFrequent).toMatch(/^Çok sık denendi\./);
    expect(checkFailureKey(new ApiError({ kind: 'forbidden', status: 403 }))).toBe('forbidden');
    expect(checkFailureKey(new Error('x'))).toBe('checkFailed');
  });
});

describe('saveFailureKey', () => {
  // Saving is a write. Without a response the server may have written the record (shared rule:
  // failureKind).
  it.each([
    ['503', new ApiError({ kind: 'unavailable', status: 503 })],
    ['500', new ApiError({ kind: 'unknown', status: 500 })],
    ['zaman aşımı', new ApiError({ kind: 'timeout', status: 0 })],
    ['ağ hatası', new ApiError({ kind: 'network', status: 0 })],
    ['bozuk yanıt', new ApiError({ kind: 'invalid_response', status: 200 })],
  ])('treats %s as an unknown outcome', (_name, error) => {
    expect(saveFailureKey(error)).toBe('saveUncertain');
  });

  it('uses save wording, not check wording', () => {
    expect(saveFailureKey(new ApiError({ kind: 'rate_limited', status: 429 }))).toBe(
      'saveTooFrequent',
    );
    expect(providerMessages.tr.saveTooFrequent).toMatch(/^Çok sık kaydedildi\./);
    expect(providerMessages.tr.saveUncertain).toMatch(/^İşlem sonucu bilinmiyor\./);
    expect(
      saveFailureKey(
        new ApiError({ kind: 'invalid_request', status: 400, code: 'unknown_provider' }),
      ),
    ).toBe('saveRejected');
    expect(saveFailureKey(new ApiError({ kind: 'invalid_request', status: 417 }))).toBe(
      'saveRejected',
    );
    expect(saveFailureKey(new ApiError({ kind: 'conflict', status: 409 }))).toBe('saveConflict');
    expect(saveFailureKey(new ApiError({ kind: 'forbidden', status: 403 }))).toBe('forbidden');
  });
});

describe('joinConnections', () => {
  const providers = [{ name: 'OpenAI', provider_name: 'OpenAI', catalog_provider: 'openai' }];
  const accounts = [
    { name: 'H1', account_name: 'Ana hesap', provider: 'OpenAI' },
    { name: 'H2', account_name: 'Başka', provider: 'Eski' },
  ];

  it('joins API rows with their account and provider labels', () => {
    const rows = joinConnections(
      [
        {
          name: 'API-1',
          api_name: 'Birincil',
          account: 'H1',
          connection_status: 'connected',
          connection_checked_at: '2026-11-20 09:05:00',
        },
        { name: 'API-2', api_name: 'Kayıp', account: 'H9', connection_status: 'bozuk' },
      ],
      accounts,
      providers,
    );
    expect(rows).toEqual([
      {
        name: 'API-1',
        apiName: 'Birincil',
        account: 'Ana hesap',
        provider: 'OpenAI',
        status: 'connected',
        checkedAt: '2026-11-20 09:05:00',
      },
      {
        name: 'API-2',
        apiName: 'Kayıp',
        account: 'H9',
        provider: undefined,
        status: 'not_checked',
        checkedAt: null,
      },
    ]);
  });

  it('drops rows without a name and never copies unknown fields', () => {
    const rows = joinConnections([{ api_name: 'x' }, { name: 'A', api_key: 'gizli' }], [], []);
    expect(rows).toHaveLength(1);
    expect(JSON.stringify(rows)).not.toContain('gizli');
  });

  it('lists only the accounts of the chosen catalog provider', () => {
    expect(accountsFor('openai', accounts, providers)).toEqual([
      { name: 'H1', label: 'Ana hesap' },
    ]);
    expect(accountsFor('gemini', accounts, providers)).toEqual([]);
  });
});

describe('withoutSecrets', () => {
  it('removes only the secret values of the provider', () => {
    const provider = {
      id: 'p',
      fields: [field('api_key', 'secret', 'account'), field('base_url', 'url', 'api')],
    } as unknown as ProviderDefinition;
    expect(withoutSecrets({ api_key: 'k', base_url: 'https://x.example.test' }, provider)).toEqual({
      base_url: 'https://x.example.test',
    });
  });
});
