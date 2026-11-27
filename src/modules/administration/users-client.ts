// G-98: the user management endpoints of the "Administration" page.
//
// This file stays out of the first load. The module client loads it with `import()` only when
// the "Users" section opens. Every request goes through the shared client (SZ-5):
// `listDocuments` and `frappeDocument` own the site root, the CSRF header, the timeout and the
// session handling. The server checks the "Tenant Admin" role on every request.
import type { ApiClient } from '../../api';
import type { InviteInput, UserAdminClient, UserRecord, TenantUser } from '../runtime';

const METHOD = '/api/method/platform_core.api.identity';
const PAGE = 20;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function invalid(): never {
  throw new Error('invalid_response');
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : invalid();
}

function optionalText(value: unknown): string | null {
  return value === null || value === undefined || value === '' ? null : text(value);
}

/** A child table the server may hide. `undefined` means the caller cannot read it. */
function childValues(value: unknown, field: string): string[] | undefined {
  if (value === null || value === undefined) return undefined;
  if (!Array.isArray(value)) return invalid();
  return value.map((row) => (isRecord(row) ? text(row[field]) : invalid()));
}

function parseUser(value: unknown): TenantUser {
  if (!isRecord(value)) return invalid();
  const name = text(value['name']);
  return {
    name,
    fullName: optionalText(value['full_name']) ?? name,
    enabled: value['enabled'] === 1 || value['enabled'] === true,
    lastLogin: optionalText(value['last_login']),
  };
}

async function request(
  api: ApiClient,
  method: 'GET' | 'POST',
  path: string,
  signal: AbortSignal | undefined,
  body?: Record<string, unknown>,
): Promise<unknown> {
  const response = await api.frappeDocument({
    method,
    path,
    ...(body === undefined ? {} : { body }),
    ...(signal ? { signal } : {}),
  });
  if (!response.ok) throw response.error;
  return response.body;
}

/** `/api/resource` answers in `data`, `/api/method` in `message`. */
function envelope(body: unknown, key: 'data' | 'message'): unknown {
  return isRecord(body) ? body[key] : invalid();
}

function inviteBody(input: InviteInput, dryRun: boolean): Record<string, unknown> {
  return {
    email: input.email,
    ...(input.firstName ? { first_name: input.firstName } : {}),
    ...(input.lastName ? { last_name: input.lastName } : {}),
    dry_run: dryRun,
  };
}

export function createUserAdminClient(api: ApiClient): UserAdminClient {
  return {
    async listUsers({ start }, { signal } = {}) {
      const page = await api.listDocuments(
        'User',
        {
          fields: ['name', 'full_name', 'enabled', 'last_login'],
          orderBy: 'full_name asc',
          start,
          limit: PAGE,
        },
        signal ? { signal } : {},
      );
      return { users: page.data.map(parseUser), hasNext: page.hasNextPage };
    },

    async getUser(name, { signal } = {}): Promise<UserRecord> {
      const body = await request(
        api,
        'GET',
        `/api/resource/User/${encodeURIComponent(name)}`,
        signal,
      );
      const data = envelope(body, 'data');
      if (!isRecord(data)) return invalid();
      const roleProfiles = childValues(data['role_profiles'], 'role_profile');
      const roles = childValues(data['roles'], 'role');
      return {
        ...parseUser(data),
        ...(roleProfiles ? { roleProfiles } : {}),
        ...(roles ? { roles } : {}),
      };
    },

    async listRoleProfiles({ signal } = {}) {
      const page = await api.listDocuments(
        'Role Profile',
        { fields: ['name'], orderBy: 'name asc', start: 0, limit: 100 },
        signal ? { signal } : {},
      );
      return page.data.map((row) => (isRecord(row) ? text(row['name']) : invalid()));
    },

    async getRoleProfile(name, { signal } = {}) {
      const path = `/api/resource/${encodeURIComponent('Role Profile')}/${encodeURIComponent(name)}`;
      const data = envelope(await request(api, 'GET', path, signal), 'data');
      if (!isRecord(data)) return invalid();
      return { name: text(data['name']), roles: childValues(data['roles'], 'role') ?? [] };
    },

    async previewInvite(input, { signal } = {}) {
      const body = await request(
        api,
        'POST',
        `${METHOD}.invite_user`,
        signal,
        inviteBody(input, true),
      );
      const result = envelope(body, 'message');
      if (!isRecord(result)) return invalid();
      const digest = text(result['preview_digest']);
      if (!/^[0-9a-f]{64}$/.test(digest)) return invalid();
      const previews = Array.isArray(result['previews']) ? result['previews'] : invalid();
      return {
        digest,
        operations: previews.map((row) => {
          if (!isRecord(row)) return invalid();
          const target = optionalText(row['target']);
          return {
            operation: text(row['operation']),
            ...(target ? { target } : {}),
            destructive: row['destructive'] === true,
          };
        }),
      };
    },

    async sendInvite(input, digest, { signal } = {}) {
      const body = await request(api, 'POST', `${METHOD}.invite_user`, signal, {
        ...inviteBody(input, false),
        preview_digest: digest,
      });
      const result = envelope(body, 'message');
      if (!isRecord(result) || result['dry_run'] !== false) invalid();
    },

    async setRoleProfiles(user, roleProfiles, { signal } = {}) {
      const body = await request(api, 'POST', `${METHOD}.set_user_role_profiles`, signal, {
        user,
        role_profiles: roleProfiles,
      });
      const result = envelope(body, 'message');
      if (!isRecord(result)) return invalid();
      const strings = (value: unknown) => (Array.isArray(value) ? value.map(text) : invalid());
      return { roleProfiles: strings(result['role_profiles']), roles: strings(result['roles']) };
    },
  };
}
