// Geliştirme sunucusunu yerel Frappe arka ucuna bağlar.
//
// Ayar yalnız geliştirme sunucusunda çalışır. Üretim derlemesine girmez.
// Tarayıcı aynı kökte kalır: Frappe yolları (`/api`, `/login`, `/assets` ...) vekille arka uca gider.
// Belirteç tarayıcıda tutulmaz. Frappe oturum çerezi ve CSRF belirteci kullanılır (src/auth/README.md).
// CSRF belirteci arka ucun `/panel` sayfasındaki `meta` öğesinden alınır ve uygulama sayfasına konur.
import { readFileSync } from 'node:fs';
import type { IncomingMessage } from 'node:http';
import { resolve } from 'node:path';

import type { Plugin, ProxyOptions } from 'vite';

export interface DevBackendEnv {
  /** Kiracı sitesinin arka uç adresi. Örnek: `http://127.0.0.1:7401`. Boşsa vekil kapalıdır. */
  VITE_DEV_BACKEND?: string;
  /** Frappe socket.io sunucusunun adresi. Boşsa socket.io da `VITE_DEV_BACKEND` adresine gider. */
  VITE_DEV_SOCKET?: string;
  /** Frappe site adı. Verilirse `X-Frappe-Site-Name` başlığıyla gönderilir. */
  VITE_DEV_SITE_NAME?: string;
  /**
   * Host başlığı. `browser` tarayıcının kökünü korur; Frappe dönüş adresini bu köke göre kurar.
   * `target` arka ucun adresini gönderir. Varsayılan `browser`.
   */
  VITE_DEV_BACKEND_HOST?: string;
  /** CSRF `meta` öğesinin adı. Varsayılan `csrf-token`. */
  VITE_CSRF_META_NAME?: string;
}

export interface DevBackend {
  target: string;
  socketTarget?: string;
  siteName?: string;
  host: 'browser' | 'target';
}

function readOrigin(name: string, raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`${name} geçerli bir adres değil: ${raw}`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`${name} http ya da https olmalı: ${raw}`);
  }
  return url.origin;
}

export function readDevBackend(env: DevBackendEnv): DevBackend | undefined {
  const raw = env.VITE_DEV_BACKEND?.trim();
  if (!raw) return undefined;
  const socket = env.VITE_DEV_SOCKET?.trim();
  const siteName = env.VITE_DEV_SITE_NAME?.trim();
  return {
    target: readOrigin('VITE_DEV_BACKEND', raw),
    ...(socket ? { socketTarget: readOrigin('VITE_DEV_SOCKET', socket) } : {}),
    ...(siteName ? { siteName } : {}),
    host: env.VITE_DEV_BACKEND_HOST?.trim() === 'target' ? 'target' : 'browser',
  };
}

/** Frappe'nin sunduğu yol önekleri. Uygulamanın rotaları bunlarla başlamaz. */
const BACKEND_PREFIXES = [
  '/api',
  '/login',
  '/logout',
  '/assets',
  '/files',
  '/private',
  '/app',
  '/desk',
  '/socket.io',
  '/update-password',
  '/website_script.js',
];

function pathOf(url: string): string {
  return new URL(url, 'http://localhost').pathname;
}

export function isBackendPath(url: string): boolean {
  const path = pathOf(url);
  return BACKEND_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`),
  );
}

/** Uygulama sayfası isteği mi? Vite yolları, dosyalar ve arka uç yolları sayfa değildir. */
export function isSpaNavigation(
  method: string | undefined,
  url: string,
  accept: string | undefined,
): boolean {
  if (method !== 'GET' && method !== 'HEAD') return false;
  if (!accept?.includes('text/html')) return false;
  const path = pathOf(url);
  if (path.startsWith('/@') || path.startsWith('/src/') || path.startsWith('/node_modules/')) {
    return false;
  }
  if (/\.[A-Za-z0-9]+$/.test(path)) return false;
  return !isBackendPath(path);
}

/** Arka uç girişten sonra `/panel` adresine dönebilir. Uygulama kökte çalışır. */
export function panelRedirect(url: string): string | undefined {
  const path = pathOf(url);
  return path === '/panel' || path === '/panel/' ? '/' : undefined;
}

function decodeEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function extractCsrfToken(html: string, metaName: string): string | undefined {
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = match[0];
    const name = /\bname\s*=\s*"([^"]*)"/i.exec(tag)?.[1];
    if (name !== metaName) continue;
    const content = decodeEntities(/\bcontent\s*=\s*"([^"]*)"/i.exec(tag)?.[1] ?? '').trim();
    return content.length > 0 ? content : undefined;
  }
  return undefined;
}

export function injectCsrfMeta(html: string, metaName: string, token: string): string {
  const meta = `<meta name="${escapeAttr(metaName)}" content="${escapeAttr(token)}">`;
  return html.replace(/<\/head>/i, `    ${meta}\n  </head>`);
}

/** Arka ucun ya da tarayıcının kökündeki yönlendirmeyi göreli yola çevirir. Başka kök değişmez. */
export function rewriteLocation(location: string, backend: string, browserOrigin: string): string {
  let url: URL;
  try {
    url = new URL(location);
  } catch {
    return location;
  }
  if (url.origin !== new URL(backend).origin && url.origin !== browserOrigin) return location;
  return `${url.pathname}${url.search}${url.hash}`;
}

function browserOriginOf(request: IncomingMessage): string {
  const proto = request.headers['x-forwarded-proto'] ?? 'http';
  return `${String(proto)}://${request.headers.host ?? 'localhost'}`;
}

