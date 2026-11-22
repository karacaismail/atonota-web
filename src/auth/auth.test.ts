import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { createApiClient } from '@/api/client';
import type { ApiConfig } from '@/api/config';
import { createCsrfStore } from '@/api/csrf';
import { SAMPLE_CSRF_TOKEN, SAMPLE_KEYCLOAK_URL, SAMPLE_USER } from '@/mocks/fixtures';
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

  it('ilk oturum sorgusu 401 dönerse signed_out olur ve yönlendirmez', async () => {
    mockState.signedIn = false;
    const { auth, navigate } = setup();
    await auth.check();
    expect(auth.getState()).toEqual({ status: 'signed_out' });
    expect(navigate).not.toHaveBeenCalled();
  });

  it('ilk oturum sorgusu 503 dönerse hata gösterir ve yönlendirmez', async () => {
    mockServer.use(
      http.get('*/api/method/frappe.auth.get_logged_user', () =>
        HttpResponse.json({ exc_type: 'SessionExpired', session_expired: 1 }, { status: 503 }),
      ),
    );
    const { auth, navigate } = setup();
    await auth.check();
    expect(auth.getState()).toMatchObject({ status: 'error', error: { kind: 'unavailable' } });
    expect(navigate).not.toHaveBeenCalled();
  });

  it('girişte aynı kökteki start_login yoluna dönüş yoluyla gider', () => {
    const { auth, navigate } = setup();

    auth.signIn();

    expect(navigate).toHaveBeenCalledWith(
      'https://kiraci.example.test/api/method/platform_core.api.auth.start_login' +
        '?redirect_to=%2Fpanel%2Fkayitlar%3Fdurum%3Dacik',
    );
    expect(auth.getState()).toEqual({ status: 'redirecting' });
  });

  it('güvensiz dönüş yolunu göndermez', () => {
    const { auth, navigate } = setup('//kotu.example.test');
    auth.signIn();
    expect(navigate).toHaveBeenCalledWith(
      'https://kiraci.example.test/api/method/platform_core.api.auth.start_login',
    );
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

  it('oturum kullanım sırasında bitince belirteci siler ve bir kez girişe yönlendirir', async () => {
    const { auth, api, csrf, navigate } = setup();
    await auth.check();
    mockState.signedIn = false;

    await Promise.allSettled([api.getBootstrap(), api.getBootstrap()]);

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate.mock.calls[0]?.[0]).toContain('platform_core.api.auth.start_login');
    expect(csrf.get()).toBeUndefined();
  });

  it('oturum hiç açılmadıysa bitim bildirimi yönlendirmez, giriş ekranı gösterilir', () => {
    const { auth, navigate } = setup();
    auth.handleSessionExpired();
    expect(navigate).not.toHaveBeenCalled();
    expect(auth.getState()).toEqual({ status: 'signed_out' });
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
