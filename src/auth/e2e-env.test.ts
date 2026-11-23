// @vitest-environment node
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { resolveConfig } from 'vite';
import { describe, expect, it } from 'vitest';

import { SAMPLE_KEYCLOAK_URL } from '../mocks/fixtures';

// Vitest depo kökünden koşar. `vite.config.ts` oradadır.
const ROOT = process.cwd();

async function defineFor(mode: string, command: 'build' | 'serve') {
  const config = await resolveConfig({ root: ROOT, mode, logLevel: 'silent' }, command);
  return config.define ?? {};
}

/**
 * İnceleme 2, K-3: e2e kipinin Keycloak kökü tek bir yerdedir: `vite/e2e-env.ts`.
 * Vite bu değerleri yalnız `e2e` kipinde verir: `build:e2e` ve `dev:e2e`.
 * Depoda `.env` dosyası yoktur. Yayın kapısı her `.env` dosyasını gizli dosya sayar.
 */
describe('e2e kipinin ortam ayarı', () => {
  it('depoda .env.e2e dosyası yoktur', () => {
    expect(existsSync(join(ROOT, '.env.e2e'))).toBe(false);
  });

  for (const command of ['build', 'serve'] as const) {
    it(`${command}: Keycloak kökü sahte sunucunun Keycloak köküyle aynıdır`, async () => {
      const define = await defineFor('e2e', command);
      expect(define['import.meta.env.VITE_KEYCLOAK_URL']).toBe(JSON.stringify(SAMPLE_KEYCLOAK_URL));
    });

    it(`${command}: sahte sunucu e2e kipinde açıktır`, async () => {
      const define = await defineFor('e2e', command);
      expect(define['import.meta.env.VITE_API_MOCKS']).toBe(JSON.stringify('on'));
    });
  }

  it('üretim kipinde bu değerler verilmez', async () => {
    const define = await defineFor('production', 'build');
    expect(define['import.meta.env.VITE_KEYCLOAK_URL']).toBeUndefined();
    expect(define['import.meta.env.VITE_API_MOCKS']).toBeUndefined();
  });
});
