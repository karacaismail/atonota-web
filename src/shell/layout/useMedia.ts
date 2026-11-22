import { useSyncExternalStore } from 'react';

/**
 * Telefon kabuğu sorgusu. Dar genişlik ya da kısa yükseklik telefon sayılır.
 * Yatay telefon kısa yüksekliği yüzünden telefon kabuğunda kalır.
 */
export const COMPACT_QUERY = '(max-width: 767px), (max-height: 499px)';
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export function useMedia(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', cb);
      return () => mql.removeEventListener('change', cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export const useCompactLayout = () => useMedia(COMPACT_QUERY);
export const useReducedMotion = () => useMedia(REDUCED_MOTION_QUERY);
