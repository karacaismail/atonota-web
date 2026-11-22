import { describe, expect, it } from 'vitest';

import css from './shell.css?raw';

/**
 * Önemli 2 ve 3: stil dosyasında sabit değer yazılmaz.
 * Sabit değerler yalnız dosya başındaki adlı değer bölümünde durur.
 */

const START = '/* @adli-degerler:basla */';
const END = '/* @adli-degerler:bitir */';

function body(): string {
  const a = css.indexOf(START);
  const b = css.indexOf(END);
  expect(a).toBeGreaterThanOrEqual(0);
  expect(b).toBeGreaterThan(a);
  const rest = css.slice(0, a) + css.slice(b + END.length);
  // Yorumlar denetlenmez.
  return rest.replace(/\/\*[\s\S]*?\*\//g, '');
}

describe('shell.css', () => {
  it('adlı değer bölümü dışında sabit px değeri yoktur', () => {
    const hits = body().match(/(?<![\w-])-?\d*\.?\d+px\b/g) ?? [];
    expect(hits).toEqual([]);
  });

  it('adlı değer bölümü dışında sabit süre yoktur', () => {
    const hits = body().match(/(?<![\w-])\d*\.?\d+m?s\b/g) ?? [];
    expect(hits).toEqual([]);
  });

  it('sabit renk yoktur', () => {
    const hits = body().match(/#[0-9a-f]{3,8}\b|rgba?\(/gi) ?? [];
    expect(hits).toEqual([]);
  });

  it('köşe yarıçapı yalnız tokendır ya da daire içindir', () => {
    const values = [...body().matchAll(/border(?:-[a-z-]+)?-radius:\s*([^;]+);/g)].map((m) =>
      m[1]?.trim(),
    );
    for (const v of values) {
      expect(['var(--shell-radius)', '50%', '0']).toContain(v);
    }
  });
});
