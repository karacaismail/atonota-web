/**
 * Odak perdesi (kaynak: focusDim). Açılan panel dışındaki her şey perde altındadır.
 * Birden çok tetikleyici anahtarla açılır; son anahtar kapanınca perde kalkar.
 * Renk, opaklık, blur, süre ve eğri CSS değişkenlerinden gelir (src/design).
 */
export const FOCUS_DIM_CLASS = 'focus-dim-on';
export const FOCUS_DIM_OVERLAY_CLASS = 'focus-dim-overlay';
export const FOCUS_DIM_SOURCE_CLASS = 'focus-dim-source';

type Listener = (active: boolean, keys: readonly string[]) => void;

const keys = new Set<string>();
const listeners = new Set<Listener>();

function emit(): void {
  const active = keys.size > 0;
  if (typeof document !== 'undefined') {
    document.body.classList.toggle(FOCUS_DIM_CLASS, active);
  }
  for (const l of listeners) l(active, [...keys]);
}

/** Bir tetikleyiciyi açar veya kapatır. Örnek anahtarlar: "sidebar-flyout", "dropdown:menu-1". */
export function setFocusDim(key: string, on: boolean): void {
  const had = keys.has(key);
  if (on === had) return;
  if (on) keys.add(key);
  else keys.delete(key);
  emit();
}

export function isFocusDimActive(): boolean {
  return keys.size > 0;
}

export function activeFocusDimKeys(): readonly string[] {
  return [...keys];
}

export function subscribeFocusDim(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Testler ve tam sıfırlama için. */
export function resetFocusDim(): void {
  keys.clear();
  emit();
}
