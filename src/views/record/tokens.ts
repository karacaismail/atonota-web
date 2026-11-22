import controlSizeConfig from '@design-source/control-size-config.json';
import { theme as antdTheme, type ThemeConfig } from 'antd';
import type { CSSProperties } from 'react';

export type RecordThemeMode = 'light' | 'dark';

const LIGHT_SHADOWS = controlSizeConfig.derived.shadowCss;
const DARK_SHADOWS = controlSizeConfig.derived.shadowCssDark;

/**
 * Derives Ant Design ConfigProvider tokens directly from design/source/control-size-config.json (AD-1).
 * Surrounding focus rings are disabled per AGENTS.md focus rule.
 */
export function buildRecordAntdTheme(mode: RecordThemeMode): ThemeConfig {
  const isDark = mode === 'dark';
  const primary = controlSizeConfig.primary;
  const darkPalette = controlSizeConfig.darkPalette;
  const sizes = controlSizeConfig.sizes;
  const radius = controlSizeConfig.radius.default;

  return {
    algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      colorPrimary: primary.color,
      colorPrimaryHover: primary.hover,
      colorPrimaryActive: primary.active,
      colorLink: primary.color,
      colorLinkHover: primary.hover,
      colorLinkActive: primary.active,
      colorInfo: primary.color,
      fontFamily: "'Outfit Variable', 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif",
      fontFamilyCode: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
      fontSize: controlSizeConfig.typography.default,
      fontSizeSM: controlSizeConfig.typography.min,
      fontSizeLG: sizes.lg.input.fontSize,
      controlHeight: sizes.md.input.height,
      controlHeightSM: sizes.sm.input.height,
      controlHeightLG: sizes.lg.input.height,
      borderRadius: radius,
      controlOutline: 'transparent',
      controlOutlineWidth: 0,
      ...(isDark
        ? {
            colorBgLayout: darkPalette.layout,
            colorBgContainer: darkPalette.panel,
            colorBgElevated: darkPalette.elevated,
            colorBorder: darkPalette.border,
            colorBorderSecondary: darkPalette.borderSecondary,
            colorSplit: darkPalette.borderSecondary,
          }
        : {}),
    },
    components: {
      Button: {
        controlHeight: sizes.md.button.height,
        controlHeightSM: sizes.sm.button.height,
        controlHeightLG: sizes.lg.button.height,
        contentFontSize: sizes.md.button.fontSize,
        contentFontSizeSM: sizes.sm.button.fontSize,
        contentFontSizeLG: sizes.lg.button.fontSize,
        fontWeight: controlSizeConfig.fontWeight.md,
        primaryShadow: isDark ? DARK_SHADOWS.button : LIGHT_SHADOWS.button,
        defaultShadow: isDark ? DARK_SHADOWS.button : LIGHT_SHADOWS.button,
        dangerShadow: isDark ? DARK_SHADOWS.button : LIGHT_SHADOWS.button,
        ...(isDark
          ? {
              defaultBg: darkPalette.button,
              defaultHoverBg: darkPalette.buttonHover,
              defaultActiveBg: darkPalette.buttonHover,
              defaultBorderColor: darkPalette.buttonBorder,
              defaultHoverBorderColor: darkPalette.buttonBorder,
              defaultActiveBorderColor: darkPalette.buttonBorder,
            }
          : {}),
      },
      Input: {
        controlHeight: sizes.md.input.height,
        controlHeightSM: sizes.sm.input.height,
        controlHeightLG: sizes.lg.input.height,
        inputFontSize: sizes.md.input.fontSize,
        inputFontSizeSM: sizes.sm.input.fontSize,
        inputFontSizeLG: sizes.lg.input.fontSize,
        ...(isDark
          ? {
              colorBgContainer: darkPalette.input,
              activeBg: darkPalette.input,
              hoverBg: darkPalette.input,
            }
          : {}),
      },
      InputNumber: {
        controlHeight: sizes.md.input.height,
        controlHeightSM: sizes.sm.input.height,
        controlHeightLG: sizes.lg.input.height,
        inputFontSize: sizes.md.input.fontSize,
        ...(isDark
          ? {
              colorBgContainer: darkPalette.input,
              activeBg: darkPalette.input,
              hoverBg: darkPalette.input,
            }
          : {}),
      },
      Select: {
        controlHeight: sizes.md.input.height,
        controlHeightSM: sizes.sm.input.height,
        controlHeightLG: sizes.lg.input.height,
        fontSize: sizes.md.input.fontSize,
        fontSizeLG: sizes.lg.input.fontSize,
        optionFontSize: controlSizeConfig.typography.default,
        ...(isDark
          ? {
              selectorBg: darkPalette.input,
              colorBgContainer: darkPalette.input,
            }
          : {}),
      },
      Tabs: {
        titleFontSize: controlSizeConfig.choice.tabs.fontSize,
        horizontalItemGutter: controlSizeConfig.choice.tabs.gap,
      },
      Card: {
        borderRadiusLG: controlSizeConfig.cards.radius,
      },
    },
  };
}

