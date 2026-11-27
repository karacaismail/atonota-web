// @vitest-environment node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

const SRC = join(import.meta.dirname, '..', '..');

/** Dil eşleme dosyası. Ant Design ve Day.js dil nesneleri yalnız burada içe aktarılır. */
const LOCALE_MAP = 'app/locale/locale-map.ts';

/** Sabit dil nesnesi aktarımı. Örnek: `antd/locale/tr_TR`, `antd/es/locale/en_US`, `dayjs/locale/tr`. */
const HARDCODED_LOCALE =
  /from\s+['"](?:antd\/(?:es\/|lib\/)?locale\/\w+|dayjs\/locale\/[\w-]+)['"]|import\s+['"]dayjs\/locale\//;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

describe('sabit dil yalnız eşleme dosyasındadır', () => {
  it('bileşenler antd ve Day.js dil nesnesini doğrudan almaz', () => {
    const offenders = sourceFiles(SRC)
      .map((path) => relative(SRC, path))
      .filter((path) => path !== LOCALE_MAP)
      .filter((path) => HARDCODED_LOCALE.test(readFileSync(join(SRC, path), 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('eşleme dosyası iki dili de içe aktarır', () => {
    const map = readFileSync(join(SRC, LOCALE_MAP), 'utf8');
    expect(map).toMatch(/antd\/(?:es\/)?locale\/tr_TR/);
    expect(map).toMatch(/antd\/(?:es\/)?locale\/en_US/);
  });

  it('oturum açılınca modül ortamına sabit dil verilmez', () => {
    const root = readFileSync(join(SRC, 'app/Root.tsx'), 'utf8');
    expect(root).not.toMatch(/locale:\s*['"](?:tr|en)['"]/);
  });
});
