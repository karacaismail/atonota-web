import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  SAMPLE_CSRF_TOKEN,
  SAMPLE_KEYCLOAK_URL,
  SAMPLE_PRESS_CSRF_TOKEN,
  SAMPLE_PRESS_URL,
  sampleLeaves,
} from '@/mocks/fixtures';
import { mockState, resetMockState } from '@/mocks/handlers';
import { mockServer } from '@/mocks/node';

import { createApiClient } from './client';
import type { ApiConfig } from './config';
import { createCsrfStore } from './csrf';
import { createPressClient, readPressConfig } from './press-client';

const SITE = 'https://kiraci.example.test';

const config: ApiConfig = {
  siteUrl: SITE,
  credentials: 'same-origin',
  timeoutMs: 1_000,
  modelTimeoutMs: 2_000,
  keycloakUrl: SAMPLE_KEYCLOAK_URL,
  keycloakRealm: 'platform',
  aiRoute: 'ornek-rota',
  csrfMetaName: 'csrf-token',
};

function api() {
  return createApiClient({ config, csrf: createCsrfStore(SAMPLE_CSRF_TOKEN) });
}

const requests: { method: string; url: URL; csrf: string | null }[] = [];
beforeAll(() => {
  mockServer.listen({ onUnhandledFrame: 'error' });
  mockServer.events.on('request:start', ({ request }) => {
    requests.push({
      method: request.method,
      url: new URL(request.url),
      csrf: request.headers.get('X-Frappe-CSRF-Token'),
    });
  });
});
afterEach(() => {
  mockServer.resetHandlers();
  resetMockState();
  requests.length = 0;
});
afterAll(() => mockServer.close());

describe('HRMS izin başvuruları', () => {
  it('listeyi sözleşmedeki yoldan, JSON süzgeç ve alanlarla ister', async () => {
    const items = await api().listLeaveApplications({
      fields: ['name', 'status', 'modified'],
      filters: { status: 'Open', docstatus: 0 },
      orderBy: 'modified desc, name asc',
      start: 0,
      pageLength: 20,
    });

    const sent = requests.at(-1)?.url;
    expect(sent?.pathname).toBe('/api/resource/Leave%20Application');
    expect(JSON.parse(sent?.searchParams.get('fields') ?? '')).toEqual([
      'name',
      'status',
      'modified',
    ]);
    expect(JSON.parse(sent?.searchParams.get('filters') ?? '')).toEqual({
      status: 'Open',
      docstatus: 0,
    });
    expect(sent?.searchParams.get('order_by')).toBe('modified desc, name asc');
    expect(sent?.searchParams.get('limit_page_length')).toBe('20');
    expect(items).toEqual([
      { name: sampleLeaves[0]?.name, status: 'Open', modified: sampleLeaves[0]?.modified },
    ]);
  });

  it('ad üyeliği süzgecini dizi biçiminde gönderir', async () => {
    const names = sampleLeaves.map((leave) => leave.name);
    const items = await api().listLeaveApplications({ filters: [['name', 'in', names]] });
    expect(items.map((item) => item.name).sort()).toEqual([...names].sort());
  });

  it('sayfa sınırı 1 ile 100 arasında değilse istek göndermez', async () => {
    await expect(api().listLeaveApplications({ pageLength: 0 })).rejects.toMatchObject({
      kind: 'invalid_request',
    });
    expect(requests).toHaveLength(0);
  });

  it('tek başvuruyu okur', async () => {
    const leave = await api().getLeaveApplication(sampleLeaves[0]?.name ?? '');
    expect(leave).toMatchObject({ name: sampleLeaves[0]?.name, status: 'Open', docstatus: 0 });
  });

  it('olmayan başvuru not_found verir', async () => {
    await expect(api().getLeaveApplication('YOK')).rejects.toMatchObject({ kind: 'not_found' });
  });

  it('onayı sürümle ve CSRF başlığıyla gönderir', async () => {
    const leave = sampleLeaves[0];
    const result = await api().approveLeave(leave?.name ?? '', leave?.modified ?? '');
    expect(result).toEqual({ name: leave?.name });
    const sent = requests.at(-1);
    expect(sent?.url.pathname).toBe('/api/method/hrms_tr.api.approve_leave');
    expect(sent?.csrf).toBe(SAMPLE_CSRF_TOKEN);
  });

  it('eski sürümle onay çakışma verir', async () => {
    await expect(
      api().approveLeave(sampleLeaves[0]?.name ?? '', '2000-01-01 00:00:00.000000'),
    ).rejects.toMatchObject({ kind: 'conflict', code: 'TimestampMismatchError' });
  });

  it('onaylanmış başvuruyu iptal eder', async () => {
    const leave = sampleLeaves[1];
    await expect(api().cancelLeave(leave?.name ?? '', leave?.modified ?? '')).resolves.toEqual({
      name: leave?.name,
    });
    expect(requests.at(-1)?.url.pathname).toBe('/api/method/hrms_tr.api.cancel_leave');
  });

  it('taslak başvuru iptal edilemez', async () => {
    const leave = sampleLeaves[0];
    await expect(api().cancelLeave(leave?.name ?? '', leave?.modified ?? '')).rejects.toMatchObject(
      { kind: 'invalid_request' },
    );
  });

  it('şemaya uymayan liste yanıtını reddeder', async () => {
    mockServer.use(
      http.get('*/api/resource/:doctype', () => HttpResponse.json({ data: [{ status: 'Open' }] })),
    );
    await expect(api().listLeaveApplications()).rejects.toMatchObject({ kind: 'invalid_response' });
  });
});

