/**
 * CSS değişkenlerini ve temel stil kurallarını kaynak kararlardan üretir.
 * Kaynaktaki `derived.css` başlangıç noktasıdır; burada aynı adlar korunur ve
 * açık/koyu değerler doğru bloklara ayrılır.
 */
import { dropdownAnimation, duration, easing } from './motion';
import type { ThemeMode } from './source';
import {
  darkPalette,
  layer,
  layout,
  space,
  table,
  focusDim,
  focusIndicator,
  fontFamily,
  fontWeight,
  hitArea,
  primary,
  radius,
  shadowsFor,
  sizes,
  typography,
} from './tokens';

const px = (n: number) => `${n}px`;
const ms = (n: number) => `${n}ms`;

function block(selector: string, lines: Record<string, string>): string {
  const body = Object.entries(lines)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join('\n');
  return `${selector} {\n${body}\n}`;
}

function shadowVars(mode: ThemeMode): Record<string, string> {
  const sh = shadowsFor(mode);
  return {
    '--shadow-card': sh.card,
    '--shadow-button': sh.button,
    '--shadow-input': sh.input,
    '--shadow-dropdown': sh.dropdown,
  };
}

/** Temadan bağımsız değişkenler. */
export function rootVariables(): Record<string, string> {
  const { button, input } = sizes;
  return {
    '--font-ui': fontFamily.ui,
    '--font-code': fontFamily.code,
    '--font-special': px(typography.special),
    '--font-exception': px(typography.exception),
    '--font-min': px(typography.min),
    '--font-default': px(typography.default),
    '--btn-h-sm': px(button.sm.height),
    '--btn-fs-sm': px(button.sm.fontSize),
    '--btn-lh-sm': px(button.sm.lineBox),
    '--input-h-sm': px(input.sm.height),
    '--input-fs-sm': px(input.sm.fontSize),
    '--input-lh-sm': px(input.sm.lineBox),
    '--btn-h-md': px(button.md.height),
    '--btn-fs-md': px(button.md.fontSize),
    '--btn-lh-md': px(button.md.lineBox),
    '--input-h-md': px(input.md.height),
    '--input-fs-md': px(input.md.fontSize),
    '--input-lh-md': px(input.md.lineBox),
    '--btn-h-lg': px(button.lg.height),
    '--btn-fs-lg': px(button.lg.fontSize),
    '--btn-lh-lg': px(button.lg.lineBox),
    '--input-h-lg': px(input.lg.height),
    '--input-fs-lg': px(input.lg.fontSize),
    '--input-lh-lg': px(input.lg.lineBox),
    '--font-weight-sm': String(fontWeight.sm),
    '--font-weight-md': String(fontWeight.md),
    '--font-weight-lg': String(fontWeight.lg),
    '--color-primary': primary.color,
    '--color-primary-hover': primary.hover,
    '--color-primary-active': primary.active,
    '--primary-text': primary.light.text,
    '--primary-text-hover': primary.light.textHover,
    '--radius': px(radius.control),
    '--card-radius': px(radius.card),
    '--hit-expand': String(hitArea.expand),
    '--hit-min-target': px(hitArea.minTarget),
    '--focus-indicator-color': focusIndicator.color,
    '--focus-indicator-size': px(focusIndicator.size),
    '--focus-dim-color': focusDim.light.color,
    '--focus-dim-transparent': focusDim.light.transparent,
    '--focus-dim-blur': px(focusDim.blur),
    '--motion-easing-standard': easing.standard,
    '--motion-easing-dropdown': easing.dropdown,
    '--motion-easing-owl-pop': easing.owlPop,
    '--motion-duration-fast': ms(duration.fast),
    '--motion-duration-mid': ms(duration.mid),
    '--motion-duration-slow': ms(duration.slow),
    '--motion-duration-dropdown': ms(duration.dropdown),
    '--motion-duration-focus-dim': ms(duration.focusDim),
    '--motion-duration-flyout': ms(duration.flyout),
    '--motion-duration-rail': ms(duration.rail),
    '--motion-duration-owl-pop': ms(duration.owlPop),
    '--space-xxs': px(space.xxs),
    '--space-xs': px(space.xs),
    '--space-sm': px(space.sm),
    '--space-md': px(space.md),
    '--space-lg': px(space.lg),
    '--space-xl': px(space.xl),
    '--space-xxl': px(space.xxl),
    '--z-popup-base': String(layer.popupBase),
    '--z-dim-overlay': String(layer.dimOverlay),
    '--z-dim-source': String(layer.dimSource),
    '--content-max-width': px(layout.contentMaxWidth),
    '--sidebar-width': px(layout.sidebarWidth),
    '--sidebar-rail-width': px(layout.sidebarRailWidth),
    '--card-padding': px(layout.cardPadding),
    '--table-col-min-action': px(table.columnMinWidth.action),
    '--table-col-min-number': px(table.columnMinWidth.number),
    '--table-col-min-date': px(table.columnMinWidth.date),
    '--table-col-min-text': px(table.columnMinWidth.text),
    '--table-col-min-title': px(table.columnMinWidth.title),
    ...shadowVars('light'),
  };
}

