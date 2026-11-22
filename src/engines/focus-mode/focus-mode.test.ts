import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { FOCUS_MODE_ATTR, isKeyboardFocusMode, startFocusMode } from './focus-mode';

function key(type: 'keydown', init: KeyboardEventInit) {
  document.dispatchEvent(new KeyboardEvent(type, { bubbles: true, ...init }));
}

describe('odak modu motoru', () => {
  let stop: () => void;

  beforeEach(() => {
    stop = startFocusMode();
  });

  afterEach(() => {
    stop();
    document.documentElement.removeAttribute(FOCUS_MODE_ATTR);
  });

  it('kapalı başlar', () => {
    expect(isKeyboardFocusMode()).toBe(false);
    expect(document.documentElement.hasAttribute(FOCUS_MODE_ATTR)).toBe(false);
  });

  it('Tab tuşu modu açar', () => {
    key('keydown', { key: 'Tab' });
    expect(isKeyboardFocusMode()).toBe(true);
    expect(document.documentElement.getAttribute(FOCUS_MODE_ATTR)).toBe('keyboard');
  });

  it('Shift+Tab tuşu modu açar', () => {
    key('keydown', { key: 'Tab', shiftKey: true });
    expect(isKeyboardFocusMode()).toBe(true);
  });

  it('ok tuşları, Escape ve yazma modu açmaz', () => {
    for (const k of [
      'ArrowDown',
      'ArrowUp',
      'ArrowLeft',
      'ArrowRight',
      'Escape',
      'Enter',
      ' ',
      'a',
    ]) {
      key('keydown', { key: k });
      expect(isKeyboardFocusMode(), k).toBe(false);
    }
  });

  it('pointerdown modu kapatır', () => {
    key('keydown', { key: 'Tab' });
    document.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(isKeyboardFocusMode()).toBe(false);
  });

  it('touchstart modu kapatır', () => {
    key('keydown', { key: 'Tab' });
    document.dispatchEvent(new Event('touchstart', { bubbles: true }));
    expect(isKeyboardFocusMode()).toBe(false);
  });

  it('mod açıkken ok tuşu modu kapatmaz', () => {
    key('keydown', { key: 'Tab' });
    key('keydown', { key: 'ArrowDown' });
    expect(isKeyboardFocusMode()).toBe(true);
  });

  it('durdurulunca dinleyiciler kalkar', () => {
    stop();
    key('keydown', { key: 'Tab' });
    expect(isKeyboardFocusMode()).toBe(false);
    stop = startFocusMode();
  });

  it('ikinci başlatma aynı dinleyicileri çoğaltmaz', () => {
    const stop2 = startFocusMode();
    key('keydown', { key: 'Tab' });
    expect(isKeyboardFocusMode()).toBe(true);
    stop2();
    document.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(isKeyboardFocusMode()).toBe(false);
  });
});
