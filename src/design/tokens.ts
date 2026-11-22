/**
 * Semantik tasarım tokenları. Her değer kaynak dosyadan türetilir.
 * Burada yeni görsel değer icat edilmez; yalnız kaynaktaki kararlar adlandırılır.
 */
import { theme as antdThemeApi } from 'antd';

import { blendOver, contrastRatio, darkenToContrast, hexToRgba, minAlphaForContrast } from './color';
import { designSource, type SizeKey, type ThemeMode } from './source';

const s = designSource;

export const SIZE_KEYS: readonly SizeKey[] = ['sm', 'md', 'lg'];

export const fontFamily = {
  /** Outfit kalıcı karardır. Değişken font dosyası "Outfit Variable" adıyla gelir. */
  ui: "'Outfit Variable', Outfit, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  code: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
} as const;

export const typography = {
  special: s.typography.special,
  exception: s.typography.exception,
  min: s.typography.min,
  default: s.typography.default,
  /** Satır kutusu = metin + 8 px. */
  lineBoxFor: (fontSize: number): number => fontSize + 8,
  /** antd oran ister: satır kutusu / metin. */
  lineHeightRatioFor: (fontSize: number): number => (fontSize + 8) / fontSize,
} as const;

/**
 * Koyu temada birincil butonun oturduğu sayfa zeminleri: yerleşim ve panel.
 * Yükseltilmiş zeminde (#2A2A30) %14 teal zemin üzerinde %100 metin bile 4.21:1 kalır;
 * bu zemin hesaba katılmaz ve orada birincil buton kullanılmaz.
 */
const DARK_SURFACES = [s.darkPalette.layout, s.darkPalette.panel] as const;

const DARK_TEXT_OPACITY = minAlphaForContrast({
  text: s.primary.dark.text,
  startAlpha: s.primary.dark.opacity,
  background: s.primary.color,
  backgroundAlpha: s.primary.dark.background,
  surfaces: DARK_SURFACES,
});

/**
 * Basılı durum zemini. Kaynak %28 der; %100 metinle bile 4.09:1 kalır.
 * Yerleşim zemininde 4.5:1 veren en büyük opaklığa (≤ kaynak) programatik iner.
 */
function maxBackgroundAlphaForContrast(startAlpha: number, surface: string): number {
  let alpha = Math.round(startAlpha * 100);
  const ok = (a: number) => {
    const bg = blendOver(s.primary.color, a / 100, surface);
    return contrastRatio(blendOver(s.primary.dark.text, 1, bg), bg) >= 4.5;
  };
  while (alpha > 0 && !ok(alpha)) alpha -= 1;
  return alpha / 100;
}
const DARK_ACTIVE_BG_ALPHA = maxBackgroundAlphaForContrast(s.primary.dark.activeBackground, s.darkPalette.layout);

export const primary = {
  color: s.primary.color,
  hover: s.primary.hover,
  active: s.primary.active,
  /** Açık tema: zemin birincil renk, metin siyah %85, hover %100. */
  light: {
    text: hexToRgba(s.primary.light.text, s.primary.light.opacity),
    textHover: hexToRgba(s.primary.light.text, s.primary.light.hoverOpacity),
  },
  /**
   * Koyu tema: zemin birincil %14, hover %22, basılı %28. Hover metni %100.
   * Dinlenme metni kaynakta %85'tir. Bu değer AA kontrastını (4.5:1) vermez.
   * Orkestratör kararı: WCAG 2.2 AA önce gelir. Dinlenme opaklığı, kontrastı
   * sağlayan en küçük değere programatik olarak çıkarılır (textOpacity).
   */
  dark: {
    textOpacity: DARK_TEXT_OPACITY,
    text: hexToRgba(s.primary.dark.text, DARK_TEXT_OPACITY),
    textHover: hexToRgba(s.primary.dark.text, s.primary.dark.hoverOpacity),
    background: hexToRgba(s.primary.color, s.primary.dark.background),
    backgroundHover: hexToRgba(s.primary.color, s.primary.dark.hoverBackground),
    backgroundActiveOpacity: DARK_ACTIVE_BG_ALPHA,
    backgroundActive: hexToRgba(s.primary.color, DARK_ACTIVE_BG_ALPHA),
  },
} as const;