/**
 * Generates CSS custom properties from design/source/control-size-config.json and antd tokens (ST-2).
 * Components and stylesheets reference only these variables.
 */
export function buildRecordCssVariables(mode: RecordThemeMode): CSSProperties {
  const isDark = mode === 'dark';
  const themeConfig = buildRecordAntdTheme(mode);
  const resolved = antdTheme.getDesignToken(themeConfig);
  const sizes = controlSizeConfig.sizes;
  const typo = controlSizeConfig.typography;
  const primary = controlSizeConfig.primary;
  const darkPalette = controlSizeConfig.darkPalette;
  const shadows = isDark ? DARK_SHADOWS : LIGHT_SHADOWS;
  const headerCfg = controlSizeConfig.header.settings;

  const vars: Record<string, string> = {
    '--rv-color-primary': primary.color,
    '--rv-color-primary-hover': primary.hover,
    '--rv-color-primary-active': primary.active,
    '--rv-color-bg': resolved.colorBgLayout,
    '--rv-color-panel': resolved.colorBgContainer,
    '--rv-color-elevated': resolved.colorBgElevated,
    '--rv-color-input': isDark ? darkPalette.input : resolved.colorBgContainer,
    '--rv-color-border': resolved.colorBorder,
    '--rv-color-border-secondary': resolved.colorBorderSecondary,
    '--rv-color-text': resolved.colorText,
    '--rv-color-text-secondary': resolved.colorTextSecondary,
    '--rv-color-danger': resolved.colorError,
    '--rv-color-danger-bg': resolved.colorErrorBg,
    '--rv-color-warning': resolved.colorWarning,
    '--rv-color-warning-bg': resolved.colorWarningBg,
    '--rv-color-dirty-dot': resolved.colorWarning,
    '--rv-font-min': `${typo.min}px`,
    '--rv-font-min-lh': `${typo.min + 8}px`,
    '--rv-font-body': `${typo.default}px`,
    '--rv-font-body-lh': `${typo.default + 8}px`,
    '--rv-font-control-md': `${sizes.md.input.fontSize}px`,
    '--rv-font-control-md-lh': `${sizes.md.input.fontSize + 8}px`,
    '--rv-font-title': `${headerCfg.titleSize}px`,
    '--rv-font-title-lh': `${headerCfg.titleLineHeight}px`,
    '--rv-font-title-mobile': `${sizes.lg.button.fontSize + 2}px`,
    '--rv-font-title-mobile-lh': `${sizes.lg.button.fontSize + 10}px`,
    '--rv-font-weight-sm': String(controlSizeConfig.fontWeight.sm),
    '--rv-font-weight-md': String(controlSizeConfig.fontWeight.md),
    '--rv-font-weight-lg': String(controlSizeConfig.fontWeight.lg),
    '--rv-font-mono': resolved.fontFamilyCode,
    '--rv-control-h-sm': `${sizes.sm.input.height}px`,
    '--rv-control-h-md': `${sizes.md.input.height}px`,
    '--rv-control-h-lg': `${sizes.lg.input.height}px`,
    '--rv-checkbox-h': `${controlSizeConfig.choice.checkbox.height}px`,
    '--rv-tag-h': `${controlSizeConfig.choice.tag.height}px`,
    '--rv-radius': `${controlSizeConfig.radius.default}px`,
    '--rv-card-radius': `${controlSizeConfig.cards.radius}px`,
    '--rv-space-2xs': `${resolved.paddingXXS}px`,
    '--rv-space-xs': `${resolved.paddingXS}px`,
    '--rv-space-sm': `${resolved.paddingXS}px`,
    '--rv-space-md': `${resolved.paddingSM}px`,
    '--rv-space-lg': `${resolved.padding}px`,
    '--rv-space-xl': `${controlSizeConfig.cards.padding}px`,
    '--rv-shadow-card': shadows.card,
    '--rv-shadow-button': shadows.button,
    '--rv-shadow-input': shadows.input,
    '--rv-shadow-header': resolved.boxShadowSecondary,
    '--rv-motion-duration': `${controlSizeConfig.focusDim.duration}ms`,
    '--rv-motion-easing': controlSizeConfig.focusDim.easing,
    '--rv-focus-line-size': `${resolved.lineWidthBold}px`,
  };

  return vars as CSSProperties;
}
