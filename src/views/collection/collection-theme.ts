import { theme } from 'antd';
import type { ThemeConfig } from 'antd';
import type { CSSProperties } from 'react';
import source from '../../../design/source/control-size-config.json';

/** Temporary scoped adapter until foundation exports the shared theme and engines. */
export function collectionTheme(mode: 'dark' | 'light', reducedMotion = false): ThemeConfig {
  const base = source.derived.antdTheme;
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
      fontFamily: 'Outfit Variable, Outfit, sans-serif',
      motionEaseInOut: 'cubic-bezier(.65, 0, .35, 1)',
      motionEaseOut: 'cubic-bezier(.65, 0, .35, 1)',
      motionDurationFast: '0.2s',
      motionDurationMid: '0.2s',
      motionDurationSlow: '0.2s',
    },
    components:
      mode === 'dark'
        ? base.components
        : {
            Button: {
              controlHeight: source.sizes.md.button.height,
              contentFontSize: source.sizes.md.button.fontSize,
            },
            Input: { inputFontSize: source.sizes.md.input.fontSize, activeShadow: 'none' },
            Select: {
              fontSize: source.sizes.md.input.fontSize,
              optionFontSize: source.sizes.md.input.fontSize,
            },
          },
  };
}
export function collectionVariables(
  token: ReturnType<typeof theme.useToken>['token'],
  mode: 'dark' | 'light',
): CSSProperties {
  return {
    '--collection-bg': token.colorBgLayout,
    '--collection-surface': token.colorBgContainer,
    '--collection-elevated': token.colorBgElevated,
    '--collection-text': token.colorText,
    '--collection-muted': token.colorTextSecondary,
    '--collection-primary': source.primary.color,
    '--collection-focus': mode === 'light' ? source.primary.light.text : source.primary.color,
    '--collection-badge-text': mode === 'light' ? source.primary.light.text : source.primary.color,
    '--collection-badge-bg': mode === 'light' ? source.primary.color : token.colorBgContainer,
    '--collection-selected': token.colorPrimaryBg,
    '--collection-border': token.colorBorderSecondary,
    '--collection-gap': source.cards.padding / 2 + 'px',
    '--collection-padding': source.cards.padding + 'px',
    '--collection-radius': source.radius.default + 'px',
    '--collection-font': source.typography.default + 'px',
    '--collection-title': source.header.settings.titleSize + 'px',
    '--collection-line': source.typography.default + 8 + 'px',
    '--collection-control': source.sizes.md.button.height + 'px',
    '--collection-column': source.sizes.md.input.height * 4 + 'px',
    '--collection-number': source.sizes.md.input.height * 3 + 'px',
    '--collection-lane': source.sizes.md.input.height * 6 + 'px',
    '--collection-timeline': source.sizes.md.input.height * 12 + 'px',
    '--collection-mark': source.typography.default / 7 + 'px',
    '--collection-duration': '200ms',
    '--collection-ease': 'cubic-bezier(.65, 0, .35, 1)',
    '--collection-dropdown-duration': source.dropdown.animation.duration + 'ms',
    '--collection-dropdown-ease': source.dropdown.animation.easing,
    '--collection-shadow': (mode === 'dark'
      ? source.derived.shadowCssDark
      : source.derived.shadowCss
    ).dropdown,
  } as CSSProperties;
}
export const collectionViewOptions = source.header.viewTypes
  .filter((view) => view.value !== 'form')
  .map(({ value, label }) => ({ value, label }));
