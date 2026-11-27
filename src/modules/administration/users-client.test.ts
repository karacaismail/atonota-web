// G-98, AJA-913: the user record and its role profiles come from two reads.
// The "Tenant Admin" role has no level 1 right on User. The server empties the two child tables
// in the record. The role profiles come from `get_user_role_profiles` instead.
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createApiClient } from '@/api/client';
import type { ApiConfig } from '@/api/config';
import { createCsrfStore } from '@/api/csrf';
import { SAMPLE_CSRF_TOKEN } from '@/mocks/fixtures';
import { resetMockState } from '@/mocks/handlers';
import { mockServer } from '@/mocks/node';

import { createUserAdminClient } from './users-client';

const SITE = 'https://kiraci.example.test';
const USER = 'ornek.calisan@example.test';
const READ = `${SITE}/api/method/platform_core.api.identity.get_user_role_profiles`;
const RECORD = `${SITE}/api/resource/User/${encodeURIComponent(USER)}`;

const config: ApiConfig = {
  siteUrl: SITE,
  credentials: 'same-origin',
  timeoutMs: 1_000,
  modelTimeoutMs: 2_000,
  keycloakUrl: 'https://kimlik.example.test',
  keycloakRealm: 'platform',
  aiRoute: 'ornek-rota',
  csrfMetaName: 'csrf-token',
};

function client() {
  const api = createApiClient({
    config,
    csrf: createCsrfStore(SAMPLE_CSRF_TOKEN),
    onSessionExpired: () => undefined,
  });
  return createUserAdminClient(api);
}

// The record as the server gives it to the "Tenant Admin" role: the two tables are empty.
const record = () =>
  HttpResponse.json({
    data: {
      name: USER,
      full_name: 'Örnek Çalışan',
      enabled: 1,
      last_login: null,
      role_profiles: [],
      roles: [],
    },
  });

beforeAll(() => mockServer.listen({ onUnhandledFrame: 'error' }));
afterEach(() => {
  mockServer.resetHandlers();
  resetMockState();
});
afterAll(() => mockServer.close());

describe('getUser (AJA-913)', () => {
  it('takes the role profiles from the narrow read, not from the record', async () => {
    const asked: URL[] = [];
    mockServer.use(
      http.get(RECORD, record),
      http.get(READ, ({ request }) => {
        asked.push(new URL(request.url));
        return HttpResponse.json({
          message: { user: USER, role_profiles: ['Satış Çalışanı'], roles: ['Sales User'] },
        });
      }),
    );

    const user = await client().getUser(USER);

    expect(user.roleProfiles).toEqual(['Satış Çalışanı']);
    expect(user.roles).toEqual(['Sales User']);
    expect(user.fullName).toBe('Örnek Çalışan');
    expect(asked).toHaveLength(1);
    expect([...asked[0]!.searchParams.entries()]).toEqual([['user', USER]]);
  });

  it('leaves the role profiles unknown when the server refuses the read', async () => {
    mockServer.use(
      http.get(RECORD, record),
      http.get(READ, () => HttpResponse.json({ exc_type: 'PermissionError' }, { status: 403 })),
    );

    const user = await client().getUser(USER);

    expect(user.name).toBe(USER);
    expect(user.roleProfiles).toBeUndefined();
    expect(user.roles).toBeUndefined();
  });

  it('fails when the narrow read fails for another reason', async () => {
    mockServer.use(
      http.get(RECORD, record),
      http.get(READ, () => HttpResponse.json({}, { status: 500 })),
    );

    await expect(client().getUser(USER)).rejects.toMatchObject({ kind: 'unknown' });
  });

  it('refuses an answer for another user', async () => {
    mockServer.use(
      http.get(RECORD, record),
      http.get(READ, () =>
        HttpResponse.json({
          message: { user: 'baska@example.test', role_profiles: [], roles: [] },
        }),
      ),
    );

    await expect(client().getUser(USER)).rejects.toThrow('invalid_response');
  });
});
