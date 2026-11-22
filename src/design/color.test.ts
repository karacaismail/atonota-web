import { describe, expect, it } from 'vitest';

import { hexToRgba } from './color';

describe('hexToRgba', () => {
  it('altı haneli rengi çevirir', () => {
    expect(hexToRgba('#00aacc', 0.85)).toBe('rgba(0,170,204,0.85)');
  });
  it('üç haneli rengi çevirir', () => {
    expect(hexToRgba('#fff', 1)).toBe('rgba(255,255,255,1)');
  });
  it('geçersiz rengi reddeder', () => {
    expect(() => hexToRgba('mavi', 1)).toThrow();
  });
});

import { contrastRatio, darkenToContrast, relativeLuminance } from './color';

describe('kontrast yardımcıları', () => {
  it('siyah ve beyaz 21:1 verir', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 6);
  });
  it('birincil renk beyaz üzerinde AA sınırının altındadır', () => {
    expect(contrastRatio('#00aacc', '#ffffff')).toBeLessThan(4.5);
  });
  it('koyulaştırma AA sınırına ulaşır ve tonu korur', () => {
    const safe = darkenToContrast('#00aacc', '#ffffff');
    expect(contrastRatio(safe, '#ffffff')).toBeGreaterThanOrEqual(4.5);
    expect(safe.startsWith('#00')).toBe(true);
  });
  it('yeterli renk değişmez', () => {
    expect(darkenToContrast('#000000', '#ffffff')).toBe('#000000');
  });
});
