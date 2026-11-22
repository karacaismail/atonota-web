import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import {
  SAMPLE_CSRF_TOKEN,
  SAMPLE_KEYCLOAK_URL,
  SAMPLE_PRESS_URL,
  sampleInstallations,
  sampleLeaves,
} from '@/mocks/fixtures';
import { mockState, resetMockState } from '@/mocks/handlers';
import { mockServer } from '@/mocks/node';

import { createApiClient } from './client';
import type { ApiConfig } from './config';
import { createCsrfStore } from './csrf';
import { pressAccountDeletionUrl, readPressConfig } from './press';

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

describe('cihaz kurulumları (oturumlar)', () => {
  it('kurulumları sayfa sayfa okur', async () => {
    const first = await api().listInstallations();
    expect(first.installations).toHaveLength(2);
    expect(first.nextAfter).toBe(sampleInstallations[1]?.installation_id);
    const sent = requests.at(-1);
    expect(sent?.url.pathname).toBe(
      '/api/method/platform_core.api.mobile_pwa.v1_list_installations',
    );
    expect(sent?.csrf).toBe(SAMPLE_CSRF_TOKEN);

    const second = await api().listInstallations(first.nextAfter ?? undefined);
    expect(second.installations.map((item) => item.installation_id)).toEqual([
      sampleInstallations[2]?.installation_id,
    ]);
    expect(second.nextAfter).toBeNull();
  });

  it('kurulumu iptal eder', async () => {
    const id = sampleInstallations[0]?.installation_id ?? '';
    await expect(api().revokeInstallation(id)).resolves.toEqual({ revoked: 1 });
    const page = await api().listInstallations();
    expect(page.installations.find((item) => item.installation_id === id)?.revoked).toBe(true);
  });

  it('kimliği UUID olmayan kurulum için istek göndermez', async () => {
    await expect(api().revokeInstallation('ORNEK')).rejects.toMatchObject({
      kind: 'invalid_request',
    });
    expect(requests).toHaveLength(0);
  });

  it('bilinmeyen kurulum not_found verir', async () => {
    await expect(
      api().revokeInstallation('99999999-0000-4000-8000-000000000001'),
    ).rejects.toMatchObject({ kind: 'not_found' });
  });

  it('PWA oturumu yoksa session_expired verir', async () => {
    mockState.signedIn = false;
    await expect(api().listInstallations()).rejects.toMatchObject({
      kind: 'session_expired',
      code: 'pwa_session_required',
    });
  });

  it('bozuk kurulum kaydını reddeder', async () => {
    mockServer.use(
      http.post('*/api/method/platform_core.api.mobile_pwa.v1_list_installations', () =>
        HttpResponse.json({
          server_time: 1,
          message: {
            installations: [{ installation_id: 'x', scope: 'masaustu', revoked: false }],
            next_after: null,
          },
        }),
      ),
    );
    await expect(api().listInstallations()).rejects.toMatchObject({ kind: 'invalid_response' });
  });
});

describe('Press hesap silme sayfası', () => {
  it('Press ayarı yoksa adres yoktur', () => {
    expect(readPressConfig({})).toBeUndefined();
  });

  it('adres Press kökü ve /account-deletion yoludur', () => {
    const pressConfig = readPressConfig({ VITE_PRESS_URL: `${SAMPLE_PRESS_URL}/` });
    expect(pressConfig).toEqual({ pressUrl: SAMPLE_PRESS_URL });
    if (!pressConfig) return;
    expect(pressAccountDeletionUrl(pressConfig)).toBe(`${SAMPLE_PRESS_URL}/account-deletion`);
  });

  it.each([
    ['düz HTTP', 'http://press.example.test'],
    ['yol taşıyan kök', 'https://press.example.test/baska'],
    ['sorgu taşıyan kök', 'https://press.example.test/?x=1'],
    ['kullanıcı bilgisi taşıyan kök', 'https://kisi@press.example.test'],
    ['adres olmayan değer', 'press'],
    ['başka protokol', 'javascript:alert(1)'],
  ])('%s kabul edilmez', (_label, value) => {
    expect(() => readPressConfig({ VITE_PRESS_URL: value })).toThrow(/VITE_PRESS_URL/);
  });

  it('yerel geliştirmede HTTP localhost kabul edilir', () => {
    expect(readPressConfig({ VITE_PRESS_URL: 'http://localhost:8001' })).toEqual({
      pressUrl: 'http://localhost:8001',
    });
  });

  it('panel Press ucunu çağırmaz', () => {
    const client = api() as Record<string, unknown>;
    expect(Object.keys(client).some((key) => /deletion/i.test(key))).toBe(false);
  });
});