/** Yalnız koyu temada değişen değişkenler. */
export function darkVariables(): Record<string, string> {
  return {
    '--primary-text': primary.dark.text,
    '--primary-text-hover': primary.dark.textHover,
    '--primary-bg': primary.dark.background,
    '--primary-bg-hover': primary.dark.backgroundHover,
    '--primary-bg-active': primary.dark.backgroundActive,
    '--bg-layout': darkPalette.layout,
    '--bg-panel': darkPalette.panel,
    '--bg-elevated': darkPalette.elevated,
    '--bg-input': darkPalette.input,
    '--bg-button': darkPalette.button,
    '--focus-dim-color': focusDim.dark.color,
    '--focus-dim-transparent': focusDim.dark.transparent,
    ...shadowVars('dark'),
  };
}

/** Kaynaktaki satır kutusu ve yükseklik düzeltmeleri (derived.css ile aynı). */
function controlFixCss(): string {
  const { button, input } = sizes;
  return [
    '/* Input satır kutusu = fontSize + 8; yükseklik sistem boyutuna sabit */',
    `.ant-input, .ant-input-affix-wrapper, .ant-input-affix-wrapper > input.ant-input { line-height: ${px(input.md.lineBox)}; }`,
    `.ant-input-sm, .ant-input-affix-wrapper.ant-input-affix-wrapper-sm, .ant-input-affix-wrapper-sm > input.ant-input { line-height: ${px(input.sm.lineBox)}; }`,
    `.ant-input-lg, .ant-input-affix-wrapper.ant-input-affix-wrapper-lg, .ant-input-affix-wrapper-lg > input.ant-input { line-height: ${px(input.lg.lineBox)}; }`,
    `.ant-input-affix-wrapper { height: ${px(input.md.height)}; }`,
    `.ant-input-affix-wrapper.ant-input-affix-wrapper-sm { height: ${px(input.sm.height)}; }`,
    `.ant-input-affix-wrapper.ant-input-affix-wrapper-lg { height: ${px(input.lg.height)}; }`,
    `.ant-select-sm .ant-select-selection-item, .ant-select-sm .ant-select-selection-placeholder { font-size: ${px(input.sm.fontSize)}; }`,
    `.ant-btn { font-size: ${px(button.md.fontSize)}; line-height: ${px(button.md.lineBox)}; }`,
    `.ant-btn.ant-btn-sm { font-size: ${px(button.sm.fontSize)}; line-height: ${px(button.sm.lineBox)}; }`,
    `.ant-btn.ant-btn-lg { font-size: ${px(button.lg.fontSize)}; line-height: ${px(button.lg.lineBox)}; }`,
    '.ant-btn:not(:disabled):active, .ant-btn.ant-dropdown-open { box-shadow: none; }',
    '.ant-btn, .ant-input, .ant-select-selection-item { font-weight: var(--font-weight-md); }',
    '.ant-btn-sm, .ant-input-sm, .ant-input-affix-wrapper-sm .ant-input, .ant-select-sm .ant-select-selection-item { font-weight: var(--font-weight-sm); }',
    '.ant-btn-lg, .ant-input-lg, .ant-input-affix-wrapper-lg .ant-input, .ant-select-lg .ant-select-selection-item { font-weight: var(--font-weight-lg); }',
  ].join('\n');
}

