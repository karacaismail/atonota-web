// Sözleşmeye uygun sahte uçlar (SZ-12). Geliştirme ve testler gerçek arka uca bağlanmaz.
// Adresler `*/api/method/...` biçimindedir. Böylece her kökte çalışır.
import { http, HttpResponse, type JsonBodyType } from 'msw';

import { TOOL_RESULT_PREFIX } from '@/api/ai-protocol';

import {
  SAMPLE_PRESS_CSRF_TOKEN,
  SAMPLE_USER as SAMPLE_ACCOUNT,
  sampleAccessSummary,
  sampleLeaves,
  samplePressReauthUrl,
  SAMPLE_CSRF_TOKEN,
  SAMPLE_DOCTYPE_ETAG,
  SAMPLE_USER,
  sampleBootstrap,
  sampleCompletion,
  sampleDocTypeMeta,
  sampleDocuments,
  sampleLoginUrl,
  sampleLogoutUrl,
  sampleProposal,
  sampleTools,
} from './fixtures';

/** Sahte sunucunun durumu. Testler bu değerleri değiştirebilir. `resetMockState` ile sıfırlayın. */
export const mockState = {
  signedIn: true,
  proposals: new Map<string, ReturnType<typeof sampleProposal>>(),
  leaves: new Map(sampleLeaves.map((leave) => [leave.name, { ...leave }])),
  /** Press oturumu son 300 saniyede Keycloak ile yeniden doğrulandı mı? */
  pressReauthenticated: false,
};

export function resetMockState(): void {
  mockState.signedIn = true;
  mockState.proposals.clear();
  mockState.leaves = new Map(sampleLeaves.map((leave) => [leave.name, { ...leave }]));
  mockState.pressReauthenticated = false;
}

let versionCounter = 0;
function nextVersion(): string {
  versionCounter += 1;
  return `2026-11-23 10:00:00.${String(versionCounter).padStart(6, '0')}`;
}

function parseJsonParam(url: URL, key: string): unknown {
  const raw = url.searchParams.get(key);
  if (raw === null) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return Symbol.for('invalid');
  }
}

type Leave = (typeof sampleLeaves)[number];

function leaveMatches(leave: Leave, filters: unknown): boolean {
  if (filters === undefined) return true;
  if (Array.isArray(filters)) {
    return filters.every(
      (item) =>
        Array.isArray(item) &&
        item[0] === 'name' &&
        item[1] === 'in' &&
        Array.isArray(item[2]) &&
        (item[2] as unknown[]).includes(leave.name),
    );
  }
  if (typeof filters !== 'object' || filters === null) return false;
  return Object.entries(filters).every(
    ([key, value]) => (leave as Record<string, unknown>)[key] === value,
  );
}

const LEAVE_FIELDS = new Set([
  'name',
  'employee',
  'employee_name',
  'leave_type',
  'from_date',
  'to_date',
  'status',
  'docstatus',
  'modified',
  'total_leave_days',
  'leave_balance',
]);

