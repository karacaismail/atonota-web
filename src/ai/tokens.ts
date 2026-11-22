/**
 * AI Studio, GenUI ve baykuşa özgü tasarım değerleri.
 *
 * Ortak değerler bu dosyada yoktur. Onlar `foundation` işinin CSS
 * değişkenlerinden gelir. Adlar `src/design/css-variables.ts` dosyasındadır.
 * Örnek: `--font-ui`, `--radius`, `--card-radius`, `--color-primary`,
 * `--motion-easing-standard` ve `--focus-indicator-color`.
 *
 * Bu dosya yalnız AI alanına özgü değerleri tutar. Değerlerin çoğu
 * `design/source/control-size-config.json` dosyasından okunur. Kaynakta cümle
 * içinde yazılan değerler ayrıştırılır. Ayrıştırma başarısız olursa modül
 * yüklenirken hata verir. Böylece kaynak değişince sessizce yanlış değer
 * kullanılmaz.
 */
import config from '@design-source/control-size-config.json';

function fail(what: string): never {
  throw new Error(`AI tokenı kaynak dosyada bulunamadı: ${what}`);
}

/** "2.4 s" gibi ilk saniye değerini milisaniyeye çevirir. */
function secondsIn(text: string, what: string): number {
  const match = /(\d+(?:\.\d+)?)\s*s\b/.exec(text);
  if (!match?.[1]) fail(what);
  return Math.round(Number(match[1]) * 1000);
}

function itemStartingWith(prefix: string): string {
  const item = config.aiMotion.items.find((entry) => entry.startsWith(prefix));
  if (!item) fail(`aiMotion "${prefix}"`);
  return item;
}

const liftMatch = /(\d+)\s*px\s*yükselir/.exec(itemStartingWith('AI önerileri'));
if (!liftMatch?.[1]) fail('aiMotion öneri kartı yükselmesi');

export const aiMotion = {
  durations: {
    spark: secondsIn(itemStartingWith('Sparkle'), 'Sparkle'),
    brain: secondsIn(itemStartingWith('Brain'), 'Brain'),
    owl: secondsIn(itemStartingWith('Baykuş'), 'Baykuş'),
    agent: secondsIn(itemStartingWith('Çalışan ajan'), 'Çalışan ajan'),
    scan: secondsIn(itemStartingWith('AI kartları'), 'AI kartları'),
    badge: secondsIn(itemStartingWith('AI rozeti'), 'AI rozeti'),
    ring: secondsIn(itemStartingWith('AI kredisi'), 'AI kredisi'),
  },
  /** Öneri kartı üzerine gelince bu kadar yükselir, px. */
  hoverLift: Number(liftMatch[1]),
} as const;

const orbitMatch = /\((\d+(?:\.\d+)?)\s*s\s*\/\s*(\d+(?:\.\d+)?)\s*s\)/.exec(config.mascot.motion);
if (!orbitMatch?.[1] || !orbitMatch[2]) fail('mascot yörünge süreleri');
const blinkMatch = /(\d+)\s*sn/.exec(config.mascot.motion);
if (!blinkMatch?.[1]) fail('mascot göz kırpma süresi');

/**
 * Baykuşun ek renkleri `control-size-engine.html` içindeki `OWL_COLORS`
 * nesnesinden gelir. JSON yalnız ana renkleri tutar.
 */
const owlEngineColors = {
  tuft: '#007f99',
  feather: '#8fdcec',
  face: '#ffffff',
  eye: '#0b1220',
  beakShade: '#d97706',
  outline: '#0b1220',
} as const;

export type MascotSize = 22 | 28 | 48;

export const mascotTokens = {
  sizes: config.mascot.sizes as MascotSize[],
  orbitDurations: [
    Math.round(Number(orbitMatch[1]) * 1000),
    Math.round(Number(orbitMatch[2]) * 1000),
  ] as const,
  blinkPeriod: Number(blinkMatch[1]) * 1000,
  colors: { ...config.mascot.colors, ...owlEngineColors },
};

function pxIn(text: string, what: string): number {
  const match = /(\d+)\s*px/.exec(text);
  if (!match?.[1]) fail(what);
  return Number(match[1]);
}

export const aiStudioLayout = {
  left: pxIn(config.aiStudio.layout.left, 'aiStudio sol genişlik'),
  right: pxIn(config.aiStudio.layout.right, 'aiStudio sağ genişlik'),
} as const;

export const genuiRules = config.aiStudio.genui.rules;

/**
 * AI alanının ölçüleri. JSON bu ölçüleri tutmaz. Değerler çalışan örnek
 * `control-size-engine.html` dosyasındaki AI Studio ve GenUI kurallarıdır.
 * Sütun genişlikleri `ch` birimindedir. Diğerleri px'tir.
 */
export const aiSizes = {
  /** `.st-welcome` en büyük genişliği. */
  welcomeMaxWidth: 760,
  /** `.gu-bars` yüksekliği. */
  chartHeight: 150,
  /** `.gu-bar i` en büyük genişliği. */
  chartBarMax: 34,
  /** `.st-caret` ölçüleri. */
  caretWidth: 7,
  caretHeight: 15,
  /** Akan imlecin yanıp sönme süresi (`stCaret 1s`), ms. */
  caretBlink: 1000,
  /** `.gu-skel i` yüksekliği. */
  skeletonLine: 12,
  /** Gösterge ve form alanının en küçük genişliği. */
  kpiMin: 140,
  fieldMin: 200,
  /** Tablo açıklama sütununun en küçük ve en büyük genişliği, ch. */
  textCellMin: 16,
  textCellMax: 40,
} as const;

/** AI değerlerini CSS değişkeni olarak verir. Bileşenler değeri buradan okur. */
export function aiCssVars(): Record<`--${string}`, string> {
  const d = aiMotion.durations;
  const z = aiSizes;
  return {
    '--ai-dur-spark': `${d.spark}ms`,
    '--ai-dur-brain': `${d.brain}ms`,
    '--ai-dur-owl': `${d.owl}ms`,
    '--ai-dur-agent': `${d.agent}ms`,
    '--ai-dur-scan': `${d.scan}ms`,
    '--ai-dur-badge': `${d.badge}ms`,
    '--ai-dur-ring': `${d.ring}ms`,
    '--ai-dur-caret': `${z.caretBlink}ms`,
    '--ai-dur-orbit-a': `${mascotTokens.orbitDurations[0]}ms`,
    '--ai-dur-orbit-b': `${mascotTokens.orbitDurations[1]}ms`,
    '--ai-dur-blink': `${mascotTokens.blinkPeriod}ms`,
    '--ai-hover-lift': `-${aiMotion.hoverLift}px`,
    '--ai-left-width': `${aiStudioLayout.left}px`,
    '--ai-right-width': `${aiStudioLayout.right}px`,
    '--ai-welcome-max': `${z.welcomeMaxWidth}px`,
    '--ai-chart-h': `${z.chartHeight}px`,
    '--ai-chart-bar-max': `${z.chartBarMax}px`,
    '--ai-caret-w': `${z.caretWidth}px`,
    '--ai-caret-h': `${z.caretHeight}px`,
    '--ai-skeleton-line': `${z.skeletonLine}px`,
    '--ai-kpi-min': `${z.kpiMin}px`,
    '--ai-field-min': `${z.fieldMin}px`,
    '--ai-cell-text-min': `${z.textCellMin}ch`,
    '--ai-cell-text-max': `${z.textCellMax}ch`,
  };
}
