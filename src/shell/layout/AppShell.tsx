import { List, WarningCircle, X } from '@phosphor-icons/react';
import { theme } from 'antd';
import type { CSSProperties, ReactNode } from 'react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { isDemoEnabled, isDemoPath } from '@/app/demo-mode';
import { RESELLER_LINK_DOCTYPE } from '@/modules';

import { type ShellAccess, ShellAccessContext } from '../access';
import { FocusDimProvider } from '../focus-dim';
import { isDarkColor } from '../focus-dim/isDarkColor';
import { WorkspaceIdentity } from '../header/WorkspaceIdentity';
import { t } from '../messages';
import type { QuickAction } from '../nav';
import {
  buildShellNav,
  navFromSidebars,
  permittedNav,
  quickActionsFrom,
  requiredDocTypes,
  routeNav,
} from '../nav';
import type { NavEntry, NavGroup } from '../sampleData';
import {
  sampleAgents,
  sampleCredit,
  sampleNav,
  samplePrompts,
  sampleWorkspaces,
} from '../sampleData';
import type { SidebarVariant } from '../sidebar/Sidebar';
import { Sidebar } from '../sidebar/Sidebar';
import type { CommandMode } from '../sidebar/CommandBox';
import { shellCssVars } from '../tokens';
import type { AccountKind, ShellCredit, ShellWorkspaceData } from '../view-data';
import { useViewData } from '../view-data';
import { workspaceText } from '../workspaceMessages';
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
    '--shell-test-bg': token.colorWarningBg,
    '--shell-live-bg': token.colorSuccessBg,
    '--shell-mono': token.fontFamilyCode,
    '--shell-shadow': token.boxShadowSecondary,
    '--shell-foot': dark ? 'var(--shell-foot-dark)' : 'var(--shell-foot-light)',
    '--shell-foot-tx': dark ? token.colorText : token.colorBgContainer,
    '--shell-tint': dark ? 'var(--shell-tint-dark)' : 'var(--shell-tint-light)',
    colorScheme: dark ? 'dark' : 'light',
  } as CSSProperties;
}

/** Deneme sayfaları yalnız e2e derlemesinde vardır. Koşul derleme zamanında sabittir. */
const DEMO_ENABLED = isDemoEnabled(import.meta.env.MODE);

/**
 * Menü verisi. Canlı menü rota kaydından ve sunucunun sidebar verisinden gelir.
 * Örnek gruplar ve örnek ajanlar yalnız deneme sayfasında (`/_demo/...`) görünür.
 * Ajan listesi için sunucuda veri yoktur; canlı menüde ajan bölümü gizlidir.
 */
function useShellNav(): {
  access: ShellAccess;
  accountKindFailed: boolean;
  nav: NavEntry[];
  agents: typeof sampleAgents;
  quickActions: QuickAction[];
  demo: boolean;
} {
  const navigation = useViewData()?.navigation;
  const { pathname } = useLocation();
  const demo = DEMO_ENABLED && isDemoPath(pathname);
  const [groups, setGroups] = useState<NavGroup[]>([]);
  // Sunucunun okumaya izin verdiği DocType adları (G-94). Yanıt gelene kadar küme boştur.
  // Boş kümede yetki isteyen sayfa menüde görünmez.
  const [probed, setProbed] = useState<ReadonlySet<string>>(() => new Set());
  // Sayfa kapısı yanıtı bekler. Yanıtın hangi bağlantıdan geldiği saklanır.
  // Bağlantı ya da yetki ucu yoksa kapı beklemez ve boş kümeyle karar verir.
  const [probedFrom, setProbedFrom] = useState<unknown>(null);
  // Bayi hesabı mı (AJA-945)? Karar müşteri listesi ucundan gelir. Yanıtın kaynağı da saklanır.
  // Uç başka hata verirse hesap bayi sayılmaz. Kabuk bunun yerine hata notu gösterir.
  const [accountKind, setAccountKind] = useState<{
    from: unknown;
    kind: AccountKind | 'failed';
  } | null>(null);
  useEffect(() => {
    if (!navigation) return undefined;
    const ctrl = new AbortController();
    void navigation.loadSidebars(ctrl.signal).then((sidebars) => {
      if (!ctrl.signal.aborted) setGroups(navFromSidebars(sidebars));
    });
    navigation.loadReadable?.(requiredDocTypes, ctrl.signal).then(
      (readable) => {
        if (ctrl.signal.aborted) return;
        setProbed(readable);
        setProbedFrom(navigation);
      },
      // Yetki bilgisi gelmezse küme boş kalır. Menü yetki isteyen sayfayı göstermez.
      () => {
        if (!ctrl.signal.aborted) setProbedFrom(navigation);
      },
    );
    navigation.loadAccountKind?.(ctrl.signal).then(
      (kind) => {
        if (!ctrl.signal.aborted) setAccountKind({ from: navigation, kind });
      },
      () => {
        if (!ctrl.signal.aborted) setAccountKind({ from: navigation, kind: 'failed' });
      },
    );
    return () => ctrl.abort();
  }, [navigation]);
  const kind = navigation && accountKind?.from === navigation ? accountKind.kind : null;
  // Sunucunun sidebar grupları Frappe'nin izin süzgecinden geçmiştir (`resolve_sidebar`).
  // Gruptaki DocType'lar bu yüzden okunabilir sayılır. Modül sayfaları tanım ucuyla denenir.
  // Bayi hesabında bağ türü okunabilir sayılır. Menü ve sayfa kapısı bu adı tek kuralla kullanır.
  const readable = useMemo(
    () =>
      new Set([
        ...probed,
        ...groups.flatMap((g) => g.children.flatMap((c) => c.requires ?? [])),
        ...(kind === 'reseller' ? [RESELLER_LINK_DOCTYPE] : []),
      ]),
    [probed, groups, kind],
  );
  const permittedGroups = useMemo(
    () => permittedNav(groups, readable).filter((e): e is NavGroup => e.kind === 'group'),
    [groups, readable],
  );
  const nav = useMemo(
    () => (demo ? [...routeNav, ...sampleNav] : buildShellNav(permittedGroups, readable)),
    [demo, permittedGroups, readable],
  );
  // Hızlı eylemler menüyle aynı süzgeçten geçer. Örnek istekler yalnız denemede.
  const quickActions = useMemo(
    () => (demo ? samplePrompts : quickActionsFrom(permittedGroups)),
    [demo, permittedGroups],
  );
  const access = useMemo(
    () => ({
      ready:
        (!navigation?.loadReadable || probedFrom === navigation) &&
        (!navigation?.loadAccountKind || kind !== null),
      readable,
    }),
    [navigation, probedFrom, kind, readable],
  );
  return {
    access,
    accountKindFailed: kind === 'failed',
    nav,
    agents: demo ? sampleAgents : [],
    quickActions,
    demo,
  };
}

