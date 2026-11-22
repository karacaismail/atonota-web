/// <reference types="node" />
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { SAMPLE_CSRF_TOKEN, SAMPLE_USER } from '@/mocks/fixtures';
import { mockState, resetMockState } from '@/mocks/handlers';
import { mockServer } from '@/mocks/node';

import { createApiClient } from './client';
import type { ApiConfig } from './config';
import { createCsrfStore } from './csrf';
import { ApiError } from './errors';

const SITE = 'https://kiraci.example.test';

const config: ApiConfig = {
  siteUrl: SITE,
  credentials: 'same-origin',
  timeoutMs: 1_000,
  modelTimeoutMs: 2_000,
  keycloakUrl: 'https://kimlik.example.test',
  keycloakRealm: 'platform',
  aiRoute: 'ornek-rota',
  csrfMetaName: 'csrf-token',
};

function setup(options: { csrf?: string; timeoutMs?: number } = {}) {
  const onSessionExpired = vi.fn();
  const csrf = createCsrfStore(options.csrf ?? SAMPLE_CSRF_TOKEN);
  const api = createApiClient({
    config: { ...config, timeoutMs: options.timeoutMs ?? config.timeoutMs },
    csrf,
    onSessionExpired,
  });
  return { api, csrf, onSessionExpired };
}

beforeAll(() => mockServer.listen({ onUnhandledFrame: 'error' }));
afterEach(() => {
  mockServer.resetHandlers();
  resetMockState();
});
afterAll(() => mockServer.close());

describe('API istemcisi', () => {
  it('giriş adresini sözleşmedeki yoldan ister', async () => {
    const seen: string[] = [];
    mockServer.events.on('request:start', ({ request }) => {
      seen.push(`${request.method} ${new URL(request.url).pathname}`);
    });
    const { api } = setup();

    const result = await api.getLoginUrl('/panel');

    expect(result.login_url).toMatch(/^https:\/\/kimlik\.example\.test\/realms\/platform\//);
    expect(seen).toContain('POST /api/method/platform_core.api.auth.get_login_url');
    mockServer.events.removeAllListeners();
  });

  it('yazan istekte CSRF başlığını ekler, okuyan istekte eklemez', async () => {
    const headers: Record<string, string | null> = {};
    mockServer.events.on('request:start', ({ request }) => {
      headers[request.method] = request.headers.get('X-Frappe-CSRF-Token');
    });
    const { api } = setup();

    await api.getBootstrap();
    await api.logout();

    expect(headers.GET).toBeNull();
    expect(headers.POST).toBe(SAMPLE_CSRF_TOKEN);
    mockServer.events.removeAllListeners();
  });

  it('hiçbir istekte Authorization başlığı göndermez', async () => {
    let authorization: string | null = 'yok';
    mockServer.events.on('request:start', ({ request }) => {
      authorization = request.headers.get('Authorization');
    });
    const { api } = setup();

    await api.getLoggedUser();

    expect(authorization).toBeNull();
    mockServer.events.removeAllListeners();
  });

  it('CSRF belirteci yanlışsa csrf hatası verir', async () => {
    const { api } = setup({ csrf: 'yanlis' });
    await expect(api.logout()).rejects.toMatchObject({ kind: 'csrf' });
  });

  it('oturum bitince session_expired verir ve bir kez haber verir', async () => {
    mockState.signedIn = false;
    const { api, onSessionExpired } = setup();

    await expect(api.getBootstrap()).rejects.toMatchObject({ kind: 'session_expired' });
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it('belirsiz 403 sonrası oturum kapalıysa session_expired verir', async () => {
    mockServer.use(
      http.get('*/api/method/platform_core.api.shell.get_bootstrap', () =>
        HttpResponse.json({ exc_type: 'PermissionError' }, { status: 403 }),
      ),
      http.get('*/api/method/frappe.auth.get_logged_user', () =>
        HttpResponse.json({ exc_type: 'PermissionError' }, { status: 403 }),
      ),
    );
    const { api, onSessionExpired } = setup();

    await expect(api.getBootstrap()).rejects.toMatchObject({ kind: 'session_expired' });
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it('belirsiz 403 sonrası oturum açıksa yetki reddi verir', async () => {
    const realFetch = globalThis.fetch;
    const caches: string[] = [];
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      if (input instanceof Request && input.url.includes('get_logged_user'))
        caches.push(input.cache);
      return realFetch(input, init);
    });
    const { api, onSessionExpired } = setup();

    await expect(api.getDocType('Başka Kayıt')).rejects.toMatchObject({ kind: 'forbidden' });
    expect(onSessionExpired).not.toHaveBeenCalled();
    expect(caches).toEqual(['no-store']);
    spy.mockRestore();
  });

  it('DocType tanımını ETag ile okur ve 304 yanıtını ayırır', async () => {
    const { api } = setup();

    const first = await api.getDocType('Örnek Kayıt');
    expect(first.status).toBe('fresh');
    if (first.status !== 'fresh') return;
    expect(first.meta.schema.name).toBe('Örnek Kayıt');

    const second = await api.getDocType('Örnek Kayıt', first.etag);
    expect(second.status).toBe('not_modified');
  });

  it('oturumdaki kullanıcıyı okur', async () => {
    const { api } = setup();
    await expect(api.getLoggedUser()).resolves.toBe(SAMPLE_USER);
  });

  it('JSON olmayan başarılı yanıtı reddeder', async () => {
    mockServer.use(
      http.get('*/api/method/platform_core.api.shell.get_bootstrap', () =>
        HttpResponse.text('<html></html>', { headers: { 'Content-Type': 'text/html' } }),
      ),
    );
    const { api } = setup();
    await expect(api.getBootstrap()).rejects.toMatchObject({ kind: 'invalid_response' });
  });

  it('şemaya uymayan yanıtı reddeder', async () => {
    mockServer.use(
      http.post('*/api/method/platform_core.api.auth.get_login_url', () =>
        HttpResponse.json({ message: { login_url: 42 } }),
      ),
    );
    const { api } = setup();
    await expect(api.getLoginUrl()).rejects.toMatchObject({ kind: 'invalid_response' });
  });

  it('ağ hatasını network türüne çevirir', async () => {
    mockServer.use(
      http.get('*/api/method/frappe.auth.get_logged_user', () => HttpResponse.error()),
    );
    const { api } = setup();
    const error = await api.getLoggedUser().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ kind: 'network' });
  });

  it('zaman aşımını timeout türüne çevirir', async () => {
    mockServer.use(
      http.get(
        '*/api/method/frappe.auth.get_logged_user',
        () => new Promise<Response>(() => undefined),
      ),
    );
    const { api } = setup({ timeoutMs: 20 });
    await expect(api.getLoggedUser()).rejects.toMatchObject({ kind: 'timeout' });
  });

  it('kullanıcının iptalini hata türüne çevirmeden iletir', async () => {
    mockServer.use(
      http.get(
        '*/api/method/frappe.auth.get_logged_user',
        () => new Promise<Response>(() => undefined),
      ),
    );
    const { api } = setup();
    const controller = new AbortController();
    const pending = api.getLoggedUser({ signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });
});
