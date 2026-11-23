/**
 * e2e kipinin ortam değerleri. Gizli bilgi değildir. Değerler örnek alan adlarıdır.
 * Vite bu değerleri yalnız `e2e` kipinde verir: `npm run build:e2e` ve `npm run dev:e2e`.
 * Depoda `.env` dosyası tutulmaz. Yayın kapısı her `.env` dosyasını gizli dosya sayar.
 * Keycloak kökü sahte sunucunun köküdür: `src/mocks/fixtures.ts` içindeki `SAMPLE_KEYCLOAK_URL`.
 * Test: `src/auth/e2e-env.test.ts` ve `src/mocks/build-output.node.test.ts`.
 * Üretim paketine girmediğini `src/app/build-output.node.test.ts` denetler.
 */
export const E2E_ENV = {
  VITE_API_MOCKS: 'on',
  VITE_KEYCLOAK_URL: 'https://kimlik.example.test',
} as const;

export type E2eEnvKey = keyof typeof E2E_ENV;

/**
 * Kipin e2e değerleri. Öteki kiplerde boş döner.
 * Ortamda aynı adlı değişken varsa o değer kullanılır.
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
