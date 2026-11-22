import { describe, expect, it } from 'vitest';

import { aiCssVars, aiMotion, aiSizes, aiStudioLayout, mascotTokens } from './tokens';

describe('AI tokenları', () => {
  it('aiMotion sürelerini kaynak dosyadan okur', () => {
    expect(aiMotion.durations).toEqual({
      spark: 2400,
      brain: 2800,
      owl: 3200,
      agent: 1400,
      scan: 3600,
      badge: 2400,
      ring: 1200,
    });
    expect(aiMotion.hoverLift).toBe(2);
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

  it('ölçüleri tek yerden CSS değişkeni olarak verir', () => {
    const vars = aiCssVars();
    expect(vars['--ai-dur-owl']).toBe('3200ms');
    expect(vars['--ai-welcome-max']).toBe(`${aiSizes.welcomeMaxWidth}px`);
    expect(vars['--ai-chart-h']).toBe(`${aiSizes.chartHeight}px`);
    expect(vars['--ai-caret-w']).toBe(`${aiSizes.caretWidth}px`);
    expect(vars['--ai-hover-lift']).toBe('-2px');
  });

  it('foundation tokenlarının kopyasını üretmez', () => {
    const names = Object.keys(aiCssVars());
    for (const copy of [
      '--ai-ease',
      '--ai-radius',
      '--ai-radius-card',
      '--ai-primary',
      '--ai-font',
    ]) {
      expect(names).not.toContain(copy);
    }
  });
});
