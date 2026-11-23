import { describe, expect, it } from 'vitest';
import { failureKind } from '../data';
import {
  deletionState,
  leaveCommand,
  parseLeaveList,
  parseProposal,
  proposalCanRun,
  safeIdentityUrl,
} from '../contracts';

export const proposalFixture = {
  proposal_id: 'proposal-1',
  status: 'pending',
  result: '',
  tool: 'update_record',
  preview: {
    action: 'update',
    summary: 'Update a record',
    changes: [{ fieldname: 'title', old: 'Before', new: 'After' }],
  },
  digest: 'a'.repeat(64),
  expires_at: '2099-11-23T11:00:00+03:00',
  created_at: '2026-11-23T10:00:00+03:00',
  destructive: false,
  billable: false,
};

describe('contract boundaries', () => {
  it('retains the actual target and treats an unverified write as uncertain', () => {
    const result = parseProposal({
      ...proposalFixture,
      target_doctype: 'Example Record',
      target_name: 'record-to-delete',
    });
    expect(result.target_doctype).toBe('Example Record');
    expect(result.target_name).toBe('record-to-delete');
    expect(failureKind(new Error('invalid_response'), true)).toBe('uncertain');
    expect(failureKind(new Error('invalid_response'), false)).toBe('invalid');
  });
  it('keeps absent permission-filtered leave fields absent', () => {
    expect(parseLeaveList([{ name: 'leave-1' }])).toEqual([{ name: 'leave-1' }]);
  });
  it('rejects malformed fields instead of inventing permission or state', () => {
    expect(() => parseLeaveList([{ name: 'leave-1', docstatus: 7 }])).toThrow();
    expect(() => parseLeaveList([{ name: 'leave-1', status: 'ready' }])).toThrow();
  });
  it('requires the original version for a leave approval', () => {
    expect(() =>
      leaveCommand({ name: 'leave-1', status: 'Open', docstatus: 0 }, 'approve'),
    ).toThrow();
    expect(
      leaveCommand(
        { name: 'leave-1', status: 'Open', docstatus: 0, modified: '2026-11-23 10:00:00.000001' },
        'approve',
      ),
    ).toEqual({ name: 'leave-1', version: '2026-11-23 10:00:00.000001' });
  });
  it('does not present an unknown deletion as completed', () => {
    expect(deletionState({ pending: true })).toBe('pending');
    expect(deletionState({ submitted: true })).toBe('submitted');
    expect(() => deletionState({ submitted: false })).toThrow();
    expect(() => deletionState({ pending: true, submitted: true })).toThrow();
  });
  it('allows only the configured Keycloak host and realm', () => {
    expect(
      safeIdentityUrl(
        'https://api.login.atonota.net/realms/atonota/protocol/openid-connect/auth?state=x',
        'https://api.login.atonota.net/realms/atonota/',
      ),
    ).toContain('state=x');
    for (const url of [
      'javascript:alert(1)',
      'https://evil.test/',
      'https://api.login.atonota.net.evil.test/',
      'https://api.login.atonota.net/realms/other/account',
      // Kullanıcı bilgisi parçalı adres. Parçalar e-posta taramasına takılmasın diye birleştirilir.
      ['https://name', 'api.login.atonota.net/realms/atonota/account'].join('@'),
    ]) {
      expect(() => safeIdentityUrl(url, 'https://api.login.atonota.net/realms/atonota/')).toThrow();
    }
  });
  it('validates the approval digest and refuses ambiguous outcomes', () => {
    expect(parseProposal(proposalFixture).digest).toBe('a'.repeat(64));
    expect(() => parseProposal({ ...proposalFixture, digest: 'bad' })).toThrow();
    expect(
      proposalCanRun(parseProposal({ ...proposalFixture, status: 'consumed', result: 'unknown' })),
    ).toBe(false);
    expect(
      proposalCanRun(parseProposal({ ...proposalFixture, expires_at: '2020-01-01T00:00:00Z' })),
    ).toBe(false);
  });
});
