import { describe, expect, it } from 'vitest';

import { isMockedApiRequest, mocksEnabled } from './start';

describe('mocksEnabled', () => {
  it.each([
    [{ DEV: true }, true],
    [{ DEV: true, VITE_API_MOCKS: 'off' }, false],
    [{ DEV: false }, false],
    [{ DEV: false, VITE_API_MOCKS: 'on' }, true],
    [{ DEV: false, VITE_API_MOCKS: 'yes' }, false],
  ])('%o için %s döner', (env, expected) => {
    expect(mocksEnabled(env)).toBe(expected);
  });
});

describe('isMockedApiRequest', () => {
  it.each([
    ['http://127.0.0.1:4173/api/method/frappe.auth.get_logged_user', true],
    ['http://127.0.0.1:4173/api/v2/document/User?fields=%5B%22name%22%5D', true],
    ['https://kiraci.example.test/api/resource/Leave%20Application', true],
  ])('%s sahte sunucuya aittir', (url, expected) => {
    expect(isMockedApiRequest(url)).toBe(expected);
  });

  it.each([
    'http://127.0.0.1:4173/',
    'http://127.0.0.1:4173/account',
    'http://127.0.0.1:4173/assets/main-abc123.js',
    'http://127.0.0.1:4173/.vite/manifest.json',
    'http://127.0.0.1:4173/mockServiceWorker.js',
    'http://127.0.0.1:4173/apis/other',
  ])('%s sahte sunucuya ait değildir ve olduğu gibi geçer', (url) => {
    expect(isMockedApiRequest(url)).toBe(false);
  });
});
