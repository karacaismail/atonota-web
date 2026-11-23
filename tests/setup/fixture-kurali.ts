/**
 * Tarayıcı testlerinin ortak fixture kuralı. Denetim: `src/app/e2e-fixture.node.test.ts`.
 * Arama iki tırnak türünü tanır. Noktalı virgül isteğe bağlıdır.
 */

/** `import ... from '@playwright/test'`. `import type` satırı serbesttir. */
const DIRECT_IMPORT = /(?:^|[\n;])\s*import\s+(?!type\b)[^;'"]*?\bfrom\s*(['"])@playwright\/test\1/;

/** `require('@playwright/test')` ve `import('@playwright/test')`. */
const DIRECT_CALL = /\b(?:require|import)\(\s*(['"])@playwright\/test\1\s*\)/;

const SHARED_FIXTURE = /\bfrom\s*(['"])[./]+(?:tests\/)?setup\/playwright-fixtures\1/;

/** Dosya `test` değerini doğrudan `@playwright/test` paketinden alır mı? */
export function importsPlaywrightDirectly(source: string): boolean {
  return DIRECT_IMPORT.test(source) || DIRECT_CALL.test(source);
}

/** Dosya ortak fixture dosyasını içe aktarır mı? */
export function importsSharedFixture(source: string): boolean {
  return SHARED_FIXTURE.test(source);
}
