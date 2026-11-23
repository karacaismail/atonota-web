import { App as AntdApp, ConfigProvider, theme as antdThemeApi } from 'antd';
import trTR from 'antd/locale/tr_TR';
import { useEffect, useMemo, type ReactNode } from 'react';

import { buildAntdTheme } from '@/design/antd-theme';
import { ensureDesignStyles } from '@/design/css-variables';
import { FocusDimOverlay } from '@/engines/focus-dim';
import { startFocusMode } from '@/engines/focus-mode';
import { startHitAreaEngine } from '@/engines/hit-area';

import { ThemeModeProvider, useThemeMode, type ThemeModeChoice } from './theme-mode';
import { usePrefersReducedMotion } from './use-reduced-motion';

/** Gövde zemini ve metin rengi antd tokenlarından gelir; sayfa kökü de temaya uyar. */
function BodyTheme() {
  const { token } = antdThemeApi.useToken();
  useEffect(() => {
    document.body.style.backgroundColor = token.colorBgLayout;
    document.body.style.color = token.colorText;
  }, [token.colorBgLayout, token.colorText]);
  return null;
}

function ThemedProviders({ children }: { children: ReactNode }) {
  const { resolved } = useThemeMode();
  const reducedMotion = usePrefersReducedMotion();
  const theme = useMemo(
    () => buildAntdTheme(resolved, { reducedMotion }),
    [resolved, reducedMotion],
  );

  return (
    <ConfigProvider theme={theme} locale={trTR}>
      <AntdApp>
        <BodyTheme />
        {children}
        <FocusDimOverlay />
      </AntdApp>
    </ConfigProvider>
  );
}

export interface AppProvidersProps {
  children: ReactNode;
  initialThemeChoice?: ThemeModeChoice;
  /** Testlerde motorları kapatmak için. Varsayılan açık. */
  engines?: boolean;
}

/**
 * Uygulama kökü: tasarım CSS'i, tema modu, antd ConfigProvider,
 * odak modu motoru, dokunma alanı motoru ve odak perdesi.
 */
export function AppProviders({ children, initialThemeChoice, engines = true }: AppProvidersProps) {
  useEffect(() => {
    ensureDesignStyles();
  }, []);

  useEffect(() => {
    if (!engines) return;
    const stopFocus = startFocusMode();
    const hit = startHitAreaEngine();
    return () => {
      stopFocus();
      hit.stop();
    };
  }, [engines]);

  return (
    <ThemeModeProvider {...(initialThemeChoice ? { initialChoice: initialThemeChoice } : {})}>
      <ThemedProviders>{children}</ThemedProviders>
    </ThemeModeProvider>
  );
}
