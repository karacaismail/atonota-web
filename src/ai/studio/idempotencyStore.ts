import type { ShellViewData } from '@/shell/view-data';

/** Team and account an idempotency key belongs to. */
export interface KeyScope {
  team: string;
  user: string;
}

/** A key younger than this is resent on its own (AJA-1749, section 1). */
export const RESEND_LIMIT_MS = 23 * 60 * 60 * 1000;

/** Not written yet (AJA-1860, failing tests first). */
export function storageName(_scope: KeyScope, _action: string, _form: string): string {
  return '';
}

/** Not written yet (AJA-1860, failing tests first). */
export function scopeOf(_viewData: ShellViewData | null | undefined): KeyScope | null {
  return null;
}
