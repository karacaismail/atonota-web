/**
 * antd temasını kaynak kararlardan üretir. Açık ve koyu tema aynı tokenlardan çıkar.
 * Başlangıç noktası kaynaktaki `derived.antdTheme` nesnesidir; test bununla karşılaştırır.
 */
import { theme as antdTheme, type ThemeConfig } from 'antd';

import { duration, easing, seconds } from './motion';
import { designSource, type ThemeMode } from './source';
import {
  border,
  darkPalette,
  fontFamily,
  fontWeight,
  link,
  placeholder,
  primary,
  radius,
  shadowsFor,
  sizes,
  typography,
} from './tokens';

export interface BuildThemeOptions {
  /** `prefers-reduced-motion: reduce` açıkken antd hareketi kapanır. */
  reducedMotion?: boolean;
}

const derivedButton = designSource.derived.antdTheme.components.Button;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function buildAntdTheme(mode: ThemeMode, options: BuildThemeOptions = {}): ThemeConfig {
  const dark = mode === 'dark';
  const shadow = shadowsFor(mode);
  const { button, input } = sizes;

  const token: NonNullable<ThemeConfig['token']> = {
    colorPrimary: primary.color,
    colorPrimaryHover: primary.hover,
    colorPrimaryActive: primary.active,
    colorLink: link[mode].color,
    colorLinkHover: link[mode].hover,
    colorLinkActive: link[mode].active,
    colorInfo: primary.color,
    colorTextPlaceholder: placeholder[mode],
    fontFamily: fontFamily.ui,
    fontFamilyCode: fontFamily.code,
    fontSize: typography.default,
    fontSizeSM: typography.min,
    fontSizeLG: input.lg.fontSize,
    lineHeight: typography.lineHeightRatioFor(typography.default),
    lineHeightSM: typography.lineHeightRatioFor(typography.min),
    lineHeightLG: typography.lineHeightRatioFor(input.lg.fontSize),
    fontWeightStrong: fontWeight.strong,
    controlHeight: button.md.height,
    controlHeightSM: button.sm.height,
    controlHeightLG: button.lg.height,
    borderRadius: radius.control,
    borderRadiusSM: Math.max(radius.control - 1, 2),
    borderRadiusLG: radius.control + 2,
    boxShadowSecondary: shadow.dropdown,
    lineWidth: border.width,
    // Odak: çevreleyen halka ve çerçeve yasak. Gösterge CSS'te alt çizgi olarak verilir.
    lineWidthFocus: 0,
    controlOutlineWidth: 0,
    controlOutline: 'transparent',
    // Hareket: bütün eğriler merkezi tokendan gelir.
    motion: !options.reducedMotion,
    motionDurationFast: seconds(duration.fast),
    motionDurationMid: seconds(duration.mid),
    motionDurationSlow: seconds(duration.slow),
    motionEaseInOut: easing.standard,
    motionEaseInOutCirc: easing.standard,
    motionEaseOut: easing.standard,
    motionEaseOutCirc: easing.standard,
    motionEaseOutBack: easing.standard,
    motionEaseInBack: easing.standard,
    motionEaseInQuint: easing.standard,
    motionEaseOutQuint: easing.standard,
  };

  if (dark) {
    Object.assign(token, {
      colorBgLayout: darkPalette.layout,
      colorBgContainer: darkPalette.panel,
      colorBgElevated: darkPalette.elevated,
      colorBorder: darkPalette.border,
      colorBorderSecondary: darkPalette.borderSecondary,
      colorSplit: darkPalette.borderSecondary,
    });
  }

  const components: NonNullable<ThemeConfig['components']> = {
    Button: {
      controlHeight: button.md.height,
      controlHeightSM: button.sm.height,
      controlHeightLG: button.lg.height,
      contentFontSize: button.md.fontSize,
      contentFontSizeSM: button.sm.fontSize,
      contentFontSizeLG: button.lg.fontSize,
      contentLineHeight: round2(button.md.lineBox / button.md.fontSize),
      contentLineHeightSM: round2(button.sm.lineBox / button.sm.fontSize),
      contentLineHeightLG: round2(button.lg.lineBox / button.lg.fontSize),
      fontWeight: fontWeight.md,
      primaryShadow: shadow.button,
      defaultShadow: shadow.button,
      dangerShadow: shadow.button,
      primaryColor: dark ? primary.dark.text : primary.light.text,
      ...(dark
        ? {
            defaultBg: darkPalette.button,
            defaultHoverBg: darkPalette.buttonHover,
            defaultActiveBg: darkPalette.buttonHover,
            defaultBorderColor: darkPalette.buttonBorder,
            defaultHoverBorderColor: darkPalette.buttonBorder,
            defaultActiveBorderColor: darkPalette.buttonBorder,
            defaultColor: derivedButton.defaultColor,
            defaultHoverColor: derivedButton.defaultHoverColor,
          }
        : {}),
    },
    Input: {
      controlHeight: input.md.height,
      controlHeightSM: input.sm.height,
      controlHeightLG: input.lg.height,
      inputFontSize: input.md.fontSize,
      inputFontSizeSM: input.sm.fontSize,
      inputFontSizeLG: input.lg.fontSize,
      paddingBlock: input.md.paddingBlock,
      paddingBlockSM: input.sm.paddingBlock,
      paddingBlockLG: input.lg.paddingBlock,
      ...(dark ? { colorBgContainer: darkPalette.input, activeBg: darkPalette.input, hoverBg: darkPalette.input } : {}),
    },
    InputNumber: dark
      ? { colorBgContainer: darkPalette.input, activeBg: darkPalette.input, hoverBg: darkPalette.input }
      : {},
    Select: {
      controlHeight: input.md.height,
      controlHeightSM: input.sm.height,
      controlHeightLG: input.lg.height,
      fontSize: input.md.fontSize,
      fontSizeLG: input.lg.fontSize,
      optionFontSize: input.md.fontSize,
      ...(dark ? { selectorBg: darkPalette.input, colorBgContainer: darkPalette.input } : {}),
    },
    Dropdown: { fontSize: typography.default },
    Card: { borderRadiusLG: radius.card },
  };

  return {
    cssVar: { key: 'atonota' },
    hashed: false,
    algorithm: dark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token,
    components,
  };
}
