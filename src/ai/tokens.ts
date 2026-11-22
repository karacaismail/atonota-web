/**
 * AI Studio, GenUI ve baykuş için tasarım tokenları.
 *
 * Tek kaynak `design/source/control-size-config.json` dosyasıdır.
 * `src/design/` henüz bu alanları dışa aktarmıyor. Bu yüzden değerler burada
 * kaynak dosyadan okunur. `foundation` işi aynı değerleri dışa aktarınca bu
 * modül oradan okuyacak.
 *
 * Kaynakta sayı olarak değil cümle içinde yazılan süreler ayrıştırılır.
 * Ayrıştırma başarısız olursa modül yüklenirken hata verir. Böylece kaynak
 * değişince sessizce yanlış süre kullanılmaz.
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

const easeMatch = /cubic-bezier\([^)]*\)/.exec(config.aiMotion.decision);
if (!easeMatch) fail('aiMotion eğrisi');

export const aiMotion = {
  /** S eğrisi: bütün AI hareketleri bu eğriyi kullanır. */
  ease: easeMatch[0],
  durations: {
    spark: secondsIn(itemStartingWith('Sparkle'), 'Sparkle'),
    brain: secondsIn(itemStartingWith('Brain'), 'Brain'),
    owl: secondsIn(itemStartingWith('Baykuş'), 'Baykuş'),
    agent: secondsIn(itemStartingWith('Çalışan ajan'), 'Çalışan ajan'),
    scan: secondsIn(itemStartingWith('AI kartları'), 'AI kartları'),
    badge: secondsIn(itemStartingWith('AI rozeti'), 'AI rozeti'),
    ring: secondsIn(itemStartingWith('AI kredisi'), 'AI kredisi'),
  },
} as const;

/**
 * Kaynak dosyanın sayısal alanlarında olan geçiş süreleri.
 * Öneri kartının yükselmesi odak perdesiyle aynı süreyi kullanır.
 * Dropdown süresi kaynak dosyanın "Skew + Scale" kararıdır.
 */
export const aiTransitions = {
  hover: config.focusDim.duration,
  hoverEase: config.focusDim.easing,
  drawer: config.dropdown.animation.duration,
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

/** Kart köşe yarıçapı ve iç boşluğu (`cards` alanı). */
export const aiCard = { radius: config.cards.radius, padding: config.cards.padding } as const;

/** Tokenları CSS değişkeni olarak verir. Bileşenler süreyi buradan okur. */
export function motionCssVars(): Record<`--${string}`, string> {
  const d = aiMotion.durations;
  return {
    '--ai-ease': aiMotion.ease,
    '--ai-dur-spark': `${d.spark}ms`,
    '--ai-dur-brain': `${d.brain}ms`,
    '--ai-dur-owl': `${d.owl}ms`,
    '--ai-dur-agent': `${d.agent}ms`,
    '--ai-dur-scan': `${d.scan}ms`,
    '--ai-dur-badge': `${d.badge}ms`,
    '--ai-dur-ring': `${d.ring}ms`,
    '--ai-dur-hover': `${aiTransitions.hover}ms`,
    '--ai-ease-hover': aiTransitions.hoverEase,
    '--ai-dur-orbit-a': `${mascotTokens.orbitDurations[0]}ms`,
    '--ai-dur-orbit-b': `${mascotTokens.orbitDurations[1]}ms`,
    '--ai-dur-blink': `${mascotTokens.blinkPeriod}ms`,
    '--ai-left-width': `${aiStudioLayout.left}px`,
    '--ai-right-width': `${aiStudioLayout.right}px`,
  };
}
