import { useEffect, useState } from 'react';
import type { RefObject } from 'react';
import source from '../../../design/source/control-size-config.json';

let keyboardMode = false;
const listeners = new Set<(value: boolean) => void>();
function setKeyboard(value: boolean) {
  keyboardMode = value;
  listeners.forEach((listener) => {
    listener(value);
  });
}
function keydown(event: KeyboardEvent) {
  if (event.key === 'Tab') setKeyboard(true);
}
function pointerdown() {
  setKeyboard(false);
}
export function useCollectionInteractions(root: RefObject<HTMLDivElement>) {
  const [keyboard, setKeyboardState] = useState(keyboardMode);
  useEffect(() => {
    listeners.add(setKeyboardState);
    if (listeners.size === 1) {
      document.addEventListener('keydown', keydown, true);
      document.addEventListener('pointerdown', pointerdown, true);
      document.addEventListener('touchstart', pointerdown, true);
    }
    return () => {
      listeners.delete(setKeyboardState);
      if (!listeners.size) {
        document.removeEventListener('keydown', keydown, true);
        document.removeEventListener('pointerdown', pointerdown, true);
        document.removeEventListener('touchstart', pointerdown, true);
        keyboardMode = false;
      }
    };
  }, []);
  useEffect(() => {
    const container = root.current;
    if (!container) return;
    let frame = 0;
    function focusExpandedInput(event: MouseEvent) {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.classList.contains('ant-select') &&
        !target.classList.contains('ant-select-disabled')
      ) {
        event.preventDefault();
        target.querySelector('.ant-select-selector')?.dispatchEvent(
          new MouseEvent('mousedown', {
            bubbles: true,
            cancelable: true,
            view: window,
            button: 0,
          }),
        );
      }
      if (target instanceof HTMLElement && target.classList.contains('ant-input-affix-wrapper')) {
        target.querySelector('input')?.focus();
      }
    }
    container.addEventListener('mousedown', focusExpandedInput);
    const selector = '.ant-btn, .ant-input-affix-wrapper, .ant-select, .ant-checkbox-wrapper';
    function measure() {
      if (!container) return;
      const elements = [...container.querySelectorAll<HTMLElement>(selector)].filter(
        (element) => !element.parentElement?.closest(selector),
      );
      const targets = elements.map((element) => ({
        element,
        rect: element.getBoundingClientRect(),
      }));
      for (const { element, rect } of targets) {
        const disabled =
          element.matches(
            '[disabled], [aria-disabled="true"], .ant-select-disabled, .ant-input-affix-wrapper-disabled, .ant-checkbox-wrapper-disabled',
          ) ||
          !rect.width ||
          !rect.height;
        const offsets = disabled
          ? [0, 0, 0, 0]
          : [rect.height, rect.width, rect.height, rect.width].map(
              (length) => (length * source.hitArea.expand) / 2,
            );
        for (const other of targets) {
          if (other.element === element) continue;
          const next = other.rect;
          if (next.top < rect.bottom && next.bottom > rect.top) {
            if (next.left >= rect.right)
              offsets[1] = Math.min(offsets[1] ?? 0, (next.left - rect.right) / 2);
            if (next.right <= rect.left)
              offsets[3] = Math.min(offsets[3] ?? 0, (rect.left - next.right) / 2);
          }
          if (next.left < rect.right && next.right > rect.left) {
            if (next.top >= rect.bottom)
              offsets[2] = Math.min(offsets[2] ?? 0, (next.top - rect.bottom) / 2);
            if (next.bottom <= rect.top)
              offsets[0] = Math.min(offsets[0] ?? 0, (rect.top - next.bottom) / 2);
          }
          if (
            next.left < rect.right &&
            next.right > rect.left &&
            next.top < rect.bottom &&
            next.bottom > rect.top
          )
            offsets.fill(0);
        }
        const bounds = container.getBoundingClientRect();
        offsets[0] = Math.min(offsets[0] ?? 0, Math.max(0, rect.top - bounds.top));
        offsets[1] = Math.min(offsets[1] ?? 0, Math.max(0, bounds.right - rect.right));
        offsets[2] = Math.min(offsets[2] ?? 0, Math.max(0, bounds.bottom - rect.bottom));
        offsets[3] = Math.min(offsets[3] ?? 0, Math.max(0, rect.left - bounds.left));
        const computed = getComputedStyle(element);
        const borders = [
          computed.borderTopWidth,
          computed.borderRightWidth,
          computed.borderBottomWidth,
          computed.borderLeftWidth,
        ];
        offsets.forEach((value, index) => {
          element.style.setProperty(
            '--collection-hit-' + index,
            value + (disabled ? 0 : parseFloat(borders[index] ?? '0') || 0) + 'px',
          );
        });
      }
    }
    function schedule() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    }
    const resize = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(schedule);
    resize?.observe(container);
    const mutation = new MutationObserver(schedule);
    mutation.observe(container, { childList: true, subtree: true });
    window.addEventListener('resize', schedule);
    document.fonts?.addEventListener('loadingdone', schedule);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      container.removeEventListener('mousedown', focusExpandedInput);
      resize?.disconnect();
      mutation.disconnect();
      window.removeEventListener('resize', schedule);
      document.fonts?.removeEventListener('loadingdone', schedule);
    };
  }, [root]);
  return keyboard;
}
