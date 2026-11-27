/** View parsers for the role and permission responses of the admin page (G-62, G-98). */
import { object, text } from '../contracts';

function list(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error('invalid_response');
  return value;
}
function flag(value: unknown): boolean {
  return value === 1 || value === true;
}
function optionalText(value: unknown): string | null {
  return value === null || value === undefined ? null : text(value);
}

/** The panel user never sees these two roles. The server does not allow changing them either. */
const HIDDEN_ROLES = new Set(['Administrator', 'System Manager']);
/** These roles' permissions are read-only. The server returns 403 (`tenant_admin.CLOSED_ROLES`). */
const STANDARD_ROLES = new Set(['Script Manager', 'All', 'Guest', 'Tenant Admin']);

export interface RoleOption {
  name: string;
  /** A standard or desk role. Its permissions cannot change from the panel. */
  standard: boolean;
}
export function parseRoles(value: unknown): RoleOption[] {
  return list(object(value)['data'])
    .map((item) => object(item))
    .filter((row) => !HIDDEN_ROLES.has(text(row['name'])) && !flag(row['disabled']))
    .map((row) => {
      const name = text(row['name']);
      return { name, standard: STANDARD_ROLES.has(name) || flag(row['desk_access']) };
    });
}

export const RIGHTS = ['read', 'write', 'create', 'delete', 'submit', 'cancel', 'amend'] as const;
export type Right = (typeof RIGHTS)[number];
/** At field level 1 and above, Frappe uses only the read and write rights. */
export const LEVEL_RIGHTS: readonly Right[] = ['read', 'write'];

export interface PermissionRow {
  doctype: string;
  permlevel: number;
  rights: Record<Right, boolean>;
}
/** From a record type's rows, returns only the requested role's rows without `if_owner`. */
export function parseRolePermissions(value: unknown, role: string): PermissionRow[] {
  const source = object(value);
  const doctype = text(source['doctype']);
  return list(source['rows'])
    .map((item) => object(item))
    .filter((row) => text(row['role']) === role && !flag(row['if_owner']))
    .map((row) => {
      const permlevel = row['permlevel'];
      if (typeof permlevel !== 'number' || !Number.isInteger(permlevel))
        throw new Error('invalid_response');
      const rights = Object.fromEntries(RIGHTS.map((right) => [right, flag(row[right])])) as Record<
        Right,
        boolean
      >;
      return { doctype, permlevel, rights };
    })
    .sort((a, b) => a.permlevel - b.permlevel);
}

export interface PermissionLogEntry {
  name: string;
  changedAt: string;
  changedBy: string | null;
  forDoctype: string;
  forDocument: string;
  status: 'Added' | 'Updated' | 'Removed';
  changes: { field: string; from: string; to: string }[];
}
function shown(value: unknown): string {
  if (value === null || value === undefined) return '';
  return typeof value === 'string' ? value : JSON.stringify(value);
}
export function parsePermissionLogs(value: unknown): {
  logs: PermissionLogEntry[];
  hasMore: boolean;
} {
  const source = object(value);
  const logs = list(source['logs']).map((item): PermissionLogEntry => {
    const row = object(item);
    const status = row['status'];
    if (status !== 'Added' && status !== 'Updated' && status !== 'Removed')
      throw new Error('invalid_response');
    const changes = Object.entries(object(row['changes'])).map(([field, change]) => {
      const pair =
        typeof change === 'object' && change !== null ? (change as Record<string, unknown>) : {};
      return { field, from: shown(pair['from']), to: shown(pair['to']) };
    });
    return {
      name: text(row['name']),
      // The server writes the time in the site time zone, with a space. WebKit cannot parse it.
      changedAt: text(row['changed_at']).replace(' ', 'T'),
      changedBy: optionalText(row['changed_by']),
      forDoctype: text(row['for_doctype']),
      forDocument: text(row['for_document']),
      status,
      changes,
    };
  });
  if (typeof source['has_more'] !== 'boolean') throw new Error('invalid_response');
  return { logs, hasMore: source['has_more'] };
}

export interface UserPermissionEntry {
  name: string;
  user: string;
  allow: string;
  forValue: string;
  applicableFor: string | null;
}
export function parseUserPermissions(value: unknown): UserPermissionEntry[] {
  return list(object(value)['data']).map((item) => {
    const row = object(item);
    return {
      name: text(row['name']),
      user: text(row['user']),
      allow: text(row['allow']),
      forValue: text(row['for_value']),
      applicableFor: flag(row['apply_to_all_doctypes'])
        ? null
        : optionalText(row['applicable_for']),
    };
  });
}

export const SCOPES = ['own', 'team', 'department', 'company', 'all'] as const;
export type Scope = (typeof SCOPES)[number];
export interface AccessRuleEntry {
  name: string;
  title: string;
  documentType: string;
  role: string;
  scope: Scope;
  active: boolean;
}
export function parseAccessRules(value: unknown): AccessRuleEntry[] {
  return list(object(value)['data']).map((item) => {
    const row = object(item);
    const scope = SCOPES.find((entry) => entry === row['scope']);
    if (!scope) throw new Error('invalid_response');
    return {
      name: text(row['name']),
      title: text(row['title']),
      documentType: text(row['document_type']),
      role: text(row['role']),
      scope,
      active: flag(row['is_active']),
    };
  });
}