/** Kontrol kenarlık kalınlığı. antd varsayılanı 1 px; kaynaktaki padding hesabı bunu düşer. */
export const border = {
  width: 1,
} as const;

/** Açık tema sayfa zemini antd varsayılan algoritmasından gelir. Kontrast bu zemine göre hesaplanır. */
const LIGHT_SURFACE: string = antdThemeApi.getDesignToken().colorBgLayout;

/**
 * Metin bağlantısı renkleri. Koyu temada birincil renk yeterli kontrast verir.
 * Açık temada birincil renk beyaz üzerinde 2.76:1 kalır; WCAG 2.2 AA 4.5:1 ister.
 * Bu yüzden açık tema bağlantı rengi birincil renkten koyulaştırılarak türetilir.
 * Butonlar ve zeminler birincil rengi aynen kullanır.
 */
export const link = {
  light: {
    color: darkenToContrast(s.primary.color, LIGHT_SURFACE),
    hover: darkenToContrast(s.primary.hover, LIGHT_SURFACE),
    active: darkenToContrast(s.primary.active, LIGHT_SURFACE),
  },
  dark: { color: s.primary.color, hover: s.primary.hover, active: s.primary.active },
} as const;

/**
 * Yer tutucu metni. antd varsayılanı siyah %25 ve beyaz %25'tir; AA (4.5:1) sınırının altındadır.
 * Opaklık, giriş zemininde 4.5:1 veren en küçük değere programatik çıkar.
 * Açık temada zemin antd varsayılan kapsayıcı rengidir; koyu temada kaynak giriş zemini.
 */
export const placeholder = {
  light: hexToRgba(
    '#000000',
    minAlphaForContrast({
      text: '#000000',
      startAlpha: 0.25,
      background: antdThemeApi.getDesignToken().colorBgContainer,
      backgroundAlpha: 1,
      surfaces: [antdThemeApi.getDesignToken().colorBgContainer],
    }),
  ),
  dark: hexToRgba(
    '#ffffff',
    minAlphaForContrast({
      text: '#ffffff',
      startAlpha: 0.25,
      background: s.darkPalette.input,
      backgroundAlpha: 1,
      surfaces: [s.darkPalette.input],
    }),
  ),
} as const;

export const radius = {
  control: s.radius.default,
  card: s.cards.radius,
} as const;

export interface ControlSize {
  height: number;
  fontSize: number;
  lineBox: number;
  paddingBlock: number;
  fontWeight: number;
}

function controlSize(kind: 'button' | 'input', key: SizeKey): ControlSize {
  const { height, fontSize } = s.sizes[key][kind];
  const lineBox = typography.lineBoxFor(fontSize);
  return {
    height,
    fontSize,
    lineBox,
    paddingBlock: (height - lineBox - 2 * border.width) / 2,
    fontWeight: s.fontWeight[key],
  };
}

export const sizes = {
  button: { sm: controlSize('button', 'sm'), md: controlSize('button', 'md'), lg: controlSize('button', 'lg') },
  input: { sm: controlSize('input', 'sm'), md: controlSize('input', 'md'), lg: controlSize('input', 'lg') },
} as const;

export const fontWeight = {
  sm: s.fontWeight.sm,
  md: s.fontWeight.md,
  lg: s.fontWeight.lg,
  lgFallback: s.fontWeight.lgFallback,
  strong: s.fontWeight.lg,
} as const;

export const shadows = {
  light: s.derived.shadowCss,
  dark: s.derived.shadowCssDark,
} as const;

export const darkPalette = {
  layout: s.darkPalette.layout,
  panel: s.darkPalette.panel,
  elevated: s.darkPalette.elevated,
  input: s.darkPalette.input,
  button: s.darkPalette.button,
  buttonHover: s.darkPalette.buttonHover,
  buttonBorder: s.darkPalette.buttonBorder,
  border: s.darkPalette.border,
  borderSecondary: s.darkPalette.borderSecondary,
} as const;

export const hitArea = {
  expand: s.hitArea.expand,
  minTarget: s.hitArea.minTarget,
  css: s.hitArea.css,
  rules: s.hitArea.rules,
} as const;

