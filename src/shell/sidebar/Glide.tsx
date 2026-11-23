import type { CSSProperties } from 'react';

import type { GlideState } from './useGlide';

/** Kayan hover zemini katmanı. Konum `useGlide` kancasından gelir. */
export function Glide({ state }: { state: GlideState }) {
  return (
    <span
      className="shell-glide"
      aria-hidden="true"
      data-on={state.on ? 'true' : 'false'}
      data-jump={state.jump ? 'true' : 'false'}
      style={
        {
          '--shell-glide-y': `${state.top}px`,
          '--shell-glide-h': `${state.height}px`,
        } as CSSProperties
      }
    />
  );
}
