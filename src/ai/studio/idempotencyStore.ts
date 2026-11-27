import type { ShellViewData } from '@/shell/view-data';

import { newIdempotencyKey } from './generation';

/**
 * Idempotency keys of approved chat actions in persistent browser storage (AJA-1860).
 *
 * Contract: AJA-1749, `contracts/idempotency.md`, sections 1-3.
 * - The key is a lower-case UUID 4. It is a random value and carries no personal data.
 * - The key lives in `localStorage`. A reload or a second tab reads the same key.
 * - The storage name holds the team, the account and the action.
 *   The account is written as a short hash, so the e-mail address is not stored in plain text.
 * - The key is removed when a final result arrives.
 * - A key older than 23 hours is not resent on its own. The client asks for the status instead.
 */

/** Team and account an idempotency key belongs to. */
export interface KeyScope {
  /** Team (tenant site). Example: `acme.atonota.net`. */
  team: string;
  /** Frappe user ID of the signed-in person. */
  user: string;
}

/** A key younger than this is resent on its own (AJA-1749, section 1, rule 8). */
export const RESEND_LIMIT_MS = 23 * 60 * 60 * 1000;

const PREFIX = 'idempotency-key';
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** FNV-1a 32-bit hash. Separates accounts in the storage name without writing the user ID. */
function accountTag(user: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < user.length; i += 1) {
    hash ^= user.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `u${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

/** Storage name. Example: `idempotency-key:acme.atonota.net:u1a2b3c4d:chat-approval:buy-plan-1`. */
export function storageName(scope: KeyScope, action: string, form: string): string {
  return `${PREFIX}:${scope.team}:${accountTag(scope.user)}:${action}:${form}`;
}

/** Team and account from the shell data. Without both, keys stay in memory only. */
export function scopeOf(viewData: ShellViewData | null | undefined): KeyScope | null {
  const team = viewData?.workspaces?.current;
  const user = viewData?.account?.user;
  return team && user ? { team, user } : null;
}

/** A key read from storage or newly created. */
export interface HeldKey {
  key: string;
  /** True if the key is older than 23 hours. It must not be resent on its own. */
  expired: boolean;
}

interface Entry {
  key: string;
  createdAt: number;
}

function parse(raw: string | null): Entry | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null) return null;
    const { key, createdAt } = value as Partial<Entry>;
    if (typeof key !== 'string' || !UUID_V4.test(key)) return null;
    if (typeof createdAt !== 'number' || !Number.isFinite(createdAt)) return null;
    return { key, createdAt };
  } catch {
    return null;
  }
}

/** `localStorage`, or `null` if the browser blocks it (for example a private window). */
function browserStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Key store for one team and account.
 * Without a scope, or if storage fails, keys live only in memory, as before AJA-1860.
 */
export function createKeyStore(scope: KeyScope | null, now: () => number = Date.now) {
  const memory = new Map<string, string>();
  const storage = scope ? browserStorage() : null;

  const read = (name: string): string | null => {
    try {
      if (storage) return storage.getItem(name);
    } catch {
      // Fall back to memory.
    }
    return memory.get(name) ?? null;
  };
  const write = (name: string, value: string) => {
    memory.set(name, value);
    try {
      storage?.setItem(name, value);
    } catch {
      // Storage is full or blocked. The key still works in this page.
    }
  };
  const remove = (name: string) => {
    memory.delete(name);
    try {
      storage?.removeItem(name);
    } catch {
      // Nothing more to do.
    }
  };
  const nameOf = (form: string) =>
    scope ? storageName(scope, 'chat-approval', form) : `${PREFIX}:memory:chat-approval:${form}`;

  /** The pending key of the action, or `null`. */
  const peek = (form: string): HeldKey | null => {
    const entry = parse(read(nameOf(form)));
    return entry ? { key: entry.key, expired: now() - entry.createdAt > RESEND_LIMIT_MS } : null;
  };

  return {
    peek,
    /** Returns the pending key of the action. If there is none, creates and stores a new one. */
    acquire(form: string): HeldKey {
      const held = peek(form);
      if (held) return held;
      const key = newIdempotencyKey();
      write(nameOf(form), JSON.stringify({ key, createdAt: now() }));
      return { key, expired: false };
    },
    /** A final result arrived. Removes the key, but only if it is still the given key. */
    release(form: string, key: string) {
      if (peek(form)?.key === key) remove(nameOf(form));
    },
  };
}

export type KeyStore = ReturnType<typeof createKeyStore>;
