// Ad `.node.test.ts` ile biter. Böylece Node türleri yalnız bu testte geçerlidir.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const src = readFileSync(`${process.cwd()}/src/shell/tokens.ts`, 'utf8');

/**
 * İnceleme 2, Küçük 3: kaynak alanı silinirse sabit yedek sessizce kullanılmaz.
 * Okuyucu hata verir.
 */
describe('tokens.ts', () => {
  it('sessiz sabit yedek değer yoktur', () => {
    expect(src.match(/\?\?\s*-?\d/g) ?? []).toEqual([]);
    expect(src.match(/\+\s*\d+\s*,?\s*$/gm) ?? []).toEqual([]);
  });
});
