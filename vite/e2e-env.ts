import { resolve } from 'node:path';

import { loadEnv } from 'vite';
import type { Plugin } from 'vite';

/**
 * e2e kipinin ortam değerleri. Gizli bilgi değildir.
 * Vite bu değerleri yalnız `e2e` kipinde verir: `npm run build:e2e` ve `npm run dev:e2e`.
 * Depoda `.env` dosyası tutulmaz. Yayın kapısı her `.env` dosyasını gizli dosya sayar.
 * Keycloak kökü AtonotA Login giriş adresidir. Testler bu adresin yanıtını taklit eder.
 * Bu kök sahte sunucunun köküyle aynıdır: `src/mocks/fixtures.ts` içindeki `SAMPLE_KEYCLOAK_URL`.
 * Tarayıcı testleri `atonota.net` alanına giden isteği keser: `tests/setup/playwright-fixtures.ts`.
 * Test: `src/auth/e2e-env.test.ts` ve `src/mocks/build-output.node.test.ts`.
 * Üretim paketine girmediğini `src/app/build-output.node.test.ts` denetler.
 */
export const E2E_ENV = {
  VITE_API_MOCKS: 'on',
  VITE_KEYCLOAK_URL: 'https://api.login.atonota.net',
} as const;

export type E2eEnvKey = keyof typeof E2E_ENV;

/**
 * Kipin e2e değerleri. Öteki kiplerde boş döner.
 * `env` içinde aynı adlı değer varsa o değer kullanılır.
 * Vite yapılandırması `env` olarak `loadEnv` sonucunu verir (bkz. `e2eEnvPlugin`).
 */
export function e2eEnv(
  mode: string,
  env: Record<string, string | undefined> = process.env,
): Partial<Record<E2eEnvKey, string>> {
  if (mode !== 'e2e') return {};
  return Object.fromEntries(
    (Object.keys(E2E_ENV) as E2eEnvKey[]).map((key) => [key, env[key] ?? E2E_ENV[key]]),
  );
}

/** e2e değerlerini `import.meta.env` için `define` girdisine çevirir. */
export function e2eEnvDefine(
  mode: string,
  env: Record<string, string | undefined> = process.env,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(e2eEnv(mode, env)).map(([key, value]) => [
      `import.meta.env.${key}`,
      JSON.stringify(value),
    ]),
  );
}

/**
 * e2e değerlerini Vite `define` girdisine yazan eklenti.
 * Değerler Vite'ın `loadEnv` sonucundan okunur. Bu sonuç `.env.e2e.local` gibi dosyaları ve
 * ortam değişkenlerini kapsar. Sahte sunucu eklentisi de aynı sonucu `config.env` ile okur.
 * Böylece iki yer aynı kaynağı kullanır (inceleme 1, K-2).
 */
export function e2eEnvPlugin(): Plugin {
  return {
    name: 'atonota-e2e-env',
    config(userConfig, { mode }) {
      const root = resolve(userConfig.root ?? process.cwd());
      const envDir =
        userConfig.envDir === false
          ? false
          : userConfig.envDir
            ? resolve(root, userConfig.envDir)
            : root;
      const env = loadEnv(mode, envDir, userConfig.envPrefix ?? 'VITE_');
      return { define: e2eEnvDefine(mode, env) };
    },
  };
}
