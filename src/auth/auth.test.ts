import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { createApiClient } from '@/api/client';
import type { ApiConfig } from '@/api/config';
import { createCsrfStore } from '@/api/csrf';
import {
  SAMPLE_CSRF_TOKEN,
  SAMPLE_KEYCLOAK_URL,
  SAMPLE_USER,
  sampleLoginUrl,
} from '@/mocks/fixtures';
import { mockState, resetMockState } from '@/mocks/handlers';
import { mockServer } from '@/mocks/node';

import { createAuth, isSafeRedirect } from './auth';

const config: ApiConfig = {
  siteUrl: 'https://kiraci.example.test',
  credentials: 'same-origin',
  timeoutMs: 1_000,
  modelTimeoutMs: 2_000,
  keycloakUrl: SAMPLE_KEYCLOAK_URL,
  keycloakRealm: 'platform',
  aiRoute: 'ornek-rota',
  csrfMetaName: 'csrf-token',
};

function setup(path = '/panel/kayitlar?durum=acik') {
  const navigate = vi.fn<(url: string) => void>();
  const csrf = createCsrfStore(SAMPLE_CSRF_TOKEN);
  const holder: { auth?: ReturnType<typeof createAuth> } = {};
  const api = createApiClient({
    config,
    csrf,
    onSessionExpired: () => holder.auth?.handleSessionExpired(),
  });
  const auth = createAuth({ api, config, csrf, navigate, currentPath: () => path });
  holder.auth = auth;
  return { auth, api, csrf, navigate };
}

beforeAll(() => mockServer.listen({ onUnhandledFrame: 'error' }));
afterEach(() => {
  mockServer.resetHandlers();
  resetMockState();
});
afterAll(() => mockServer.close());

describe('isSafeRedirect', () => {
  it.each(['/panel', '/panel/kayitlar?durum=acik', '/'])('%s güvenlidir', (path) => {
    expect(isSafeRedirect(path)).toBe(true);
  });

  it.each(['//kotu.example.test', 'https://kotu.example.test', '/a\\b', '/a b', 'panel', '/"x"'])(
    '%s güvenli değildir',
    (path) => {
      expect(isSafeRedirect(path)).toBe(false);
    },
  );
});

describe('createAuth', () => {
  it('oturum açıksa kullanıcıyı yazar', async () => {
    const { auth } = setup();
    await auth.check();
    expect(auth.getState()).toEqual({ status: 'signed_in', user: SAMPLE_USER });
  });

  it('oturum kapalıysa signed_out olur ve yönlendirmez', async () => {
    mockState.signedIn = false;
    mockServer.use(
      http.get('*/api/method/frappe.auth.get_logged_user', () =>
        HttpResponse.json({ exc_type: 'PermissionError' }, { status: 403 }),
      ),
    );
    const { auth, navigate } = setup();
    await auth.check();
    expect(auth.getState()).toEqual({ status: 'signed_out' });
    expect(navigate).not.toHaveBeenCalled();
  });

  it('girişte sunucunun verdiği Keycloak adresine gider ve dönüş yolunu verir', async () => {
    let body: unknown;
    mockServer.events.on('request:start', async ({ request }) => {
      if (request.url.includes('get_login_url')) body = await request.clone().json();
    });
    const { auth, navigate } = setup();

    await auth.signIn();

    expect(body).toEqual({ redirect_to: '/panel/kayitlar?durum=acik' });
    expect(navigate).toHaveBeenCalledWith(sampleLoginUrl.login_url);
    expect(auth.getState()).toEqual({ status: 'redirecting' });
    mockServer.events.removeAllListeners();
  });

  it('güvensiz dönüş yolunu göndermez', async () => {
    let body: unknown;
    mockServer.events.on('request:start', async ({ request }) => {
      if (request.url.includes('get_login_url')) body = await request.clone().json();
    });
    const { auth } = setup('//kotu.example.test');

    await auth.signIn();

    expect(body).toEqual({});
    mockServer.events.removeAllListeners();
  });

  it.each([
    [
      'başka kök',
      'https://kotu.example.test/realms/platform/protocol/openid-connect/auth?code_challenge_method=S256',
    ],
    [
      'başka realm',
      `${SAMPLE_KEYCLOAK_URL}/realms/baska/protocol/openid-connect/auth?code_challenge_method=S256`,
    ],
    ['PKCE yok', `${SAMPLE_KEYCLOAK_URL}/realms/platform/protocol/openid-connect/auth`],
    [
      'düz HTTP',
      `http://kimlik.example.test/realms/platform/protocol/openid-connect/auth?code_challenge_method=S256`,
    ],
  ])('giriş adresi güvensizse (%s) gitmez', async (_label, loginUrl) => {
    mockServer.use(
      http.post('*/api/method/platform_core.api.auth.get_login_url', () =>
        HttpResponse.json({ message: { ...sampleLoginUrl, login_url: loginUrl } }),
      ),
    );
    const { auth, navigate } = setup();

    await auth.signIn();

    expect(navigate).not.toHaveBeenCalled();
    expect(auth.getState()).toMatchObject({ status: 'error', error: { kind: 'invalid_response' } });
  });

  it('çıkışta CSRF belirtecini siler ve Keycloak çıkışına gider', async () => {
    const { auth, csrf, navigate } = setup();
    await auth.check();

    await auth.signOut();

    expect(csrf.get()).toBeUndefined();
    expect(navigate).toHaveBeenCalledWith(
      expect.stringMatching(/^https:\/\/kimlik\.example\.test\/realms\/platform\//),
    );
    expect(auth.getState()).toEqual({ status: 'redirecting' });
  });

  it('oturum bitince belirteci siler ve bir kez yeniden girişe yönlendirir', async () => {
    const { auth, api, csrf, navigate } = setup();
    await auth.check();
    mockState.signedIn = false;

    await Promise.allSettled([api.getBootstrap(), api.getBootstrap()]);
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledTimes(1));

    expect(csrf.get()).toBeUndefined();
    expect(navigate).toHaveBeenCalledWith(sampleLoginUrl.login_url);
  });

  it('durum değişince aboneleri haberdar eder', async () => {
    const { auth } = setup();
    const listener = vi.fn();
    const unsubscribe = auth.subscribe(listener);

    await auth.check();
    unsubscribe();
    await auth.check();

    expect(listener).toHaveBeenCalledTimes(1);
  });
});
