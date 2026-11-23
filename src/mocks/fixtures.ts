// Sahte sunucunun örnek verisi. Bütün değerler örnektir (SZ-12).
// Türler sözleşmeden üretilir. Sözleşme değişirse tür denetimi bu dosyada hata verir.
import type { components as HrmsComponents } from '@/api/generated/hrms_tr';
import type { components as AccessComponents } from '@/api/generated/platform_core-access';
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

/** Başka kökenli çıkış adresi. Panel bu adrese gitmez. Senaryo `cikis-yabanci-adres` bunu verir. */
export const FOREIGN_LOGOUT_URL =
  'https://baska.example.test/realms/platform/protocol/openid-connect/logout?client_id=site-tenant1';

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

// HRMS izin başvuruları. Bütün değerler örnektir.
type LeaveApplication = HrmsComponents['schemas']['LeaveApplication'];
type AccessSummary = AccessComponents['schemas']['AccessSummary'];

export const sampleLeaves: LeaveApplication[] = [
  {
    name: 'ORNEK-IZIN-0001',
    employee: 'ORNEK-CALISAN-01',
    employee_name: 'Örnek Kişi',
    leave_type: 'Örnek Yıllık İzin',
    from_date: '2026-11-24',
    to_date: '2026-11-25',
    status: 'Open',
    docstatus: 0,
    modified: '2026-11-22 09:00:00.000001',
    total_leave_days: 2,
  },
  {
    name: 'ORNEK-IZIN-0002',
    employee: 'ORNEK-CALISAN-02',
    employee_name: 'Örnek Kişi 2',
    leave_type: 'Örnek Yıllık İzin',
    from_date: '2026-12-01',
    to_date: '2026-12-01',
    status: 'Approved',
    docstatus: 1,
    modified: '2026-11-22 09:05:00.000001',
    total_leave_days: 1,
  },
];

export const sampleAccessSummary: AccessSummary = {
  doctype: 'Örnek Kayıt',
  governed: true,
  operations: {
    read: ['own', 'team'],
    write: ['own'],
    create: ['own'],
    delete: [],
    submit: [],
    cancel: [],
  },
};

// Telefon ve PWA kurulumları. Kimlikler örnektir.
export const sampleInstallations = [
  {
    installation_id: '20000000-0000-4000-8000-000000000001',
    scope: 'mobile' as const,
    revoked: false,
  },
  {
    installation_id: '30000000-0000-4000-8000-000000000001',
    scope: 'pwa' as const,
    revoked: false,
  },
  {
    installation_id: '40000000-0000-4000-8000-000000000001',
    scope: 'mobile' as const,
    revoked: true,
  },
];

// Press ayrı bir köktür. Panel yalnız Press'in hesap silme sayfasına yönlendirir.
export const SAMPLE_PRESS_URL = 'https://press.example.test';

// views-collection için örnek kayıtlar (Frappe API v2 liste ucu).
export const SAMPLE_COLLECTION_DOCTYPE = sampleDocTypeMeta.schema.name;
/** Bu kayıt türü için sahte sunucu yetki reddi verir. */
export const RESTRICTED_SAMPLE_DOCTYPE = 'Gizli Örnek Kayıt';

export const sampleCollection = Array.from({ length: 23 }, (_unused, index) => {
  const number = index + 1;
  return {
    name: `ORNEK-${String(number).padStart(4, '0')}`,
    title: `Örnek veri ${number}`,
    status: number % 3 === 0 ? 'Kapalı' : 'Açık',
    amount: number * 25,
    modified: `2026-11-${String(1 + (number % 22)).padStart(2, '0')} 09:00:00.000000`,
  };
});
