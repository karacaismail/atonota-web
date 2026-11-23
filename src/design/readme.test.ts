import { describe, expect, it } from 'vitest';

import { buildDesignCss } from './css-variables';
import readme from './README.md?raw';

describe('tasarım README belgesi', () => {
  it('üretilen her hareket değişkenini adıyla listeler (inceleme 2, K2)', () => {
    const names = [...new Set(buildDesignCss().match(/--motion-[a-z-]+(?=\s*:)/g) ?? [])];
    expect(names.length).toBeGreaterThan(10);
    const missing = names.filter((name) => !readme.includes(`\`${name}\``));
    expect(missing).toEqual([]);
  });

  it('solma eğrisi kararını yazar: kaynaktaki `ease` yerine genel S eğrisi', () => {
    expect(readme).toMatch(/Solma eğrisi/);
    expect(readme).toContain('`--motion-duration-glide-fade`');
    expect(readme).toContain('`--motion-easing-standard`');
  });
});
