/**
 * Görünür odak modu. Kural: mod kapalı başlar. Yalnız Tab ve Shift+Tab açar.
 * Ok tuşları, Escape, yazma ve caret modu açmaz. `pointerdown` ve `touchstart` yalnız
 * görsel modu kapatır. Gösterge CSS'te `html[data-focus-mode="keyboard"]` ile açılır.
 * Odak yönetimi değişmez; yalnız sunum değişir.
 */
export const FOCUS_MODE_ATTR = 'data-focus-mode';
export const FOCUS_MODE_KEYBOARD = 'keyboard';

let refCount = 0;
let detach: (() => void) | null = null;

function root(): HTMLElement {
  return document.documentElement;
}

export function isKeyboardFocusMode(): boolean {
  return root().getAttribute(FOCUS_MODE_ATTR) === FOCUS_MODE_KEYBOARD;
}

export function setKeyboardFocusMode(on: boolean): void {
  if (on) {
    root().setAttribute(FOCUS_MODE_ATTR, FOCUS_MODE_KEYBOARD);
  } else {
    root().removeAttribute(FOCUS_MODE_ATTR);
  }
}

function onKeyDown(event: KeyboardEvent): void {
  if (event.key === 'Tab' && !event.altKey && !event.ctrlKey && !event.metaKey) {
    setKeyboardFocusMode(true);
  }
}

function onPointer(): void {
  setKeyboardFocusMode(false);
}

/** Motoru başlatır. Dönen işlev motoru durdurur. Birden çok çağrı tek dinleyici seti kullanır. */
export function startFocusMode(doc: Document = document): () => void {
  refCount += 1;
  if (!detach) {
    doc.addEventListener('keydown', onKeyDown, true);
    doc.addEventListener('pointerdown', onPointer, true);
    doc.addEventListener('touchstart', onPointer, { capture: true, passive: true });
    detach = () => {
      doc.removeEventListener('keydown', onKeyDown, true);
      doc.removeEventListener('pointerdown', onPointer, true);
      doc.removeEventListener('touchstart', onPointer, { capture: true });
    };
  }
  let stopped = false;
  return () => {
    if (stopped) return;
    stopped = true;
    refCount -= 1;
    if (refCount <= 0 && detach) {
      detach();
      detach = null;
      refCount = 0;
    }
  };
}
