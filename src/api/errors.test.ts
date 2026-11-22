import { describe, expect, it } from 'vitest';

import { ApiError, toApiError, userMessage } from './errors';

describe('toApiError', () => {
  it('401 ve SessionExpired yanıtını oturum bitimi sayar', () => {
    const error = toApiError(401, { exc_type: 'SessionExpired', session_expired: 1 });
    expect(error.kind).toBe('session_expired');
    expect(error.code).toBe('SessionExpired');
    expect(error.status).toBe(401);
  });

  it('401 ve reauthentication_required kodunu oturum bitimi sayar', () => {
    expect(toApiError(401, { message: { error: 'reauthentication_required' } }).kind).toBe(
      'session_expired',
    );
  });

  it.each([500, 502, 503, 504])('%i yanıtı oturum işareti taşısa da sunucu hatasıdır', (status) => {
    const error = toApiError(status, { exc_type: 'SessionExpired', session_expired: 1 });
    expect(error.kind).not.toBe('session_expired');
  });

  it('Frappe 15 yanıtında session_expired işaretli 403 oturum bitimidir', () => {
    expect(toApiError(403, { exc_type: 'PermissionError', session_expired: 1 }).kind).toBe(
      'session_expired',
    );
  });

  it('403 yetki reddidir ve oturum denetimi ister', () => {
    const error = toApiError(403, { exc_type: 'PermissionError' });
    expect(error.kind).toBe('forbidden');
    expect(error.needsSessionCheck).toBe(true);
  });

  it('model geçidinin veri politikası reddi kesin yetki reddidir', () => {
    const error = toApiError(403, { message: { error: 'data_policy_denied' } });
    expect(error.kind).toBe('forbidden');
    expect(error.code).toBe('data_policy_denied');
    expect(error.needsSessionCheck).toBe(false);
  });

  it('CSRF hatasını ayrı tür yapar', () => {
    expect(toApiError(400, { exc_type: 'CSRFTokenError' }).kind).toBe('csrf');
  });

  it('API v2 errors listesini okur', () => {
    const error = toApiError(404, {
      errors: [{ type: 'DoesNotExistError', message: 'Kayıt bulunamadı' }],
    });
    expect(error.kind).toBe('not_found');
    expect(error.code).toBe('DoesNotExistError');
  });

  it('API v2 listesinde ilk dolu type alanını bulur', () => {
    const error = toApiError(417, {
      errors: [{ message: 'tür yok' }, { type: 'TimestampMismatchError', message: 'eski' }],
    });
    expect(error.code).toBe('TimestampMismatchError');
    expect(error.kind).toBe('conflict');
  });

  it.each([
    [404, 'not_found'],
    [409, 'conflict'],
    [429, 'rate_limited'],
    [503, 'unavailable'],
    [502, 'unavailable'],
    [400, 'invalid_request'],
    [500, 'unknown'],
  ] as const)('%i durumunu %s türüne çevirir', (status, kind) => {
    expect(toApiError(status, null).kind).toBe(kind);
  });

  it('417 ve TimestampMismatchError çakışmadır', () => {
    expect(toApiError(417, { exc_type: 'TimestampMismatchError' }).kind).toBe('conflict');
  });

  it('Retry-After başlığını saniye olarak okur', () => {
    const error = toApiError(429, null, new Headers({ 'Retry-After': '30' }));
    expect(error.retryAfterSeconds).toBe(30);
  });

  it('ham sunucu metnini hata iletisine koymaz', () => {
    const error = toApiError(403, {
      exc_type: 'PermissionError',
      exception: 'frappe.PermissionError: gizli ayrıntı',
      _server_messages: '["{\\"message\\": \\"gizli ayrıntı\\"}"]',
    });
    expect(error.message).not.toContain('gizli');
    expect(userMessage(error)).not.toContain('gizli');
  });
});

describe('userMessage', () => {
  it.each([
    'session_expired',
    'forbidden',
    'not_found',
    'conflict',
    'rate_limited',
    'unavailable',
    'invalid_request',
    'csrf',
    'network',
    'timeout',
    'invalid_response',
    'unknown',
  ] as const)('%s için Türkçe metin verir', (kind) => {
    const text = userMessage(new ApiError({ kind, status: 0 }));
    expect(text.length).toBeGreaterThan(0);
    expect(text).toMatch(/\.$/);
  });

  it('İngilizce metni de verir', () => {
    expect(userMessage(new ApiError({ kind: 'forbidden', status: 403 }), 'en')).toMatch(
      /permission/i,
    );
  });
});
