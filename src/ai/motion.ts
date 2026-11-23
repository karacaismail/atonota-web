import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function getMedia(): MediaQueryList | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null;
  return window.matchMedia(QUERY);
}

function subscribe(onChange: () => void): () => void {
  const media = getMedia();
  if (!media) return () => undefined;
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

/** Kullanıcı azaltılmış hareket istiyorsa `true` döner. Ayar değişince güncellenir. */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => getMedia()?.matches ?? false,
    () => false,
  );
}
