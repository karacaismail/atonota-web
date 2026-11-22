import { useEffect, useState } from 'react';

export type PresenceState = 'open' | 'closing' | 'closed';

/**
 * Kapanış hareketi için öğeyi süre boyunca tutar.
 * Anlam hemen güncellenir: çağıran `closing` durumunda öğeyi gizli işaretler.
 */
export function usePresence(open: boolean, duration: number): PresenceState {
  const [state, setState] = useState<PresenceState>(open ? 'open' : 'closed');
  const [prevOpen, setPrevOpen] = useState(open);

  if (prevOpen !== open) {
    setPrevOpen(open);
    setState(open ? 'open' : duration > 0 ? 'closing' : 'closed');
  }

  useEffect(() => {
    if (state !== 'closing') return undefined;
    const id = window.setTimeout(() => setState('closed'), duration);
    return () => window.clearTimeout(id);
  }, [state, duration]);

  return state;
}
