import './focus-dim.css';

import { FOCUS_DIM_OVERLAY_CLASS } from './focus-dim';

/** Perde katmanı. Uygulama kökünde bir kez çizilir. */
export function FocusDimOverlay() {
  return (
    <div className={FOCUS_DIM_OVERLAY_CLASS} aria-hidden="true" data-testid="focus-dim-overlay" />
  );
}
