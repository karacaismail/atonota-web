import { List, Question, X } from '@phosphor-icons/react';
import { theme } from 'antd';
import type { CSSProperties, ReactNode } from 'react';
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useLocation } from 'react-router-dom';

import { isDemoEnabled, isDemoPath } from '@/app/demo-mode';

import { FocusDimProvider } from '../focus-dim';
import type { HelpApi, HelpTarget } from '../help/context';
import { HelpContext, readSelfHelp, writeSelfHelp } from '../help/context';
import { HelpMarker } from '../help/HelpMarker';
import { isDarkColor } from '../focus-dim/isDarkColor';
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
import { helpDockQuery, shellCssVars } from '../tokens';
import type { ShellCredit, ShellWorkspaceData } from '../view-data';
import { useViewData } from '../view-data';
import { useCompactLayout, useMedia } from './useMedia';

const STORAGE_KEY = 'atonota.shell.sidebar';

// G-137: yardım paneli ilk yüke girmez. Kod kulakçık ilk kez açılınca iner.
// Kulakçığa fare gelince ya da odak gelince indirme önceden başlar.
const loadHelpPanel = () => import('../help/HelpPanel');
const HelpPanel = lazy(() => loadHelpPanel().then((m) => ({ default: m.HelpPanel })));
const preloadHelpPanel = () => {
  void loadHelpPanel();
};

/**
 * Panel kodu inmeden önce boş ve gizli yer tutucu durur.
 * Böylece kulakçığın `aria-controls` başvurusu her zaman var olan bir öğeyi gösterir.
 */
const helpPlaceholder = <aside id="shell-help" className="shell-help" hidden />;

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

/** Deneme sayfaları yalnız e2e derlemesinde vardır. Koşul derleme zamanında sabittir. */
const DEMO_ENABLED = isDemoEnabled(import.meta.env.MODE);

/**
 * Menü verisi. Canlı menü rota kaydından ve sunucunun sidebar verisinden gelir.
 * Örnek gruplar ve örnek ajanlar yalnız deneme sayfasında (`/_demo/...`) görünür.
 * Ajan listesi için sunucuda veri yoktur; canlı menüde ajan bölümü gizlidir.
 */
