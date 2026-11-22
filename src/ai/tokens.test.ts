import { describe, expect, it } from 'vitest';

import { aiMotion, aiStudioLayout, mascotTokens, motionCssVars } from './tokens';

describe('AI tokenları', () => {
  it('aiMotion sürelerini kaynak dosyadan okur', () => {
    expect(aiMotion.ease).toBe('cubic-bezier(.65,0,.35,1)');
    expect(aiMotion.durations).toEqual({
      spark: 2400,
      brain: 2800,
      owl: 3200,
      agent: 1400,
      scan: 3600,
      badge: 2400,
      ring: 1200,
    });
  });

  it('baykuş yörünge sürelerini ve boyutlarını kaynak dosyadan okur', () => {
    expect(mascotTokens.sizes).toEqual([22, 28, 48]);
    expect(mascotTokens.orbitDurations).toEqual([3200, 2400]);
    expect(mascotTokens.blinkPeriod).toBe(6000);
    expect(mascotTokens.colors.body).toBe('#00aacc');
  });

  it('yerleşim genişliklerini kaynak dosyadan okur', () => {
    expect(aiStudioLayout).toEqual({ left: 260, right: 280 });
  });

  it('CSS değişkenlerini ms biriminde üretir', () => {
    const vars = motionCssVars();
    expect(vars['--ai-dur-owl']).toBe('3200ms');
    expect(vars['--ai-ease']).toBe('cubic-bezier(.65,0,.35,1)');
  });
});
