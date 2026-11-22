// Sahte sunucunun örnek verisi. Bütün değerler örnektir (SZ-12).
// Türler sözleşmeden üretilir. Sözleşme değişirse tür denetimi bu dosyada hata verir.
import type { components as AiComponents } from '@/api/generated/platform_core-ai';
import type { components as IdentityComponents } from '@/api/generated/platform_core-identity';
import type { components as GatewayComponents } from '@/api/generated/platform_core-model-gateway';
import type { components as ShellComponents } from '@/api/generated/platform_core-shell';

type Bootstrap = ShellComponents['schemas']['Bootstrap'];
type Meta = ShellComponents['schemas']['Meta'];
type LoginUrl = IdentityComponents['schemas']['LoginUrl'];
type LogoutUrl = IdentityComponents['schemas']['LogoutUrl'];
type Proposal = AiComponents['schemas']['Proposal'];
type GatewayResult = GatewayComponents['schemas']['Result'];

export const SAMPLE_USER = 'ornek.kisi@example.test';
export const SAMPLE_CSRF_TOKEN = 'ornek-csrf-belirteci';
export const SAMPLE_KEYCLOAK_URL = 'https://kimlik.example.test';
export const SAMPLE_DIGEST = 'a'.repeat(64);

export const sampleLoginUrl: LoginUrl = {
  login_url:
    `${SAMPLE_KEYCLOAK_URL}/realms/platform/protocol/openid-connect/auth` +
    '?client_id=site-tenant1&response_type=code&scope=openid&state=ornek&nonce=ornek' +
    '&code_challenge=ornek&code_challenge_method=S256' +
    '&redirect_uri=https%3A%2F%2Fkiraci.example.test%2Fapi%2Fmethod%2Fplatform_core.api.auth.keycloak_callback',
  brand_name: 'Atonota',
  label: 'Atonota ile oturum aç',
};

export const sampleLogoutUrl: LogoutUrl = {
  logout_url: `${SAMPLE_KEYCLOAK_URL}/realms/platform/protocol/openid-connect/logout?client_id=site-tenant1`,
};

export const sampleBootstrap: Bootstrap = {
  formatting: {
    currency: 'TRY',
    number_format: '#.###,##',
    rounding_method: "Banker's Rounding",
    time_zone: 'Europe/Istanbul',
  },
  installed_apps: ['frappe', 'platform_core'],
  meta_hash: 'b'.repeat(64),
  perm_version: 'c'.repeat(64),
  sidebars: [],
  user: {
    full_name: 'Örnek Kişi',
    language: 'tr',
    name: SAMPLE_USER,
    roles: ['Employee'],
  },
  workspaces: [
    {
      app: 'platform_core',
      icon: null,
      module: 'Örnek',
      name: 'Örnek Çalışma Alanı',
      parent_page: null,
      title: 'Örnek Çalışma Alanı',
    },
  ],
};

export const sampleDocTypeMeta: Meta = {
  catalog_version: 2,
  child_tables: {},
  meta_hash: 'd'.repeat(64),
  mobile_cache_allowed: false,
  perm_version: 'e'.repeat(64),
  schema: {
    name: 'Örnek Kayıt',
    module: 'Örnek',
    sensitivity: 'standard',
    title_field: 'title',
    search_fields: 'title',
    sort_field: null,
    fields: [
      {
        fieldname: 'title',
        fieldtype: 'Data',
        label: 'Örnek başlık',
        read_only: false,
        reqd: true,
        component: 'input',
        sensitivity: 'standard',
      },
    ],
  },
};

export const SAMPLE_DOCTYPE_ETAG = '"ornek-etag-1"';

export function sampleProposal(overrides: Partial<Proposal> = {}): Proposal {
  return {
    proposal_id: 'ornek-oneri-1',
    status: 'pending',
    result: '',
    tool: 'plt_create_document',
    target_doctype: 'Örnek Kayıt',
    target_name: null,
    destructive: false,
    billable: false,
    preview: {
      action: 'create',
      summary: 'Yeni bir örnek kayıt açılacak.',
      changes: [{ fieldname: 'title', label: 'Örnek başlık', new: 'Örnek veri' }],
    },
    digest: SAMPLE_DIGEST,
    expires_at: '2026-11-23T12:00:00+00:00',
    created_at: '2026-11-23T11:50:00+00:00',
    result_document: null,
    error: null,
    ...overrides,
  };
}

export const sampleDocuments = [
  { name: 'ORNEK-0001', title: 'Örnek veri 1' },
  { name: 'ORNEK-0002', title: 'Örnek veri 2' },
];

export const sampleTools = [
  {
    name: 'plt_list_documents',
    description: 'List documents the user may read.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['doctype'],
      properties: { doctype: { type: 'string', minLength: 1 } },
    },
  },
  {
    name: 'plt_create_document',
    description: 'Propose a new document. Nothing is written until a human approves the proposal.',
    annotations: { readOnlyHint: false, destructiveHint: false },
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['doctype', 'data'],
      properties: { doctype: { type: 'string', minLength: 1 }, data: { type: 'object' } },
    },
  },
];

export function sampleCompletion(overrides: Partial<GatewayResult> = {}): GatewayResult {
  return {
    text: '',
    tool_calls: [],
    usage: { input: 12, output: 8 },
    model: 'ornek-model',
    api: 'ornek-api',
    ...overrides,
  };
}