function useShellNav(): {
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
  useEffect(() => {
    if (!navigation) return undefined;
    const ctrl = new AbortController();
    void navigation.loadSidebars(ctrl.signal).then((sidebars) => {
      if (!ctrl.signal.aborted) setGroups(navFromSidebars(sidebars));
    });
    navigation.loadReadable?.(requiredDocTypes, ctrl.signal).then(
      (readable) => {
        if (!ctrl.signal.aborted) setProbed(readable);
      },
      // Yetki bilgisi gelmezse küme boş kalır. Menü yetki isteyen sayfayı göstermez.
      () => undefined,
    );
    return () => ctrl.abort();
  }, [navigation]);
  // Sunucunun sidebar grupları Frappe'nin izin süzgecinden geçmiştir (`resolve_sidebar`).
  // Gruptaki DocType'lar bu yüzden okunabilir sayılır. Modül sayfaları tanım ucuyla denenir.
  const readable = useMemo(
    () =>
      new Set([...probed, ...groups.flatMap((g) => g.children.flatMap((c) => c.requires ?? []))]),
    [probed, groups],
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
  return { nav, agents: demo ? sampleAgents : [], quickActions, demo };
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
  const menuBtn = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const topRef = useRef<HTMLElement>(null);
  const vars = useThemeVars();
  const { nav, agents, quickActions, demo } = useShellNav();
  const liveWorkspaces = useViewData()?.workspaces;
  const workspaces = demo ? DEMO_WORKSPACES : liveWorkspaces;
  const credit = useShellCredit(demo);
  const isDrawer = compact;
  const modalOpen = isDrawer && drawerOpen;

  // G-137 yardım paneli. AI paneliyle aynı sağ yuvayı kullanır.
  const dockFits = useMedia(helpDockQuery(variant === 'rail'));
  const helpMode = !compact && dockFits ? 'dock' : 'drawer';
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpTarget, setHelpTarget] = useState<HelpTarget>({ kind: 'page' });
  const [selfHelp, setSelfHelp] = useState(readSelfHelp);
  const helpTab = useRef<HTMLButtonElement>(null);
  // Panel tembel yüklenir. Öğe DOM'a girince odak etkisi yeniden çalışsın diye durumda tutulur.
  const [helpPanel, setHelpPanel] = useState<HTMLElement | null>(null);
  const [helpLoaded, setHelpLoaded] = useState(false);
  const helpTrigger = useRef<HTMLElement | null>(null);
  const helpReturn = useRef(false);
  const helpModal = helpOpen && helpMode === 'drawer';

  const openHelp = useCallback((target: HelpTarget, trigger: HTMLElement | null) => {
    helpTrigger.current = trigger;
    setHelpLoaded(true);
    setHelpTarget(target);
    setHelpOpen(true);
  }, []);

  const closeHelp = useCallback(() => {
    helpReturn.current = true;
    setHelpOpen(false);
  }, []);

  const changeSelfHelp = useCallback((on: boolean) => {
    setSelfHelp(on);
    writeSelfHelp(on);
  }, []);

  const helpApi = useMemo<HelpApi>(() => ({ selfHelp, open: openHelp }), [selfHelp, openHelp]);

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
  // Yardım çekmecesi açıkken de kabuğun geri kalanı etkileşime kapanır.
  useLayoutEffect(() => {
    for (const el of [mainRef.current, topRef.current]) {
      el?.toggleAttribute('inert', modalOpen || helpModal);
    }
    drawerRef.current?.toggleAttribute('inert', helpModal);
    helpTab.current?.toggleAttribute('inert', modalOpen || helpModal);
    if (!modalOpen && returnFocus.current) {
      returnFocus.current = false;
      menuBtn.current?.focus();
    }
    // Panel kapanınca odak paneli açan öğeye döner: kulakçık ya da yardım işareti.
    if (!helpOpen && helpReturn.current) {
      helpReturn.current = false;
      const back = helpTrigger.current;
      (back?.isConnected ? back : helpTab.current)?.focus();
    }
  }, [modalOpen, helpModal, helpOpen]);

  // Panel açılınca odak panele taşınır. Yerleşim değişince odak yerinde kalır.
  useEffect(() => {
    if (!helpOpen) return;
    const p = helpPanel;
    if (!p || p.contains(document.activeElement)) return;
    p.querySelector<HTMLElement>('[data-help-close]')?.focus();
  }, [helpOpen, helpTarget, helpPanel]);

  useEffect(() => {
    if (!helpOpen) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) closeHelp();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [helpOpen, closeHelp]);

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
      <HelpContext.Provider value={helpApi}>
        <div
          className="shell"
          style={vars}
          data-layout={isDrawer ? 'compact' : 'wide'}
          data-variant={variant}
          data-help={helpOpen ? helpMode : 'closed'}
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
              {ws && <span className="shell-topbar-t">{ws.name}</span>}
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
              nav={nav}
              agents={agents}
              workspaces={workspaces}
              quickActions={quickActions}
              credit={credit}
              compact={isDrawer}
              onNavigate={isDrawer ? closeDrawer : undefined}
            />
          </aside>
          <main ref={mainRef} className="shell-main" id="main">
            {selfHelp && (
              <div className="shell-help-bar">
                <HelpMarker target={{ kind: 'page' }} />
              </div>
            )}
            {children}
          </main>
          {helpLoaded ? (
            <Suspense fallback={helpPlaceholder}>
              <HelpPanel
                ref={setHelpPanel}
                open={helpOpen}
                mode={helpMode}
                target={helpTarget}
                selfHelp={selfHelp}
                onSelfHelpChange={changeSelfHelp}
                onClose={closeHelp}
                tasks={quickActions}
              />
            </Suspense>
          ) : (
            helpPlaceholder
          )}
          <button
            ref={helpTab}
            type="button"
            className="shell-help-tab"
            aria-expanded={helpOpen}
            aria-controls="shell-help"
            onPointerEnter={preloadHelpPanel}
            onFocus={preloadHelpPanel}
            onClick={() => (helpOpen ? closeHelp() : openHelp({ kind: 'page' }, helpTab.current))}
          >
            <Question aria-hidden="true" />
            <span className="shell-help-tab-t">{t.help.tab}</span>
          </button>
        </div>
      </HelpContext.Provider>
    </FocusDimProvider>
  );
}
