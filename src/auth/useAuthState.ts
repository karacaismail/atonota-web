import { useSyncExternalStore } from 'react';

import type { Auth, AuthState } from './auth';

/** Giriş durumunu React bileşenine bağlar. */
export function useAuthState(auth: Pick<Auth, 'getState' | 'subscribe'>): AuthState {
  return useSyncExternalStore(auth.subscribe, auth.getState, auth.getState);
}
