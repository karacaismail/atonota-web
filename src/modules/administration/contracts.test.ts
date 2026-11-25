import { describe, expect, it } from 'vitest';
import {
  parsePermissionLogs,
  parseRolePermissions,
  parseRoles,
  parseUserPermissions,
} from './contracts';

describe('administration contracts (G-62, G-98)', () => {
  it('hides the two protected roles and marks closed roles read only', () => {
    const roles = parseRoles({
      data: [
        { name: 'Administrator', desk_access: 1, disabled: 0 },
        { name: 'System Manager', desk_access: 1, disabled: 0 },
        { name: 'Tenant Admin', desk_access: 0, disabled: 0 },
        { name: 'Accounts User', desk_access: 1, disabled: 0 },
        { name: 'Örnek Rol', desk_access: 0, disabled: 0 },
        { name: 'Kapalı Rol', desk_access: 0, disabled: 1 },
      ],
    });
    expect(roles).toEqual([
      { name: 'Tenant Admin', standard: true },
      { name: 'Accounts User', standard: true },
      { name: 'Örnek Rol', standard: false },
    ]);
  });

  it('keeps only the rows of the chosen role without the owner flag', () => {
    const rows = parseRolePermissions(
      {
        doctype: 'Note',
        stored: true,
        rows: [
          { role: 'Örnek Rol', permlevel: 1, if_owner: 0, read: 1 },
          { role: 'Örnek Rol', permlevel: 0, if_owner: 0, read: 1, delete: 0 },
          { role: 'Örnek Rol', permlevel: 0, if_owner: 1, read: 1 },
          { role: 'Başka Rol', permlevel: 0, if_owner: 0, write: 1 },
        ],
      },
      'Örnek Rol',
    );
    expect(rows.map((row) => row.permlevel)).toEqual([0, 1]);
    expect(rows[0]?.rights.read).toBe(true);
    expect(rows[0]?.rights.delete).toBe(false);
  });

  it('rejects an unknown log status and reads the site time', () => {
    const base = {
      name: 'PL-1',
      changed_at: '2026-11-24 14:32:00',
      changed_by: null,
      for_doctype: 'User',
      for_document: 'ornek@example.invalid',
      reference_type: null,
      reference: null,
      status: 'Added',
      changes: { roles: { from: null, to: 'Örnek Rol' } },
    };
    const result = parsePermissionLogs({ logs: [base], has_more: false });
    expect(result.logs[0]?.changedAt).toBe('2026-11-24T14:32:00');
    expect(result.logs[0]?.changes).toEqual([{ field: 'roles', from: '', to: 'Örnek Rol' }]);
    expect(() =>
      parsePermissionLogs({ logs: [{ ...base, status: 'Other' }], has_more: false }),
    ).toThrow('invalid_response');
  });

  it('shows the single record type of a limited user permission', () => {
    expect(
      parseUserPermissions({
        data: [
          {
            name: 'UP-1',
            user: 'ornek@example.invalid',
            allow: 'Company',
            for_value: 'Örnek A.Ş.',
            apply_to_all_doctypes: 0,
            applicable_for: 'Leave Application',
          },
        ],
      })[0]?.applicableFor,
    ).toBe('Leave Application');
  });
});
