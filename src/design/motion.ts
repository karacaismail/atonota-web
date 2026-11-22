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
} as const;

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