const REDIRECT_PATTERN = /^\/(?!\/)[A-Za-z0-9\-._~/?#@!$&()*+,;=%:[\]]*$/;

function frappeError(status: number, excType: string, extra: Record<string, unknown> = {}) {
  return HttpResponse.json({ exc_type: excType, ...extra }, { status });
}

/** Oturumu ve CSRF başlığını sözleşmedeki gibi denetler. Sorun yoksa `undefined` döner. */
function guard(request: Request, { write }: { write: boolean }): Response | undefined {
  if (request.headers.has('Authorization')) return frappeError(403, 'PermissionError');
  if (!mockState.signedIn) return frappeError(401, 'SessionExpired', { session_expired: 1 });
  if (write && request.headers.get('X-Frappe-CSRF-Token') !== SAMPLE_CSRF_TOKEN) {
    return frappeError(400, 'CSRFTokenError');
  }
  return undefined;
}

function message(body: JsonBodyType, init?: ResponseInit) {
  return HttpResponse.json({ message: body }, init);
}

function rpcResult(id: unknown, result: JsonBodyType) {
  return HttpResponse.json({ jsonrpc: '2.0', id: id as string | number, result });
}

function toolCall(name: string, args: Record<string, unknown>) {
  if (name === 'plt_list_documents') {
    const structured = {
      documents: sampleDocuments,
      has_next_page: false,
      next_start: null,
      truncated: false,
      as_of: '2026-11-23T11:50:00+00:00',
      site: 'kiraci.example.test',
      source: String(args.doctype ?? ''),
    };
    return {
      content: [{ type: 'text', text: JSON.stringify(structured) }],
      structuredContent: structured,
      isError: false,
    };
  }
  if (name === 'plt_create_document') {
    const proposal = sampleProposal({ proposal_id: `ornek-oneri-${mockState.proposals.size + 1}` });
    mockState.proposals.set(proposal.proposal_id, proposal);
    const structured = {
      status: 'approval_required',
      proposal_id: proposal.proposal_id,
      preview: proposal.preview,
      expires_at: proposal.expires_at,
      created_at: proposal.created_at,
    };
    return {
      content: [{ type: 'text', text: JSON.stringify(structured) }],
      structuredContent: structured,
      isError: false,
    };
  }
  const denied = { error: { code: 'unknown_tool', message: 'Unknown tool.' } };
  return {
    content: [{ type: 'text', text: 'Unknown tool.' }],
    structuredContent: denied,
    isError: true,
  };
}

interface CompletionBody {
  messages?: { role: string; content: string }[];
}

/** Örnek model. Gerçek model değildir. Davranışı sabittir ve testler buna güvenir. */
function sampleModel(body: CompletionBody) {
  const messages = body.messages ?? [];
  const last = messages[messages.length - 1];
  const firstUser = messages.find((item) => item.role === 'user')?.content ?? '';
  if (last?.content.startsWith(TOOL_RESULT_PREFIX)) {
    return sampleCompletion({
      text: JSON.stringify({
        text: 'Örnek veri: istediğiniz kayıtlar hazır.',
        steps: [],
        ui: [{ type: 'table', columns: ['name', 'title'], rows: sampleDocuments }],
      }),
    });
  }
  if (firstUser.includes('oluştur')) {
    return sampleCompletion({
      tool_calls: [
        {
          id: 'cagri-1',
          name: 'plt_create_document',
          arguments: { doctype: 'Örnek Kayıt', data: { title: 'Örnek veri' } },
        },
      ],
    });
  }
  if (firstUser.includes('listele')) {
    return sampleCompletion({
      tool_calls: [
        { id: 'cagri-1', name: 'plt_list_documents', arguments: { doctype: 'Örnek Kayıt' } },
      ],
    });
  }
  return sampleCompletion({
    text: JSON.stringify({ text: 'Örnek veri: merhaba.', steps: [], ui: [] }),
  });
}

export const handlers = [
  http.get('*/api/method/frappe.auth.get_logged_user', () =>
    mockState.signedIn
      ? message(SAMPLE_USER)
      : frappeError(401, 'SessionExpired', { session_expired: 1 }),
  ),

  http.post('*/api/method/platform_core.api.auth.get_login_url', async ({ request }) => {
    const text = await request.text();
    const body = (text ? JSON.parse(text) : {}) as { redirect_to?: unknown };
    if (body.redirect_to !== undefined) {
      if (typeof body.redirect_to !== 'string' || !REDIRECT_PATTERN.test(body.redirect_to)) {
        return frappeError(400, 'InvalidRedirect');
      }
    }
    return message(sampleLoginUrl);
  }),

  http.post('*/api/method/platform_core.api.auth.logout', ({ request }) => {
    const denied = guard(request, { write: true });
    if (denied) return denied;
    mockState.signedIn = false;
    return message(sampleLogoutUrl);
  }),

  http.get('*/api/method/platform_core.api.shell.get_bootstrap', ({ request }) => {
    return guard(request, { write: false }) ?? message(sampleBootstrap);
  }),

  http.get('*/api/method/platform_core.api.meta.get_doctype', ({ request }) => {
    const denied = guard(request, { write: false });
    if (denied) return denied;
    const doctype = new URL(request.url).searchParams.get('doctype');
    if (doctype !== sampleDocTypeMeta.schema.name) return frappeError(403, 'PermissionError');
    if (request.headers.get('If-None-Match') === SAMPLE_DOCTYPE_ETAG) {
      return new HttpResponse(null, { status: 304, headers: { ETag: SAMPLE_DOCTYPE_ETAG } });
    }
    return message(sampleDocTypeMeta, { headers: { ETag: SAMPLE_DOCTYPE_ETAG } });
  }),

  http.post('*/api/method/platform_core.api.ai.mcp', async ({ request }) => {
    const denied = guard(request, { write: true });
    if (denied) return denied;
    const rpc = (await request.json()) as {
      id?: unknown;
      method?: string;
      params?: { name?: string; arguments?: Record<string, unknown> };
    };
    if (rpc.id === undefined) return new HttpResponse(null, { status: 202 });
    switch (rpc.method) {
      case 'tools/list':
        return rpcResult(rpc.id, { tools: sampleTools });
      case 'tools/call':
        return rpcResult(rpc.id, toolCall(rpc.params?.name ?? '', rpc.params?.arguments ?? {}));
      case 'ping':
        return rpcResult(rpc.id, {});
      default:
        return HttpResponse.json(
          {
            jsonrpc: '2.0',
            id: rpc.id as string | number,
            error: { code: -32601, message: 'Method not found' },
          },
          { status: 404 },
        );
    }
  }),

  http.get('*/api/method/platform_core.api.ai.list_proposals', ({ request }) => {
    const denied = guard(request, { write: false });
    if (denied) return denied;
    return message({
      proposals: [...mockState.proposals.values()].reverse(),
      has_next_page: false,
    });
  }),

  http.get('*/api/method/platform_core.api.ai.get_proposal', ({ request }) => {
    const denied = guard(request, { write: false });
    if (denied) return denied;
    const id = new URL(request.url).searchParams.get('proposal_id') ?? '';
    const proposal = mockState.proposals.get(id);
    return proposal ? message(proposal) : frappeError(404, 'DoesNotExistError');
  }),

  http.post('*/api/method/platform_core.api.ai.approve_proposal', async ({ request }) => {
    const denied = guard(request, { write: true });
    if (denied) return denied;
    const body = (await request.json()) as { proposal_id?: string; digest?: string };
    const proposal = mockState.proposals.get(body.proposal_id ?? '');
    if (!proposal) return frappeError(404, 'DoesNotExistError');
    if (proposal.status !== 'pending') {
      return message({ executed: false, deny_reason: 'not_pending', proposal });
    }
    if (body.digest !== proposal.digest) {
      return message({ executed: false, deny_reason: 'digest_mismatch', proposal });
    }
    const done = {
      ...proposal,
      status: 'consumed' as const,
      result: 'succeeded' as const,
      result_document: 'ORNEK-0003',
    };
    mockState.proposals.set(done.proposal_id, done);
    return message({ executed: true, deny_reason: null, proposal: done });
  }),

  http.post('*/api/method/platform_core.api.ai.reject_proposal', async ({ request }) => {
    const denied = guard(request, { write: true });
    if (denied) return denied;
    const body = (await request.json()) as { proposal_id?: string };
    const proposal = mockState.proposals.get(body.proposal_id ?? '');
    if (!proposal) return frappeError(404, 'DoesNotExistError');
    if (proposal.status !== 'pending') return frappeError(417, 'ValidationError');
    const rejected = { ...proposal, status: 'rejected' as const };
    mockState.proposals.set(rejected.proposal_id, rejected);
    return message(rejected);
  }),

  // HRMS izin başvuruları (hrms_tr sözleşmesi).
  http.get('*/api/resource/:doctype', ({ request, params }) => {
    const denied = guard(request, { write: false });
    if (denied) return denied;
    if (params.doctype !== 'Leave Application') return frappeError(403, 'PermissionError');
    const url = new URL(request.url);
    const fields = parseJsonParam(url, 'fields') ?? ['name'];
    const filters = parseJsonParam(url, 'filters');
    if (!Array.isArray(fields) || !fields.every((field) => LEAVE_FIELDS.has(String(field)))) {
      return frappeError(417, 'ValidationError');
    }
    if (typeof filters === 'symbol') return frappeError(417, 'ValidationError');
    const start = Number(url.searchParams.get('limit_start') ?? 0);
    const length = Number(url.searchParams.get('limit_page_length') ?? 20);
    let rows = [...mockState.leaves.values()].filter((leave) => leaveMatches(leave, filters));
    rows =
      url.searchParams.get('order_by') === 'name asc'
        ? rows.sort((a, b) => a.name.localeCompare(b.name))
        : rows.sort(
            (a, b) =>
              (b.modified ?? '').localeCompare(a.modified ?? '') || a.name.localeCompare(b.name),
          );
    const page = rows
      .slice(start, start + length)
      .map((leave) =>
        Object.fromEntries(
          fields.map((field) => [field, (leave as Record<string, unknown>)[String(field)]]),
        ),
      );
    return HttpResponse.json({ data: page as JsonBodyType });
  }),

  http.get('*/api/resource/:doctype/:name', ({ request, params }) => {
    const denied = guard(request, { write: false });
    if (denied) return denied;
    const leave =
      params.doctype === 'Leave Application'
        ? mockState.leaves.get(String(params.name))
        : undefined;
    return leave
      ? HttpResponse.json({ data: leave as JsonBodyType })
      : frappeError(404, 'DoesNotExistError');
  }),

  http.post('*/api/method/hrms_tr.api.approve_leave', async ({ request }) => {
    const denied = guard(request, { write: true });
    if (denied) return denied;
    const body = (await request.json()) as { name?: string; version?: string };
    const leave = mockState.leaves.get(body.name ?? '');
    if (!leave) return frappeError(404, 'DoesNotExistError');
    if (body.version !== leave.modified) return frappeError(417, 'TimestampMismatchError');
    if (leave.docstatus !== 0 || leave.status !== 'Open')
      return frappeError(417, 'ValidationError');
    mockState.leaves.set(leave.name, {
      ...leave,
      status: 'Approved',
      docstatus: 1,
      modified: nextVersion(),
    });
    return message({ name: leave.name });
  }),

  http.post('*/api/method/hrms_tr.api.cancel_leave', async ({ request }) => {
    const denied = guard(request, { write: true });
    if (denied) return denied;
    const body = (await request.json()) as { name?: string; version?: string };
    const leave = mockState.leaves.get(body.name ?? '');
    if (!leave) return frappeError(404, 'DoesNotExistError');
    if (body.version !== leave.modified) return frappeError(417, 'TimestampMismatchError');
    if (leave.docstatus !== 1) return frappeError(417, 'ValidationError');
    mockState.leaves.set(leave.name, {
      ...leave,
      status: 'Cancelled',
      docstatus: 2,
      modified: nextVersion(),
    });
    return message({ name: leave.name });
  }),

  // Erişim kuralı motoru (platform_core-access sözleşmesi).
  http.get('*/api/method/platform_core.api.access.explain_permission', ({ request }) => {
    const denied = guard(request, { write: false });
    if (denied) return denied;
    const url = new URL(request.url);
    const doctype = url.searchParams.get('doctype');
    const name = url.searchParams.get('name') ?? '';
    const ptype = url.searchParams.get('ptype') ?? 'read';
    const user = url.searchParams.get('user') ?? SAMPLE_ACCOUNT;
    if (!['read', 'write', 'create', 'delete', 'submit', 'cancel'].includes(ptype)) {
      return frappeError(417, 'ValidationError');
    }
    if (doctype !== sampleAccessSummary.doctype || user !== SAMPLE_ACCOUNT) {
      return frappeError(403, 'PermissionError');
    }
    const allowed = name === 'ORNEK-0001';
    return message({
      doctype,
      name,
      ptype,
      user,
      allowed,
      reason: allowed ? 'allowed' : 'not_permitted_or_missing',
      governed: true,
      layers: { role: true, access_rule: allowed, share: false },
      rules: [],
    });
  }),

  http.get('*/api/method/platform_core.api.access.get_access_summary', ({ request }) => {
    const denied = guard(request, { write: false });
    if (denied) return denied;
    const doctype = new URL(request.url).searchParams.get('doctype');
    return doctype === sampleAccessSummary.doctype
      ? message(sampleAccessSummary)
      : frappeError(403, 'PermissionError');
  }),

  // Press hesap silme (press_tr sözleşmesi). Press ayrı köktür ve kendi CSRF belirtecini ister.
  http.post('*/api/method/press_tr.api.account.request_deletion', async ({ request }) => {
    if (request.headers.has('Authorization')) return frappeError(403, 'PermissionError');
    if (request.headers.get('X-Frappe-CSRF-Token') !== SAMPLE_PRESS_CSRF_TOKEN) {
      return frappeError(400, 'CSRFTokenError');
    }
    const body = (await request.json()) as { confirm?: unknown };
    if (typeof body.confirm !== 'boolean') return frappeError(417, 'ValidationError');
    if (!body.confirm) return message({ url: samplePressReauthUrl });
    if (!mockState.pressReauthenticated) return frappeError(403, 'PermissionError');
    return message({ submitted: true });
  }),

  http.post('*/api/method/platform_core.api.model.complete', async ({ request }) => {
    const denied = guard(request, { write: true });
    if (denied) return denied;
    return message(sampleModel((await request.json()) as CompletionBody));
  }),
];
