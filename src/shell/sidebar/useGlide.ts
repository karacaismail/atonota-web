import type { FocusEvent, PointerEvent } from 'react';
import { useCallback, useRef, useState } from 'react';

/**
 * Kayan hover zemini (G1–G3).
 * G1: Zemin öğeler arasında kayarak geçer. Tek katman vardır.
 * G2: Listeye dışarıdan girilince zemin hareketsiz yerleşir. Sonra kayar.
 * G3: Listeden çıkınca zemin yerinde solar. Klavye odağı da zemini taşır.
 */
const ITEM = '.shell-list > li > .shell-item';

export interface GlideState {
  on: boolean;
  /** G2: dışarıdan girişte konum hareketsiz değişir. */
  jump: boolean;
  top: number;
  height: number;
}

export function useGlide() {
  const hostRef = useRef<HTMLElement>(null);
  const [state, setState] = useState<GlideState>({ on: false, jump: true, top: 0, height: 0 });

  const moveTo = useCallback((item: HTMLElement) => {
    const host = hostRef.current;
    if (!host) return;
    const h = host.getBoundingClientRect();
    const r = item.getBoundingClientRect();
    setState((s) => ({ on: true, jump: !s.on, top: r.top - h.top, height: r.height }));
  }, []);

  const off = useCallback(() => setState((s) => (s.on ? { ...s, on: false } : s)), []);

  const itemFrom = (target: EventTarget | null): HTMLElement | null => {
    const el = (target as HTMLElement | null)?.closest<HTMLElement>(ITEM);
    return el && hostRef.current?.contains(el) ? el : null;
  };

  const hostProps = {
    onPointerOver: (e: PointerEvent<HTMLElement>) => {
      if (e.pointerType !== 'mouse') return;
      const item = itemFrom(e.target);
      if (item) moveTo(item);
    },
    onPointerLeave: (e: PointerEvent<HTMLElement>) => {
      if (e.pointerType !== 'mouse') return;
      if (hostRef.current?.contains(document.activeElement)) {
        const item = itemFrom(document.activeElement);
        if (item) {
          moveTo(item);
          return;
        }
      }
      off();
    },
    onFocus: (e: FocusEvent<HTMLElement>) => {
      const item = itemFrom(e.target);
      if (item) moveTo(item);
    },
    onBlur: (e: FocusEvent<HTMLElement>) => {
      const next = e.relatedTarget as Node | null;
      if (next && hostRef.current?.contains(next)) return;
      off();
    },
  };

  return { hostRef, state, hostProps };
}
