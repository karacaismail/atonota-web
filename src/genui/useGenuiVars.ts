import { theme } from 'antd';
import type { CSSProperties } from 'react';
import { useMemo } from 'react';

import { aiCssVars } from '@/ai/tokens';

/**
 * AI alanının CSS değişkenleri.
 *
 * Ortak değerler kopyalanmaz. Stiller onları doğrudan foundation
 * değişkenlerinden okur: `--font-ui`, `--font-code`, `--font-default`,
 * `--font-min`, `--radius`, `--card-radius`, `--color-primary`, `--btn-h-sm`,
 * `--motion-easing-standard` ve `--motion-duration-focus-dim`.
 *
 * Renkler ve boşluklar çalışan antd temasından okunur. Temayı foundation kurar.
 */
export function useGenuiVars(): CSSProperties {
  const { token } = theme.useToken();
  return useMemo(
    () =>
      ({
        ...aiCssVars(),
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
        '--ai-shadow-card': token.boxShadowTertiary,
        '--ai-font-lg': `${token.fontSizeLG}px`,
        '--ai-font-xl': `${token.fontSizeXL}px`,
        '--ai-gap-xs': `${token.paddingXXS}px`,
        '--ai-gap-sm': `${token.paddingXS}px`,
        '--ai-gap': `${token.paddingSM}px`,
        '--ai-gap-md': `${token.padding}px`,
        '--ai-gap-lg': `${token.paddingLG}px`,
      }) as CSSProperties,
    [token],
  );
}
