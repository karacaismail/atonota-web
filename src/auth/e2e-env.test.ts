// @vitest-environment node
import { loadEnv } from 'vite';
import { describe, expect, it } from 'vitest';

import { SAMPLE_KEYCLOAK_URL } from '../mocks/fixtures';

// Vitest depo kökünden koşar. `.env.e2e` dosyası oradadır.
const ROOT = process.cwd();

/**
 * İnceleme 2, K-3: e2e kipinin Keycloak kökü tek bir yerdedir: `.env.e2e`.
 * Vite bu dosyayı `build:e2e` ve `dev:e2e` için kendiliğinden okur.
 * Böylece `npm run dev:e2e` ile açılan sunucuda da çıkış sahte Keycloak adresine gider.
 */
describe('e2e kipinin ortam ayarı', () => {
  it('Keycloak kökü sahte sunucunun Keycloak köküyle aynıdır', () => {
    const env = loadEnv('e2e', ROOT, 'VITE_');
    expect(env['VITE_KEYCLOAK_URL']).toBe(SAMPLE_KEYCLOAK_URL);
  });

  it('sahte sunucu e2e kipinde açıktır', () => {
    const env = loadEnv('e2e', ROOT, 'VITE_');
    expect(env['VITE_API_MOCKS']).toBe('on');
  });
});
