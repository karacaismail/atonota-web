import { describe, expect, it } from 'vitest';

import {
  isGuardedUrl,
  parseRealServerLogLine,
  REAL_SERVER_LOG_PREFIX,
  realServerLogLine,
} from './real-server';

describe('gerçek sunucu koruması', () => {
  it.each([
    'https://api.login.atonota.net/realms/platform',
    'https://api.login.alpha.atonota.net/x',
    'https://atonota.net/',
    'http://ATONOTA.NET/',
  ])('%s korunur', (url) => {
    expect(isGuardedUrl(new URL(url))).toBe(true);
  });

  it.each([
    'http://127.0.0.1:4173/api/method/frappe.auth.get_logged_user',
    'https://notatonota.net/',
    'https://atonota.net.example.test/',
  ])('%s korunmaz', (url) => {
    expect(isGuardedUrl(new URL(url))).toBe(false);
  });

  it('günlük satırını yazar ve geri okur', () => {
    const line = realServerLogLine('GET', 'https://api.login.atonota.net/x');
    expect(line.startsWith(REAL_SERVER_LOG_PREFIX)).toBe(true);
    expect(parseRealServerLogLine(line)).toBe('GET https://api.login.atonota.net/x');
  });

  it('başka günlük satırını kesilen istek saymaz', () => {
    expect(parseRealServerLogLine('[MSW] Warning: x')).toBeNull();
  });
});
