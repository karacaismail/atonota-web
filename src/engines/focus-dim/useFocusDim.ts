import { useEffect, useId } from 'react';

import { setFocusDim } from './focus-dim';

/** Bileşen `open` iken perdeyi açar; kapanınca veya sökülünce kapatır. */
export function useFocusDim(open: boolean, key?: string): void {
  const autoKey = useId();
  const k = key ?? autoKey;
  useEffect(() => {
    setFocusDim(k, open);
    return () => setFocusDim(k, false);
  }, [k, open]);
}