function backendHeaders(backend: DevBackend, request: IncomingMessage): Record<string, string> {
  const headers: Record<string, string> = {};
  if (backend.siteName) headers['X-Frappe-Site-Name'] = backend.siteName;
  if (backend.host === 'browser' && request.headers.host) {
    headers['X-Forwarded-Host'] = request.headers.host;
    headers['X-Forwarded-Proto'] = 'http';
  }
  return headers;
}

/** Vite `server.proxy` ayarı. Bütün Frappe önekleri arka uca gider. */
export function devBackendProxy(backend: DevBackend): Record<string, ProxyOptions> {
  const options: ProxyOptions = {
    target: backend.target,
    changeOrigin: backend.host === 'target',
    ws: true,
    // Çerez alan adı silinir. Çerez tarayıcının köküne yazılır.
    cookieDomainRewrite: '',
    configure(proxy) {
      proxy.on('proxyReq', (proxyReq, request) => {
        for (const [name, value] of Object.entries(backendHeaders(backend, request))) {
          proxyReq.setHeader(name, value);
        }
      });
      proxy.on('proxyRes', (proxyRes, request) => {
        const location = proxyRes.headers.location;
        if (typeof location === 'string') {
          proxyRes.headers.location = rewriteLocation(
            location,
            backend.target,
            browserOriginOf(request),
          );
        }
        // Yerel http adresinde `Secure` çerez yazılmaz. Bayrak yalnız geliştirmede silinir.
        const cookies = proxyRes.headers['set-cookie'];
        if (Array.isArray(cookies)) {
          proxyRes.headers['set-cookie'] = cookies.map((cookie) =>
            cookie.replace(/;\s*Secure/gi, ''),
          );
        }
      });
    },
  };
  const patternOf = (prefixes: string[]) =>
    `^(${prefixes.map((p) => p.replace(/[.]/g, '\\.')).join('|')})(/|\\?|$)`;
  if (!backend.socketTarget) return { [patternOf(BACKEND_PREFIXES)]: options };
  // socket.io ayrı süreçtir (Frappe `socketio`). Gerçek zamanlı istekler oraya gider.
  return {
    [patternOf(['/socket.io'])]: { ...options, target: backend.socketTarget },
    [patternOf(BACKEND_PREFIXES.filter((p) => p !== '/socket.io'))]: options,
  };
}

async function fetchCsrfToken(
  backend: DevBackend,
  request: IncomingMessage,
  metaName: string,
): Promise<string | undefined> {
  const cookie = request.headers.cookie;
  // Oturum çerezi yoksa arka uç `/panel` isteğini girişe yönlendirir. Sormaya gerek yoktur.
  if (!cookie || !/(?:^|;\s*)sid=(?!Guest)/.test(cookie)) return undefined;
  const headers: Record<string, string> = { cookie, accept: 'text/html' };
  Object.assign(headers, backendHeaders(backend, request));
  if (backend.host === 'browser' && request.headers.host) headers['host'] = request.headers.host;
  try {
    const response = await fetch(`${backend.target}/panel`, { headers, redirect: 'manual' });
    if (!response.ok) return undefined;
    return extractCsrfToken(await response.text(), metaName);
  } catch {
    return undefined;
  }
}

/**
 * Geliştirme sunucusu eklentisi. Uygulama sayfasına CSRF `meta` öğesini koyar ve
 * `/panel` adresini köke yönlendirir. Vekil ayarı `devBackendProxy` ile verilir.
 */
export function devBackendPlugin(backend: DevBackend | undefined, metaName = 'csrf-token'): Plugin {
  return {
    name: 'atonota-dev-backend',
    apply: 'serve',
    configureServer(server) {
      if (!backend) return;
      const indexFile = resolve(server.config.root, 'index.html');
      server.middlewares.use((request, response, next) => {
        const url = request.url ?? '/';
        const redirect = panelRedirect(url);
        if (redirect) {
          response.statusCode = 302;
          response.setHeader('Location', redirect);
          response.end();
          return;
        }
        if (!isSpaNavigation(request.method, url, request.headers.accept)) {
          next();
          return;
        }
        void (async () => {
          const template = readFileSync(indexFile, 'utf8');
          let html = await server.transformIndexHtml(url, template, request.originalUrl);
          const token = await fetchCsrfToken(backend, request, metaName);
          if (token) html = injectCsrfMeta(html, metaName, token);
          response.statusCode = 200;
          response.setHeader('Content-Type', 'text/html; charset=utf-8');
          response.setHeader('Cache-Control', 'no-store');
          response.end(request.method === 'HEAD' ? undefined : html);
        })().catch(next);
      });
    },
  };
}
