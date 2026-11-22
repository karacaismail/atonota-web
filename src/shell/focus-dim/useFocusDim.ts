import { useContext, useEffect } from 'react';

import { FocusDimContext } from './context';

/** Etkinken odak perdesini açar. Birden çok kullanıcı sayılır. */
export function useFocusDim(active: boolean) {
  const api = useContext(FocusDimContext);
  useEffect(() => {
    if (!active || !api) return undefined;
    return api.acquire();
  }, [active, api]);
}
