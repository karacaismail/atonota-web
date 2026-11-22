import { theme } from 'antd';
import type { CSSProperties } from 'react';
import { useMemo } from 'react';

import { aiCard, motionCssVars } from '@/ai/tokens';

/**
 * antd tema tokenlarını ve AI hareket tokenlarını CSS değişkeni yapar.
 * GenUI ve AI Studio stilleri yalnız bu değişkenleri kullanır.
 */
export function useGenuiVars(): CSSProperties {
  const { token } = theme.useToken();
  return useMemo(
    () =>
      ({
        ...motionCssVars(),
        '--ai-primary': token.colorPrimary,
        '--ai-primary-bg': token.colorPrimaryBg,
        '--ai-primary-bg-hover': token.colorPrimaryBgHover,
        '--ai-text': token.colorText,
        '--ai-text-2': token.colorTextSecondary,
        '--ai-text-3': token.colorTextTertiary,
        '--ai-bg': token.colorBgLayout,
        '--ai-bg-c': token.colorBgContainer,
        '--ai-bg-e': token.colorBgElevated,
        '--ai-fill': token.colorFillSecondary,
        '--ai-border': token.colorBorderSecondary,
        '--ai-success': token.colorSuccess,
        '--ai-success-bg': token.colorSuccessBg,
        '--ai-error': token.colorError,
        '--ai-warning': token.colorWarning,
        '--ai-warning-bg': token.colorWarningBg,
        '--ai-warning-border': token.colorWarningBorder,
        '--ai-radius': `${token.borderRadius}px`,
        '--ai-radius-card': `${aiCard.radius}px`,
        '--ai-shadow-card': token.boxShadowTertiary,
        '--ai-font-sm': `${token.fontSizeSM}px`,
        '--ai-font': `${token.fontSize}px`,
        '--ai-font-lg': `${token.fontSizeLG}px`,
        '--ai-font-xl': `${token.fontSizeXL}px`,
        '--ai-line': `${token.fontSize + 8}px`,
        '--ai-font-family': token.fontFamily,
        '--ai-mono': token.fontFamilyCode,
        '--ai-gap-xs': `${token.paddingXXS}px`,
        '--ai-gap-sm': `${token.paddingXS}px`,
        '--ai-gap': `${token.paddingSM}px`,
        '--ai-gap-md': `${token.padding}px`,
        '--ai-gap-lg': `${token.paddingLG}px`,
        '--ai-control-sm': `${token.controlHeightSM}px`,
      }) as CSSProperties,
    [token],
  );
}
