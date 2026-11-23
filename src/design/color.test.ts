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

import { contrastRatio, darkenToContrast, lightenToContrast, relativeLuminance } from './color';

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

  it('lightenToContrast koyu zeminde rengi açarak en az 4.5:1 verir; ton korunur', () => {
    const lifted = lightenToContrast('#dc4446', '#2a2a30');
    expect(contrastRatio(lifted, '#2a2a30')).toBeGreaterThanOrEqual(4.5);
    expect(relativeLuminance(lifted)).toBeGreaterThan(relativeLuminance('#dc4446'));
    const [r, g, b] = [lifted.slice(1, 3), lifted.slice(3, 5), lifted.slice(5, 7)].map((h) => parseInt(h, 16));
    expect(r).toBeGreaterThan(g!);
    expect(r).toBeGreaterThan(b!);
    expect(lightenToContrast('#ffffff', '#000000')).toBe('#ffffff');
    expect(lightenToContrast('#dc4446', '#2a2a30', 6)).not.toBe(lifted);
  });
});

import { blendOver, minAlphaForContrast } from './color';

describe('opaklık türetme', () => {
  it('bindirme düz renk üretir', () => {
    expect(blendOver('#ffffff', 0.5, '#000000')).toBe('#808080');
    expect(blendOver('#00aacc', 1, '#000000')).toBe('#00aacc');
  });
  it('kontrastı sağlayan en küçük opaklığı bulur', () => {
    const alpha = minAlphaForContrast({
      text: '#00aacc', startAlpha: 0.85, background: '#00aacc', backgroundAlpha: 0.14,
      surfaces: ['#17171A', '#1F1F23'],
    });
    expect(alpha).toBeGreaterThan(0.85);
    expect(alpha).toBeLessThanOrEqual(1);
    const check = (a: number) =>
      ['#17171A', '#1F1F23'].every((sfc) => {
        const bg = blendOver('#00aacc', 0.14, sfc);
        return contrastRatio(blendOver('#00aacc', a, bg), bg) >= 4.5;
      });
    expect(check(alpha)).toBe(true);
    expect(check(alpha - 0.01)).toBe(false);
  });
  it('yeterli opaklık değişmez', () => {
    expect(minAlphaForContrast({ text: '#ffffff', startAlpha: 0.9, background: '#000000', backgroundAlpha: 1, surfaces: ['#000000'] })).toBe(0.9);
  });
});
