// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  extractCsrfToken,
  injectCsrfMeta,
  isBackendPath,
  devBackendProxy,
  isSpaNavigation,
  panelRedirect,
  readDevBackend,
  rewriteLocation,
} from './dev-backend.ts';

describe('readDevBackend', () => {
  it('ayar yoksa kapalıdır', () => {
    expect(readDevBackend({})).toBeUndefined();
    expect(readDevBackend({ VITE_DEV_BACKEND: '  ' })).toBeUndefined();
  });

  it('adresi, site adını ve Host kipini okur', () => {
    expect(
      readDevBackend({
        VITE_DEV_BACKEND: 'http://127.0.0.1:7400/',
        VITE_DEV_SITE_NAME: 'kiraci.localhost',
        VITE_DEV_BACKEND_HOST: 'target',
      }),
    ).toEqual({
      target: 'http://127.0.0.1:7400',
      siteName: 'kiraci.localhost',
      host: 'target',
    });
  });

  it('socket.io için ayrı hedef okur', () => {
    expect(
      readDevBackend({
        VITE_DEV_BACKEND: 'http://127.0.0.1:7401',
        VITE_DEV_SOCKET: 'http://127.0.0.1:7402/',
      })?.socketTarget,
    ).toBe('http://127.0.0.1:7402');
  });

  it('Host kipi varsayılan olarak tarayıcının kökünü korur', () => {
    expect(readDevBackend({ VITE_DEV_BACKEND: 'http://127.0.0.1:7400' })?.host).toBe('browser');
  });

  it('geçersiz adresi reddeder', () => {
    expect(() => readDevBackend({ VITE_DEV_BACKEND: 'kiraci' })).toThrow(/VITE_DEV_BACKEND/);
  });
});

describe('isBackendPath', () => {
  it.each([
    '/api/method/frappe.auth.get_logged_user',
    '/api/v2/document/Note',
    '/login',
    '/login?redirect-to=/panel',
    '/logout',
    '/assets/frappe/dist/css/login.bundle.css',
    '/files/a.png',
    '/private/files/a.png',
    '/app/todo',
    '/socket.io/?EIO=4',
    '/update-password',
    '/website_script.js',
  ])('%s arka uca gider', (path) => {
    expect(isBackendPath(path)).toBe(true);
  });

  it.each([
    '/',
    '/asistan',
    '/hesap/sales-invoice',
    '/panel',
    '/panel/ai',
    '/apiler',
    '/@vite/client',
    '/src/main.tsx',
    '/node_modules/.vite/deps/react.js',
    '/mockServiceWorker.js',
  ])('%s Vite içinde kalır', (path) => {
    expect(isBackendPath(path)).toBe(false);
  });
});

describe('isSpaNavigation', () => {
  it('HTML isteyen GET isteği uygulama sayfasıdır', () => {
    expect(isSpaNavigation('GET', '/hesap/sales-invoice', 'text/html,*/*')).toBe(true);
    expect(isSpaNavigation('GET', '/', 'text/html')).toBe(true);
  });

  it('dosya, Vite yolu ve arka uç yolu sayfa değildir', () => {
    expect(isSpaNavigation('GET', '/src/main.tsx', 'text/html')).toBe(false);
    expect(isSpaNavigation('GET', '/favicon.svg', 'text/html')).toBe(false);
    expect(isSpaNavigation('GET', '/login', 'text/html')).toBe(false);
    expect(isSpaNavigation('POST', '/', 'text/html')).toBe(false);
    expect(isSpaNavigation('GET', '/', 'application/json')).toBe(false);
  });
});

describe('extractCsrfToken', () => {
  it('panel sayfasındaki meta değerini okur', () => {
    const html = '<head><meta name="csrf-token" content="abc&amp;123"></head>';
    expect(extractCsrfToken(html, 'csrf-token')).toBe('abc&123');
  });

  it('boş ya da eksik değerde undefined döner', () => {
    expect(extractCsrfToken('<meta name="csrf-token" content="">', 'csrf-token')).toBeUndefined();
    expect(extractCsrfToken('<html></html>', 'csrf-token')).toBeUndefined();
  });
});

describe('injectCsrfMeta', () => {
  it('meta öğesini head içine kaçışlı olarak koyar', () => {
    const out = injectCsrfMeta('<html><head><title>x</title></head></html>', 'csrf-token', 'a"<b');
    expect(out).toContain('<meta name="csrf-token" content="a&quot;&lt;b">');
    expect(out.indexOf('<meta name="csrf-token"')).toBeLessThan(out.indexOf('</head>'));
  });
});

describe('rewriteLocation', () => {
  const backend = 'http://127.0.0.1:7400';

  it('arka uç ve tarayıcı kökündeki adresi göreli yola çevirir', () => {
    expect(
      rewriteLocation('http://127.0.0.1:7400/panel?a=1', backend, 'http://localhost:5180'),
    ).toBe('/panel?a=1');
    expect(rewriteLocation('http://localhost:5180/', backend, 'http://localhost:5180')).toBe('/');
  });

  it('Keycloak gibi başka kökteki adresi değiştirmez', () => {
    const kc = 'http://127.0.0.1:7480/realms/platform/protocol/openid-connect/auth?x=1';
    expect(rewriteLocation(kc, backend, 'http://localhost:5180')).toBe(kc);
  });

  it('göreli yolu değiştirmez', () => {
    expect(rewriteLocation('/login', backend, 'http://localhost:5180')).toBe('/login');
  });
});

describe('panelRedirect', () => {
  it('arka ucun panel adresini uygulamanın köküne yönlendirir', () => {
    expect(panelRedirect('/panel')).toBe('/');
    expect(panelRedirect('/panel/')).toBe('/');
  });

  it('öteki yollarda yönlendirme yoktur', () => {
    expect(panelRedirect('/panel/ai')).toBeUndefined();
    expect(panelRedirect('/')).toBeUndefined();
  });
});

describe('devBackendProxy', () => {
  it('socket.io ayrı hedefe, öteki yollar kiracıya gider', () => {
    const proxy = devBackendProxy({
      target: 'http://127.0.0.1:7401',
      socketTarget: 'http://127.0.0.1:7402',
      host: 'browser',
    });
    const socket = Object.entries(proxy).find(([key]) =>
      new RegExp(key).test('/socket.io/?EIO=4'),
    )?.[1];
    expect(socket?.target).toBe('http://127.0.0.1:7402');
    expect(socket?.ws).toBe(true);
    const rest = Object.entries(proxy).find(([key]) => new RegExp(key).test('/api/method/ping'));
    expect(rest?.[1].target).toBe('http://127.0.0.1:7401');
    expect(rest?.[0]).not.toContain('socket');
  });

  it('socket hedefi yoksa socket.io kiracıya gider', () => {
    const proxy = devBackendProxy({ target: 'http://127.0.0.1:7401', host: 'browser' });
    expect(Object.keys(proxy)).toHaveLength(1);
    expect(Object.keys(proxy)[0]).toContain('socket');
  });
});