/** Birincil buton metni ve koyu tema zemini (kaynak: primary.light / primary.dark). */
function primaryButtonCss(): string {
  return [
    '.ant-btn-primary:not(:disabled):not(.ant-btn-disabled) { color: var(--primary-text); }',
    '.ant-btn-primary:not(:disabled):not(.ant-btn-disabled):hover { color: var(--primary-text-hover); }',
    '[data-theme="dark"] .ant-btn-primary:not(:disabled):not(.ant-btn-disabled) { background: var(--primary-bg); color: var(--primary-text); }',
    '[data-theme="dark"] .ant-btn-primary:not(:disabled):not(.ant-btn-disabled):hover { background: var(--primary-bg-hover); color: var(--primary-text-hover); }',
    '[data-theme="dark"] .ant-btn-primary:not(:disabled):not(.ant-btn-disabled):active { background: var(--primary-bg-active); }',
  ].join('\n');
}

/**
 * Odak göstergesi. Çevreleyen halka yasaktır. Gösterge alt kenarda tek çizgidir.
 * Görünür odak modu yalnız klavyeyle açılır: `html[data-focus-mode="keyboard"]`.
 */
function focusCss(): string {
  const on = 'html[data-focus-mode="keyboard"]';
  const bar = 'inset 0 calc(var(--focus-indicator-size) * -1) 0 0 var(--focus-indicator-color)';
  return [
    '/* Çevreleyen odak halkası yasak: tarayıcı ve antd outline kapalı. Gösterge aşağıda. */',
    ':focus { outline: none; }',
    ':focus-visible { outline: none; }',
    `${on} :focus-visible { box-shadow: ${bar}; }`,
    `${on} a:focus-visible { box-shadow: none; text-decoration: underline; text-decoration-thickness: var(--focus-indicator-size); text-underline-offset: 0.2em; text-decoration-color: var(--focus-indicator-color); }`,
    `${on} .ant-btn:focus-visible { box-shadow: var(--shadow-button), ${bar}; }`,
    `${on} .ant-input:focus-visible, ${on} .ant-input-affix-wrapper:focus-within { box-shadow: var(--shadow-input), ${bar}; }`,
    `${on} .ant-input-affix-wrapper > .ant-input:focus-visible { box-shadow: none; }`,
    `${on} .ant-select.ant-select.ant-select-focused:not(.ant-select-disabled):not(.ant-select-customize-input) .ant-select-selector, ${on} .ant-select.ant-select.ant-select:focus-within:not(.ant-select-disabled):not(.ant-select-customize-input) .ant-select-selector { box-shadow: var(--shadow-input), ${bar}; }`,
    `${on} .ant-select .ant-select-selection-search-input:focus-visible { box-shadow: none; }`,
    `${on} .ant-checkbox-input:focus-visible, ${on} .ant-radio-input:focus-visible { box-shadow: none; }`,
    `${on} .ant-checkbox-wrapper:focus-within, ${on} .ant-radio-wrapper:focus-within, ${on} .ant-switch:focus-visible, ${on} .ant-segmented-item:focus-within { box-shadow: ${bar}; }`,
    '/* Yüksek kontrast: gölge çizilmez; yalnız 2 px CanvasText outline. antd kurallarından daha özgül seçiciler. */',
    '@media (forced-colors: active) {',
    `  ${on} :focus-visible, ${on} .ant-btn:not(:disabled):focus-visible, ${on} .ant-btn.ant-btn:focus-visible { outline: 2px solid CanvasText; outline-offset: 0; box-shadow: none; }`,
    `  ${on} .ant-input-affix-wrapper.ant-input-affix-wrapper:focus-within, ${on} .ant-select.ant-select.ant-select-focused:not(.ant-select-disabled):not(.ant-select-customize-input) .ant-select-selector, ${on} .ant-select.ant-select.ant-select:focus-within:not(.ant-select-disabled):not(.ant-select-customize-input) .ant-select-selector, ${on} .ant-checkbox-wrapper:focus-within, ${on} .ant-radio-wrapper:focus-within, ${on} .ant-segmented-item:focus-within { outline: 2px solid CanvasText; outline-offset: 0; }`,
    `  ${on} .ant-input-affix-wrapper.ant-input-affix-wrapper > .ant-input.ant-input:focus-visible, ${on} .ant-input-affix-wrapper.ant-input-affix-wrapper > .ant-input.ant-input:focus, ${on} .ant-select .ant-select-selection-search-input:focus-visible, ${on} .ant-select .ant-select-selection-search-input:focus, ${on} .ant-checkbox-input:focus-visible, ${on} .ant-radio-input:focus-visible, ${on} .ant-segmented-item-input:focus-visible { outline: none; }`,
    '}',
  ].join('\n');
}

