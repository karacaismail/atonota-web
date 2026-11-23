// @vitest-environment node
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
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

/** Ortam dosyaları geçici bir klasörden okunur. Depodaki dosyalara dokunulmaz. */
async function configWithEnvFile(command: 'build' | 'serve', file: string, body: string) {
  const envDir = mkdtempSync(join(tmpdir(), 'atonota-env-'));
  try {
    writeFileSync(join(envDir, file), body);
    return await resolveConfig({ root: ROOT, mode: 'e2e', envDir, logLevel: 'silent' }, command);
  } finally {
    rmSync(envDir, { recursive: true, force: true });
  }
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

  // İnceleme 1, K-2: `define` ile sahte sunucu eklentisi aynı kaynağı okur: Vite'ın `loadEnv` sonucu.
  for (const command of ['build', 'serve'] as const) {
    it(`${command}: .env.e2e.local dosyasındaki değer define değerine geçer`, async () => {
      const config = await configWithEnvFile(
        command,
        '.env.e2e.local',
        'VITE_KEYCLOAK_URL=https://yerel.example.test\nVITE_API_MOCKS=off\n',
      );
      expect(config.define?.['import.meta.env.VITE_KEYCLOAK_URL']).toBe(
        JSON.stringify('https://yerel.example.test'),
      );
      expect(config.define?.['import.meta.env.VITE_API_MOCKS']).toBe(JSON.stringify('off'));
      // Sahte sunucu eklentisi `config.env` değerini okur. İki kaynak aynı değeri verir.
      expect(config.env['VITE_KEYCLOAK_URL']).toBe('https://yerel.example.test');
      expect(config.env['VITE_API_MOCKS']).toBe('off');
    });

    it(`${command}: dosyada olmayan değer e2e varsayılanında kalır`, async () => {
      const config = await configWithEnvFile(
        command,
        '.env.e2e.local',
        'VITE_KEYCLOAK_URL=https://yerel.example.test\n',
      );
      expect(config.define?.['import.meta.env.VITE_API_MOCKS']).toBe(JSON.stringify('on'));
    });
  }

  it('üretim kipinde bu değerler verilmez', async () => {
    const define = await defineFor('production', 'build');
    expect(define['import.meta.env.VITE_KEYCLOAK_URL']).toBeUndefined();
    expect(define['import.meta.env.VITE_API_MOCKS']).toBeUndefined();
  });
});
