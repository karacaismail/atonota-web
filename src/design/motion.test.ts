import { describe, expect, it } from 'vitest';

import { duration, easing, parseEasing, parseMs } from './motion';
import { designSource } from './source';

describe('motion tokenları', () => {
  it('genel eğri kaynaktaki S eğrisidir', () => {
    expect(easing.standard).toBe(designSource.focusDim.easing);
    expect(easing.standard.replace(/\s/g, '')).toBe('cubic-bezier(.65,0,.35,1)');
  });

  it('dropdown süresi ve eğrisi kaynaktaki belgeli istisnadır', () => {
    expect(duration.dropdown).toBe(designSource.dropdown.animation.duration);
    expect(easing.dropdown).toBe(designSource.dropdown.animation.easing);
  });

  it('bütün süreler pozitif ve sonludur', () => {
    for (const [name, value] of Object.entries(duration)) {
      expect(Number.isFinite(value), name).toBe(true);
      expect(value, name).toBeGreaterThan(0);
    }
  });

  it('metin içindeki süreleri ve eğrileri okur', () => {
    expect(parseMs('520 ms cubic-bezier(.65,0,.35,1); ayraç kayar')).toBe(520);
    expect(parseMs('hover (60 ms) + focus')).toBe(60);
    expect(parseEasing('420 ms pop, cubic-bezier(.34,1.56,.64,1)')).toBe('cubic-bezier(.34,1.56,.64,1)');
    expect(() => parseMs('süre yok')).toThrow();
  });

  it('kenar çubuğu süreleri kaynaktan türetilir', () => {
    expect(duration.rail).toBe(520);
    expect(duration.flyout).toBe(180);
    expect(duration.flyoutOpenDelay).toBe(60);
    expect(duration.flyoutCloseDelay).toBe(designSource.sidebar.flyout.closeDelay);
  });
});