/** Dropdown açılış hareketi (kaynak: dropdown.animation). Controls işi bu adı kullanır. */
function dropdownMotionCss(): string {
  const k = dropdownAnimation.keyframes;
  return [
    `@keyframes atonota-dropdown-in {`,
    `  from { ${k.from}; }`,
    `  60% { ${k['60%']}; }`,
    `  to { ${k.to}; }`,
    `}`,
  ].join('\n');
}

function reducedMotionCss(): string {
  return [
    '@media (prefers-reduced-motion: reduce) {',
    '  *, *::before, *::after {',
    '    animation-duration: 0.01ms !important;',
    '    animation-iteration-count: 1 !important;',
    '    transition-duration: 0.01ms !important;',
    '    scroll-behavior: auto !important;',
    '  }',
    '}',
  ].join('\n');
}

function baseCss(): string {
  return [
    'html { font-family: var(--font-ui); font-size: 100%; -webkit-text-size-adjust: 100%; }',
    'body { margin: 0; font-family: var(--font-ui); font-size: var(--font-default); line-height: calc(var(--font-default) + 8px); min-width: 320px; }',
    '/* Tablolar kendi kapsayıcısında kayar; başlık ve ilk sütun sözcük ortasından bölünmez. */',
    '[data-scroll-x] { overflow-x: auto; overscroll-behavior-x: contain; -webkit-overflow-scrolling: touch; }',
    '.ant-table-thead > tr > th, .ant-table-tbody > tr > td:first-child { word-break: normal; overflow-wrap: normal; white-space: nowrap; }',
    'code, kbd, pre, samp { font-family: var(--font-code); }',
    '*, *::before, *::after { box-sizing: border-box; }',
    'img, svg, video { max-width: 100%; height: auto; }',
    '/* Metin bağlantıları altı çizilidir: renk tek ayırt edici olmaz (WCAG 1.4.1). */',
    'a:not(.ant-btn):not(.ant-menu-item):not(.ant-tabs-tab) { text-decoration: underline; text-underline-offset: 0.15em; }',
  ].join('\n');
}

export const DESIGN_STYLE_ID = 'atonota-design';

/** Bütün tasarım CSS'i: değişkenler, temel kurallar, odak, dokunma alanı, hareket. */
export function buildDesignCss(): string {
  return [
    block(':root', rootVariables()),
    block('[data-theme="dark"]', darkVariables()),
    baseCss(),
    controlFixCss(),
    primaryButtonCss(),
    focusCss(),
    hitArea.css,
    dropdownMotionCss(),
    reducedMotionCss(),
  ].join('\n\n');
}

/** CSS'i belgeye bir kez ekler. Tekrar çağrı aynı öğeyi günceller. */
export function ensureDesignStyles(doc: Document = document): HTMLStyleElement {
  let el = doc.getElementById(DESIGN_STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = doc.createElement('style');
    el.id = DESIGN_STYLE_ID;
    doc.head.appendChild(el);
  }
  const css = buildDesignCss();
  if (el.textContent !== css) {
    el.textContent = css;
  }
  return el;
}
