import { theme as antdThemeApi } from 'antd';
import { describe, expect, it } from 'vitest';

import { buildAntdTheme } from './antd-theme';
import { blendOver, contrastRatio } from './color';
import { designSource } from './source';
import { primary } from './tokens';

const derived = designSource.derived.antdTheme;

describe('buildAntdTheme', () => {
  it('kontrol yükseklikleri kaynak dosyayla aynıdır', () => {
    const { token } = buildAntdTheme('light');
    expect(token?.controlHeight).toBe(designSource.sizes.md.button.height);
    expect(token?.controlHeightSM).toBe(designSource.sizes.sm.button.height);
    expect(token?.controlHeightLG).toBe(designSource.sizes.lg.button.height);
    expect(token?.controlHeight).toBe(derived.token.controlHeight);
  });

  it('koyu tema kaynaktaki derived.antdTheme tokenlarıyla örtüşür', () => {
    const { token } = buildAntdTheme('dark');
    for (const [key, value] of Object.entries(derived.token)) {
      expect(token?.[key as keyof typeof token], key).toBe(value);
    }
  });

  it('koyu tema bileşen tokenları kaynakla örtüşür', () => {
    const { components } = buildAntdTheme('dark');
    for (const [name, tokens] of Object.entries(derived.components)) {
      const built = components?.[name as keyof typeof components] as Record<string, unknown> | undefined;
      for (const [key, value] of Object.entries(tokens)) {
        expect(built?.[key], `${name}.${key}`).toBe(value);
      }
    }
  });

  it('açık tema bağlantı rengi beyaz üzerinde en az 4.5:1 kontrast verir', () => {
    const { token } = buildAntdTheme('light');
    const layout = antdThemeApi.getDesignToken().colorBgLayout;
    expect(contrastRatio(String(token?.colorLink), layout)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(String(token?.colorLink), '#ffffff')).toBeGreaterThanOrEqual(4.5);
    expect(buildAntdTheme('dark').token?.colorLink).toBe(designSource.primary.color);
  });

  it('koyu birincil buton metni AA kontrastını verir; zemin %14 ve hover %100 kaynakla aynı kalır', () => {
    const { textOpacity } = primary.dark;
    expect(textOpacity).toBeGreaterThanOrEqual(designSource.primary.dark.opacity);
    expect(textOpacity).toBe(0.95);
    for (const surface of [designSource.darkPalette.layout, designSource.darkPalette.panel]) {
      const bg = blendOver(designSource.primary.color, designSource.primary.dark.background, surface);
      expect(contrastRatio(blendOver(designSource.primary.dark.text, textOpacity, bg), bg)).toBeGreaterThanOrEqual(4.5);
    }
    expect(primary.dark.background).toBe('rgba(0,170,204,0.14)');
    expect(primary.dark.backgroundHover).toBe('rgba(0,170,204,0.22)');
    expect(primary.dark.textHover).toBe('rgba(0,170,204,1)');
    expect(buildAntdTheme('dark').components?.Button?.primaryColor).toBe(primary.dark.text);
  });

  it('yer tutucu rengi her iki temada en az 4.5:1 verir', () => {
    const lightBg = antdThemeApi.getDesignToken().colorBgContainer;
    const light = String(buildAntdTheme('light').token?.colorTextPlaceholder);
    const dark = String(buildAntdTheme('dark').token?.colorTextPlaceholder);
    const alpha = (rgba: string) => Number(rgba.match(/[\d.]+/g)?.[3] ?? 1);
    expect(contrastRatio(blendOver('#000000', alpha(light), lightBg), lightBg)).toBeGreaterThanOrEqual(4.5);
    expect(
      contrastRatio(blendOver('#ffffff', alpha(dark), designSource.darkPalette.input), designSource.darkPalette.input),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it('açık tema koyu paleti taşımaz', () => {
    const { token, components } = buildAntdTheme('light');
    expect(token?.colorBgLayout).toBeUndefined();
    expect(token?.colorBgContainer).toBeUndefined();
    expect((components?.Input as Record<string, unknown>)?.['colorBgContainer']).toBeUndefined();
  });

  it('yazı tipi Outfit ile başlar ve kod için JetBrains Mono kullanır', () => {
    const { token } = buildAntdTheme('light');
    expect(token?.fontFamily?.startsWith("'Outfit Variable'")).toBe(true);
    expect(token?.fontFamilyCode).toContain('JetBrains Mono');
  });

  it('çevreleyen odak çerçevesini kapatır', () => {
    const { token } = buildAntdTheme('light');
    expect(token?.lineWidthFocus).toBe(0);
    expect(token?.controlOutlineWidth).toBe(0);
  });

  it('hareket eğrileri merkezi tokendan gelir ve reduced motion ile kapanır', () => {
    const normal = buildAntdTheme('light');
    expect(normal.token?.motion).toBe(true);
    expect(normal.token?.motionEaseInOut).toBe(designSource.focusDim.easing);
    const reduced = buildAntdTheme('light', { reducedMotion: true });
    expect(reduced.token?.motion).toBe(false);
  });

  it('satır kutusu = metin + 8 kuralını oran olarak verir', () => {
    const { token } = buildAntdTheme('light');
    expect(token?.lineHeight).toBeCloseTo(22 / 14, 6);
    expect(token?.lineHeightLG).toBeCloseTo(26 / 18, 6);
  });
});