/** Deneme sayfasının örnek çalışma alanları. Canlı panelde kullanılmaz. */
const DEMO_WORKSPACES: ShellWorkspaceData = {
  items: sampleWorkspaces,
  current: sampleWorkspaces[0]?.id ?? '',
};

/**
 * AI kredisi. Canlıda sayı yalnız sunucu ucundan gelir. Uç yoksa ya da yanıt boşsa sayaç gizlidir.
 * Örnek kredi yalnız deneme sayfasında görünür.
 */
function useShellCredit(demo: boolean): ShellCredit | null {
  const source = useViewData()?.credit;
  // Yanıt hangi kaynaktan geldiyse onunla saklanır. Kaynak değişince eski sayı görünmez.
  const [loaded, setLoaded] = useState<{ from: unknown; value: ShellCredit | null }>({
    from: null,
    value: null,
  });
  useEffect(() => {
    if (demo || !source) return undefined;
    const ctrl = new AbortController();
    source.load(ctrl.signal).then(
      (value) => {
        if (!ctrl.signal.aborted) setLoaded({ from: source, value });
      },
      // İstek başarısızsa sayaç gizli kalır. Uydurma sayı gösterilmez.
      () => undefined,
    );
    return () => ctrl.abort();
  }, [demo, source]);
  if (demo) return sampleCredit;
  return source && loaded.from === source ? loaded.value : null;
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
  const [commandMode, setCommandMode] = useState<CommandMode>('ask');
  const menuBtn = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const topRef = useRef<HTMLElement>(null);
  const vars = useThemeVars();
  const { access, accountKindFailed, nav, agents, quickActions, demo } = useShellNav();
  const liveWorkspaces = useViewData()?.workspaces;
  const moduleEnvironment = useViewData()?.modules?.mode;
  const workspaces = demo ? DEMO_WORKSPACES : liveWorkspaces;
  const credit = useShellCredit(demo);
  const isDrawer = compact;
  const modalOpen = isDrawer && drawerOpen;
  // A wrapping identity strip has no fixed height. Keep focused content below it.
  useLayoutEffect(() => {
    const header = topRef.current;
    if (!isDrawer || !header) return undefined;
    const root = document.documentElement;
    const property = '--shell-identity-height';
    const previous = root.style.getPropertyValue(property);
    const measure = () =>
      root.style.setProperty(property, `${header.getBoundingClientRect().height}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    return () => {
      observer.disconnect();
      if (previous) root.style.setProperty(property, previous);
      else root.style.removeProperty(property);
    };
  }, [isDrawer]);

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

  // Üst çubuk açık çalışma alanının adını yazar. Veri yoksa ad gizlidir.
  const ws = workspaces?.items.find((w) => w.id === workspaces.current) ?? workspaces?.items[0];

  return (
    <FocusDimProvider>
      <div
        className="shell"
        style={vars}
        data-layout={isDrawer ? 'compact' : 'wide'}
        data-variant={variant}
      >
        <header ref={topRef} className="shell-identity" aria-label={workspaceText.identity}>
          {isDrawer && (
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
          )}
          <WorkspaceIdentity
            tenant={ws?.name}
            environment={demo ? 'example' : moduleEnvironment}
            mode={commandMode}
          />
        </header>
        {isDrawer && (
          <div
            className="shell-backdrop"
            data-open={drawerOpen ? 'true' : 'false'}
            aria-hidden="true"
            onClick={closeDrawer}
          />
        )}
        <div
          ref={drawerRef}
          id="shell-drawer"
          className="shell-aside"
          data-open={isDrawer ? (drawerOpen ? 'true' : 'false') : undefined}
          {...(isDrawer
            ? { role: 'dialog', 'aria-modal': drawerOpen, 'aria-label': t.nav.drawer }
            : { role: 'complementary' })}
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
            nav={nav}
            agents={agents}
            workspaces={workspaces}
            quickActions={quickActions}
            credit={credit}
            compact={isDrawer}
            onNavigate={isDrawer ? closeDrawer : undefined}
            grouped={!demo}
            commandMode={commandMode}
            onCommandModeChange={setCommandMode}
          />
        </div>
        <main ref={mainRef} className="shell-main" id="main">
          {accountKindFailed && (
            <div className="shell-hd-err" role="alert">
              <WarningCircle aria-hidden="true" />
              <span>{t.pages.accountKindError}</span>
            </div>
          )}
          <ShellAccessContext.Provider value={access}>{children}</ShellAccessContext.Provider>
        </main>
      </div>
    </FocusDimProvider>
  );
}
