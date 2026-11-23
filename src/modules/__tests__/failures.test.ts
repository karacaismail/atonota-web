import { describe, expect, it } from 'vitest';
import { ApiError, type ApiErrorKind } from '../../api';
import { failureKind } from '../data';

describe('server rejection and uncertain write outcomes', () => {
  it.each<[ApiErrorKind, string]>([
    ['session_expired', 'expired'],
    ['forbidden', 'forbidden'],
    ['not_found', 'notFound'],
    ['conflict', 'conflict'],
    ['rate_limited', 'rateLimited'],
    ['invalid_request', 'requestRejected'],
    ['csrf', 'csrf'],
  ])('reports the definite %s rejection', (kind, expected) => {
    expect(failureKind(new ApiError({ kind, status: 0 }), true)).toBe(expected);
    expect(failureKind(new ApiError({ kind, status: 0 }), false)).toBe(expected);
  });
  it.each<ApiErrorKind>(['network', 'timeout', 'unavailable', 'unknown', 'invalid_response'])(
    'does not infer a write outcome from %s',
    (kind) => expect(failureKind(new ApiError({ kind, status: 0 }), true)).toBe('uncertain'),
  );
});
