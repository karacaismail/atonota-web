import { theme } from 'antd';
import type { ThemeConfig } from 'antd';
import source from '../../../../design/source/control-size-config.json';

/** Preview only. Delete after foundation exports buildAntdTheme and ensureDesignStyles.
 * Production CollectionView inherits the application's shared ConfigProvider. */
export function collectionTheme(mode: 'dark' | 'light', reducedMotion = false): ThemeConfig {
  const base = source.derived.antdTheme;
  const components: NonNullable<ThemeConfig['components']> = mode === 'dark' ? base.components : {};
  const border = mode === 'dark' ? base.token.colorBorder : theme.getDesignToken().colorBorder;
  return {
    algorithm: mode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      ...Object.fromEntries(
        Object.entries(base.token).filter(
          ([name]) =>
            mode === 'dark' ||
            ![
              'colorBgLayout',
              'colorBgContainer',
              'colorBgElevated',
              'colorBorder',
              'colorBorderSecondary',
              'colorSplit',
            ].includes(name),
        ),
      ),
      motion: !reducedMotion,
      // Same public tokens as foundation's buildAntdTheme. The shared underline
      // remains visible; no private checkbox selector is required.
      lineWidthFocus: 0,
      controlOutlineWidth: 0,
      fontFamily: 'Outfit Variable, Outfit, sans-serif',
      motionEaseInOut: 'cubic-bezier(.65, 0, .35, 1)',
      motionEaseOut: 'cubic-bezier(.65, 0, .35, 1)',
      motionDurationFast: '0.2s',
      motionDurationMid: '0.2s',
      motionDurationSlow: '0.2s',
    },
    components: {
      ...components,
      Button: {
        ...components.Button,
        controlHeight: source.sizes.md.button.height,
        contentFontSize: source.sizes.md.button.fontSize,
      },
      Input: {
        ...components.Input,
        inputFontSize: source.sizes.md.input.fontSize,
        activeShadow: 'none',
        activeBorderColor: border,
      },
      Select: {
        ...components.Select,
        fontSize: source.sizes.md.input.fontSize,
        optionFontSize: source.sizes.md.input.fontSize,
        optionHeight: source.sizes.md.input.height,
        ...(source.dropdown.joinedItems.value ? { borderRadiusSM: 0 } : {}),
        activeOutlineColor: 'transparent',
        activeBorderColor: border,
      },
    },
  };
}