export const focusDim = {
  light: { color: hexToRgba(s.focusDim.color, s.focusDim.opacity), transparent: hexToRgba(s.focusDim.color, 0) },
  dark: {
    color: hexToRgba(s.focusDim.dark.color, s.focusDim.dark.opacity),
    transparent: hexToRgba(s.focusDim.dark.color, 0),
  },
  blur: s.focusDim.blur,
  duration: s.focusDim.duration,
  easing: s.focusDim.easing,
} as const;

/**
 * Klavye odak göstergesi. Çevreleyen halka yasaktır; gösterge alt kenarda tek çizgidir.
 * Renk birincil renktir. Kalınlık proje kararıdır (kaynakta tanımlı değil): 2 px.
 */
export const focusIndicator = {
  color: s.primary.color,
  size: 2,
} as const;

export const choice = {
  checkbox: s.choice.checkbox,
  radio: s.choice.radio,
  switch: s.choice.switch,
  tabs: s.choice.tabs,
  tag: s.choice.tag,
} as const;

export const sidebar = {
  widthExpanded: s.sidebar.widthExpanded,
  widthCollapsed: s.sidebar.widthCollapsed,
  item: s.sidebar.item,
  flyout: s.sidebar.flyout,
} as const;

export const dropdown = {
  style: s.dropdown.defaultStyle,
  styles: s.dropdown.styles,
  joinedItems: s.dropdown.joinedItems.value,
  attachedSelect: s.dropdown.attachedSelect.value,
  attachedButton: s.dropdown.attachedButton.value,
} as const;

/** antd varsayılan takma tokenları: boşluk, katman sırası ve ekran eşikleri. Algoritmadan bağımsızdır. */
const antdDefaults = antdThemeApi.getDesignToken();

/**
 * Boşluk ölçeği. antd takma tokenlarından türetilir; bileşenler sayı yazmaz.
 * xxs 4, xs 8, sm 12, md 16, lg 24, xl 32, xxl 48 px.
 */
export const space = {
  xxs: antdDefaults.paddingXXS,
  xs: antdDefaults.paddingXS,
  sm: antdDefaults.paddingSM,
  md: antdDefaults.padding,
  lg: antdDefaults.paddingLG,
  xl: antdDefaults.paddingXL,
  xxl: antdDefaults.paddingXL + antdDefaults.padding,
} as const;

/** Katman sırası. Perde antd açılır katmanının hemen altında, açan öğe antd katmanında. */
export const layer = {
  popupBase: antdDefaults.zIndexPopupBase,
  dimOverlay: antdDefaults.zIndexPopupBase - 1,
  dimSource: antdDefaults.zIndexPopupBase,
} as const;

/** Okuma genişliği ve içerik eşikleri (antd ekran eşikleri). */
export const layout = {
  contentMaxWidth: antdDefaults.screenLG,
  screenSM: antdDefaults.screenSM,
  screenMD: antdDefaults.screenMD,
  screenLG: antdDefaults.screenLG,
  screenXL: antdDefaults.screenXL,
  sidebarWidth: s.sidebar.widthExpanded,
  sidebarRailWidth: s.sidebar.widthCollapsed,
  cardPadding: s.cards.padding,
  /** Dar form sütunu (giriş, parola, kısa ayar). Kaynak ölçeğinden türetilir: 10 orta buton yüksekliği = 420 px. */
  formMaxWidth: sizes.button.md.height * 10,
} as const;

/**
 * Tablo sütunu en küçük genişlikleri (içerik türüne göre). Sütunlar sıkışmaz; tablo kendi
 * kapsayıcısında yatay kayar. Değerler buton ölçeğinden türetilir: md yükseklik 42 px.
 */
export const table = {
  columnMinWidth: {
    action: sizes.button.md.height * 2,
    number: sizes.button.md.height * 2 + space.sm,
    date: sizes.button.md.height * 3,
    text: sizes.button.md.height * 4,
    title: sizes.button.md.height * 5,
  },
} as const;

export function shadowsFor(mode: ThemeMode) {
  return mode === 'dark' ? shadows.dark : shadows.light;
}

export type { SizeKey, ThemeMode };
