import { List, X } from '@phosphor-icons/react';
import { theme } from 'antd';
import type { CSSProperties, ReactNode } from 'react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { FocusDimProvider } from '../focus-dim';
import { isDarkColor } from '../focus-dim/isDarkColor';
import { t } from '../messages';
import { sampleAgents, sampleNav, sampleWorkspaces } from '../sampleData';
import type { SidebarVariant } from '../sidebar/Sidebar';
import { Sidebar } from '../sidebar/Sidebar';
import { shellCssVars } from '../tokens';
import { useCompactLayout } from './useMedia';

const STORAGE_KEY = 'atonota.shell.sidebar';

function readVariant(): SidebarVariant {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'rail' ? 'rail' : 'solid';
  } catch {
    return 'solid';
  }
}

function writeVariant(v: SidebarVariant) {
  try {
    window.localStorage.setItem(STORAGE_KEY, v);
  } catch {
    // Tarayıcı saklamaya izin vermiyor. Tercih yalnız bu oturumda kalır.
  }
}

/** Kabuk CSS değişkenleri antd tokenlarından ve kaynak dosyadan gelir. */
function useThemeVars(): CSSProperties {
  const { token } = theme.useToken();
  const dark = isDarkColor(token.colorBgLayout);
  return {
    ...shellCssVars(),
    '--shell-bg': token.colorBgLayout,
    '--shell-bg-c': token.colorBgContainer,
    '--shell-bg-el': token.colorBgElevated,
    '--shell-bg-e': token.colorFillQuaternary,
    '--shell-ghost': token.colorFillTertiary,
    '--shell-bd': token.colorBorderSecondary,
    '--shell-tx': token.colorText,
    '--shell-tx2': token.colorTextSecondary,
    '--shell-tx3': token.colorTextTertiary,
    '--shell-pri': token.colorPrimary,
    '--shell-ok': token.colorSuccess,
    '--shell-warn': token.colorWarning,
    '--shell-err': token.colorError,
    '--shell-err-bg': token.colorErrorBg,
    '--shell-mono': token.fontFamilyCode,
    '--shell-shadow': token.boxShadowSecondary,
    '--shell-foot': dark ? 'var(--shell-foot-dark)' : 'var(--shell-foot-light)',
    '--shell-foot-tx': dark ? token.colorText : token.colorBgContainer,
    '--shell-tint': dark ? 'var(--shell-tint-dark)' : 'var(--shell-tint-light)',
    colorScheme: dark ? 'dark' : 'light',
  } as CSSProperties;
}

interface AppShellProps {
  children: ReactNode;
}

/**
 * Uygulama kabuğu. Sidebar her ekranda aynı DOM yerindedir.
 * Telefonda sidebar çekmece olur. Böylece yön değişiminde durum ve odak korunur.
 */
export function AppShell({ children }: AppShellProps) {
  const compact = useCompactLayout();
  const [variant, setVariant] = useState<SidebarVariant>(readVariant);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const menuBtn = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const topRef = useRef<HTMLElement>(null);
  const vars = useThemeVars();
  const isDrawer = compact;
  const modalOpen = isDrawer && drawerOpen;

  const changeVariant = (v: SidebarVariant) => {
    setVariant(v);
    writeVariant(v);
  };

  const returnFocus = useRef(false);

  const closeDrawer = useCallback(() => {
    returnFocus.current = true;
    setDrawerOpen(false);
  }, []);

  // Çekmece açıkken çekmece dışı etkileşime kapanır.
  // Kapanınca odak menü düğmesine döner. Düğme önce etkileşime açılmalıdır.
  useLayoutEffect(() => {
    for (const el of [mainRef.current, topRef.current]) {
      el?.toggleAttribute('inert', modalOpen);
    }
    if (!modalOpen && returnFocus.current) {
      returnFocus.current = false;
      menuBtn.current?.focus();
    }
  }, [modalOpen]);

  // Açılınca odak çekmeceye geçer. Odak zaten içerideyse yerinde kalır.
  useEffect(() => {
    if (!modalOpen) return;
    const d = drawerRef.current;
    if (!d || d.contains(document.activeElement)) return;
    d.querySelector<HTMLElement>('[data-drawer-close]')?.focus();
  }, [modalOpen]);

  useEffect(() => {
    if (!modalOpen) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) closeDrawer();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [modalOpen, closeDrawer]);

  const ws = sampleWorkspaces[0];

  return (
    <FocusDimProvider>
      <div
        className="shell"
        style={vars}
        data-layout={isDrawer ? 'compact' : 'wide'}
        data-variant={variant}
      >
        {isDrawer && (
          <header ref={topRef} className="shell-topbar">
            <button
              ref={menuBtn}
              type="button"
              className="shell-iconbtn"
              aria-label={t.nav.openMenu}
              aria-expanded={drawerOpen}
              aria-controls="shell-drawer"
              onClick={() => setDrawerOpen(true)}
            >
              <List aria-hidden="true" />
            </button>
            <span className="shell-logo" aria-hidden="true">
              A
            </span>
            <span className="shell-topbar-t">{ws?.name}</span>
          </header>
        )}
        {isDrawer && (
          <div
            className="shell-backdrop"
            data-open={drawerOpen ? 'true' : 'false'}
            aria-hidden="true"
            onClick={closeDrawer}
          />
        )}
        <aside
          ref={drawerRef}
          id="shell-drawer"
          className="shell-aside"
          data-open={isDrawer ? (drawerOpen ? 'true' : 'false') : undefined}
          {...(isDrawer
            ? { role: 'dialog', 'aria-modal': drawerOpen, 'aria-label': t.nav.drawer }
            : {})}
        >
          {isDrawer && (
            <button
              type="button"
              className="shell-iconbtn shell-drawer-close"
              data-drawer-close=""
              aria-label={t.nav.closeMenu}
              onClick={closeDrawer}
            >
              <X aria-hidden="true" />
            </button>
          )}
          <Sidebar
            variant={variant}
            onVariantChange={changeVariant}
            nav={sampleNav}
            agents={sampleAgents}
            compact={isDrawer}
            onNavigate={isDrawer ? closeDrawer : undefined}
          />
        </aside>
        <main ref={mainRef} className="shell-main" id="main">
          {children}
        </main>
      </div>
    </FocusDimProvider>
  );
}
