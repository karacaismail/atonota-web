import { describe, expect, it } from 'vitest';

import { scopeOf, storageName } from './idempotencyStore';

describe('iş anahtarı deposu adı (AJA-1749)', () => {
  it('ad kurumu, hesabı, eylemi ve formu içerir, e-posta açık yazılmaz', () => {
    const name = storageName(
      { team: 'acme.atonota.net', user: 'kisi@example.test' },
      'chat-approval',
      'buy-plan-1',
    );
    expect(name).toMatch(
      /^idempotency-key:acme\.atonota\.net:u[0-9a-f]{8}:chat-approval:buy-plan-1$/,
    );
  });

  it('farklı hesap farklı ad alır', () => {
    const a = storageName({ team: 't', user: 'a@example.test' }, 'chat-approval', 'x');
    const b = storageName({ team: 't', user: 'b@example.test' }, 'chat-approval', 'x');
    expect(a).not.toBe(b);
  });

  it('kurum ve hesap kabuk verisinden gelir, biri yoksa kalıcı depo kullanılmaz', () => {
    expect(
      scopeOf({
        workspaces: { items: [], current: 'acme.atonota.net' },
        account: { user: 'kisi@example.test' },
      }),
    ).toEqual({ team: 'acme.atonota.net', user: 'kisi@example.test' });
    expect(scopeOf({ account: { user: 'kisi@example.test' } })).toBeNull();
    expect(scopeOf({ workspaces: { items: [], current: 'acme.atonota.net' } })).toBeNull();
    expect(scopeOf(null)).toBeNull();
  });
});
