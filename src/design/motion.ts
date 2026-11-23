/**
 * Hareket tokenları. Bütün süre ve eğriler yalnız bu dosyadadır.
 * Değerler kaynak dosyadan okunur. Kaynakta olmayan temel süreler burada tek yerde tanımlanır.
 * `prefers-reduced-motion: reduce` açıkken hareket durur (bkz. css-variables.ts).
 */
import { designSource } from './source';

const s = designSource;

/** "520 ms cubic-bezier(.65,0,.35,1)" gibi metinlerden ilk milisaniye değerini okur. */
export function parseMs(text: string): number {
  const match = /(\d+(?:\.\d+)?)\s*ms/.exec(text);
  if (!match || match[1] === undefined) {
    throw new Error(`Süre okunamadı: ${text}`);
  }
  return Number(match[1]);
}

/** Metinden `cubic-bezier(...)` ifadesini okur. */
export function parseEasing(text: string): string {
  const match = /cubic-bezier\([^)]*\)/.exec(text);
  if (!match) {
    throw new Error(`Eğri okunamadı: ${text}`);
  }
  return match[0];
}

export const easing = {
  /** Genel S eğrisi. Kaynaktaki odak perdesi ve AI hareketi aynı eğriyi kullanır. */
  standard: s.focusDim.easing,
  /** Dropdown açılışı: kaynaktaki belgeli istisna. */
  dropdown: s.dropdown.animation.easing,
  /** Baykuş rozeti: kaynaktaki belgeli istisna. */
  owlPop: parseEasing(s.owlAssist.badge.animation),
  /** Kayan hover zemini: kaynak örnek sayfadaki `.glide` kuralı (`.2s cubic-bezier(.2,0,0,1)`). */
  glide: 'cubic-bezier(.2, 0, 0, 1)',
  /** Doğrusal: dönen yükleme simgesi ve `visibility` gibi anahtar geçişler. */
  linear: 'linear',
} as const;

export const duration = {
  /** antd temel süreleri. Kaynakta yok; tek yer burasıdır. */
  fast: 100,
  mid: 200,
  slow: 300,
  dropdown: s.dropdown.animation.duration,
  focusDim: s.focusDim.duration,
  flyout: parseMs(s.sidebar.flyout.animation),
  flyoutOpenDelay: parseMs(s.sidebar.flyout.trigger),
  flyoutCloseDelay: s.sidebar.flyout.closeDelay,
  rail: parseMs(s.sidebar.railToggle.motion),
  owlPop: parseMs(s.owlAssist.badge.animation),
  owlDwell: s.owlAssist.dwell,
  /** Kabuk hareketleri. Kaynak örnek sayfadan: kayan zemin .2s, solma .15s, iskelet 1.2s. */
  glide: 200,
  glideFade: 150,
  skeleton: 1200,
  /** Dönen yükleme simgesi (kaynak örnek sayfa). */
  spin: 900,
} as const;

/** Anında geçiş (0 ms). `visibility` gibi anahtar özellikler için. `duration` listesinde değildir; süreler pozitiftir. */
export const instantMs = 0;

export const dropdownAnimation = {
  name: s.dropdown.animation.name,
  duration: duration.dropdown,
  easing: easing.dropdown,
  keyframes: s.dropdown.animation.keyframes,
} as const;

export type DurationToken = keyof typeof duration;
export type EasingToken = keyof typeof easing;

export function seconds(ms: number): string {
  return `${ms / 1000}s`;
}