describe('erişim açıklaması', () => {
  it('izin kararını ve nedenini okur', async () => {
    const result = await api().explainPermission({ doctype: 'Örnek Kayıt', name: 'ORNEK-0001' });
    expect(result).toMatchObject({ allowed: true, reason: 'allowed', ptype: 'read' });
    expect(requests.at(-1)?.url.pathname).toBe(
      '/api/method/platform_core.api.access.explain_permission',
    );
  });

  it('başka kaydın reddini tek nedenle döner', async () => {
    const result = await api().explainPermission({
      doctype: 'Örnek Kayıt',
      name: 'BASKASI',
      ptype: 'write',
    });
    expect(result).toMatchObject({ allowed: false, reason: 'not_permitted_or_missing', rules: [] });
  });

  it('başka kullanıcıyı sormak yetki reddidir', async () => {
    await expect(
      api().explainPermission({
        doctype: 'Örnek Kayıt',
        name: 'ORNEK-0001',
        user: 'baska@example.test',
      }),
    ).rejects.toMatchObject({ kind: 'forbidden' });
  });

  it('erişim özetini okur', async () => {
    const summary = await api().getAccessSummary('Örnek Kayıt');
    expect(summary).toMatchObject({ governed: true, operations: { read: ['own', 'team'] } });
  });

  it('bilinmeyen kapsam taşıyan özeti reddeder', async () => {
    mockServer.use(
      http.get('*/api/method/platform_core.api.access.get_access_summary', () =>
        HttpResponse.json({
          message: {
            doctype: 'Örnek Kayıt',
            governed: true,
            operations: {
              read: ['herkes'],
              write: [],
              create: [],
              delete: [],
              submit: [],
              cancel: [],
            },
          },
        }),
      ),
    );
    await expect(api().getAccessSummary('Örnek Kayıt')).rejects.toMatchObject({
      kind: 'invalid_response',
    });
  });
});

describe('Press hesap silme', () => {
  function press(onSessionExpired = vi.fn()) {
    const pressConfig = readPressConfig({ VITE_PRESS_URL: SAMPLE_PRESS_URL }, SITE);
    if (!pressConfig) throw new Error('Press ayarı okunamadı.');
    const client = createPressClient({
      config: pressConfig,
      keycloak: { keycloakUrl: SAMPLE_KEYCLOAK_URL, keycloakRealm: 'platform' },
      csrf: createCsrfStore(SAMPLE_PRESS_CSRF_TOKEN),
      onSessionExpired,
    });
    return { client, pressConfig, onSessionExpired };
  }

  it('Press CSRF belirteci yoksa istek göndermez', async () => {
    const pressConfig = readPressConfig({ VITE_PRESS_URL: SAMPLE_PRESS_URL }, SITE);
    if (!pressConfig) throw new Error('Press ayarı okunamadı.');
    const client = createPressClient({
      config: pressConfig,
      keycloak: { keycloakUrl: SAMPLE_KEYCLOAK_URL, keycloakRealm: 'platform' },
      csrf: createCsrfStore(),
    });
    await expect(client.requestDeletion(false)).rejects.toMatchObject({ kind: 'csrf' });
    expect(requests).toHaveLength(0);
  });

  it('Press ayarı yoksa istemci kurulmaz', () => {
    expect(readPressConfig({}, SITE)).toBeUndefined();
  });

  it('başka kökteki Press için çerezi include ile gönderir', () => {
    expect(press().pressConfig).toMatchObject({
      pressUrl: SAMPLE_PRESS_URL,
      credentials: 'include',
    });
  });

  it('confirm false yeniden doğrulama adresini döner', async () => {
    const result = await press().client.requestDeletion(false);
    expect(result.status).toBe('reauthenticate');
    if (result.status !== 'reauthenticate') return;
    expect(new URL(result.url).origin).toBe(SAMPLE_KEYCLOAK_URL);
    const sent = requests.at(-1);
    expect(sent?.url.origin).toBe(SAMPLE_PRESS_URL);
    expect(sent?.url.pathname).toBe('/api/method/press_tr.api.account.request_deletion');
    expect(sent?.csrf).toBe(SAMPLE_PRESS_CSRF_TOKEN);
  });

  it('yeniden doğrulama yoksa confirm true yetki reddi verir', async () => {
    await expect(press().client.requestDeletion(true)).rejects.toMatchObject({ kind: 'forbidden' });
  });

  it('yeniden doğrulamadan sonra confirm true isteği kaydeder', async () => {
    mockState.pressReauthenticated = true;
    await expect(press().client.requestDeletion(true)).resolves.toEqual({ status: 'submitted' });
  });

  it('sonucu belirsiz isteği pending olarak döner', async () => {
    mockServer.use(
      http.post('*/api/method/press_tr.api.account.request_deletion', () =>
        HttpResponse.json({ message: { pending: true } }),
      ),
    );
    await expect(press().client.requestDeletion(true)).resolves.toEqual({ status: 'pending' });
  });

  it('güvenilmeyen yeniden doğrulama adresine gitmez', async () => {
    mockServer.use(
      http.post('*/api/method/press_tr.api.account.request_deletion', () =>
        HttpResponse.json({
          message: {
            url: 'https://kotu.example.test/realms/platform/protocol/openid-connect/auth',
          },
        }),
      ),
    );
    await expect(press().client.requestDeletion(false)).rejects.toMatchObject({
      kind: 'invalid_response',
    });
  });

  it('502 yanıtı sunucu hatasıdır ve oturum bitimi sayılmaz', async () => {
    mockServer.use(
      http.post('*/api/method/press_tr.api.account.request_deletion', () =>
        HttpResponse.json({ exc_type: 'IdentitySyncError' }, { status: 502 }),
      ),
    );
    const { client, onSessionExpired } = press();
    await expect(client.requestDeletion(true)).rejects.toMatchObject({ kind: 'unavailable' });
    expect(onSessionExpired).not.toHaveBeenCalled();
  });
});
