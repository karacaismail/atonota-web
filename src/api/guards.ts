// Yanıtları ekrandan önce denetleyen işlevler (SZ-4, TS-5).
// Dış veri `unknown` sayılır. Yalnız kullanılan alanlar denetlenir.
import type { components as HrmsComponents } from './generated/hrms_tr';
import type { components as AccessComponents } from './generated/platform_core-access';
import type { components as AiComponents } from './generated/platform_core-ai';
import type { components as IdentityComponents } from './generated/platform_core-identity';
import type { components as GatewayComponents } from './generated/platform_core-model-gateway';
import type { components as ShellComponents } from './generated/platform_core-shell';

export type LoginUrl = IdentityComponents['schemas']['LoginUrl'];
export type LogoutUrl = IdentityComponents['schemas']['LogoutUrl'];
export type Bootstrap = ShellComponents['schemas']['Bootstrap'];
export type DocTypeMeta = ShellComponents['schemas']['Meta'];
export type Proposal = AiComponents['schemas']['Proposal'];
export type ApprovalOutcome = AiComponents['schemas']['ApprovalOutcome'];
export type CompletionRequest = GatewayComponents['schemas']['Completion'];
export type CompletionResult = GatewayComponents['schemas']['Result'];
export type JsonRpcResponse = AiComponents['schemas']['JsonRpcResponse'];

export type Guard<T> = (value: unknown) => value is T;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

/** Frappe yanıt zarfını açar: `{ "message": ... }`. */
export function readMessage(body: unknown): unknown {
  return isRecord(body) ? body.message : undefined;
}

export const isUserName: Guard<string> = (value): value is string =>
  isString(value) && value.length > 0;

export const isLoginUrl: Guard<LoginUrl> = (value): value is LoginUrl =>
  isRecord(value) &&
  isString(value.login_url) &&
  isString(value.brand_name) &&
  isString(value.label);

export const isLogoutUrl: Guard<LogoutUrl> = (value): value is LogoutUrl =>
  isRecord(value) && isString(value.logout_url);

function isOptional(value: unknown, check: (item: unknown) => boolean): boolean {
  return value === undefined || check(value);
}

function isNullable(check: (item: unknown) => boolean) {
  return (value: unknown) => value === null || check(value);
}

const isFlag = isNullable((value) => typeof value === 'number' || typeof value === 'boolean');
const isNullableNumber = isNullable((value) => typeof value === 'number');
const isFilterValue = isNullable(
  (value) => typeof value === 'string' || Array.isArray(value) || isRecord(value),
);

const SIDEBAR_ITEM_TEXT = ['icon', 'label', 'link_to', 'link_type', 'tab', 'type', 'url'];
const SIDEBAR_ITEM_FLAGS = [
  'child',
  'collapsible',
  'derived',
  'hidden',
  'is_default_module',
  'keep_closed',
  'open_in_new_tab',
  'show_arrow',
];

function isSidebarItem(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    SIDEBAR_ITEM_TEXT.every((key) => isOptional(value[key], isNullableString)) &&
    SIDEBAR_ITEM_FLAGS.every((key) => isOptional(value[key], isFlag)) &&
    isOptional(value.key, isString) &&
    isOptional(value.indent, isNullableNumber) &&
    isOptional(value.filters, isFilterValue) &&
    isOptional(value.route_options, isFilterValue) &&
    isOptional(
      value.report,
      (report) =>
        isRecord(report) &&
        isOptional(report.ref_doctype, isNullableString) &&
        isOptional(report.report_type, isNullableString),
    )
  );
}

function isSidebar(value: unknown): boolean {
  if (!isRecord(value) || !isString(value.name) || !isRecord(value.data)) return false;
  const data = value.data;
  return (
    ['app', 'header_icon', 'module', 'module_onboarding'].every((key) =>
      isOptional(data[key], isNullableString),
    ) &&
    ['computed', 'customized'].every((key) => isOptional(data[key], isFlag)) &&
    isOptional(data.label, isString) &&
    isOptional(data.name, isString) &&
    isOptional(data.workspaces, isStringArray) &&
    isOptional(data.items, (items) => Array.isArray(items) && items.every(isSidebarItem))
  );
}

function isWorkspace(value: unknown): boolean {
  return (
    isRecord(value) &&
    isString(value.name) &&
    isString(value.title) &&
    isNullableString(value.app) &&
    isNullableString(value.icon) &&
    isNullableString(value.module) &&
    isNullableString(value.parent_page)
  );
}

function isFormatting(value: unknown): boolean {
  return (
    isRecord(value) &&
    isNullableString(value.currency) &&
    isString(value.number_format) &&
    isString(value.rounding_method) &&
    isString(value.time_zone)
  );
}

/** Açılış verisini liste öğeleriyle birlikte denetler. Menü bozuksa yanıt reddedilir. */
export const isBootstrap: Guard<Bootstrap> = (value): value is Bootstrap => {
  if (!isRecord(value)) return false;
  const { user } = value;
  return (
    isRecord(user) &&
    isString(user.name) &&
    isString(user.full_name) &&
    isString(user.language) &&
    isStringArray(user.roles) &&
    isFormatting(value.formatting) &&
    isStringArray(value.installed_apps) &&
    Array.isArray(value.sidebars) &&
    value.sidebars.every(isSidebar) &&
    Array.isArray(value.workspaces) &&
    value.workspaces.every(isWorkspace) &&
    isString(value.meta_hash) &&
    isString(value.perm_version) &&
    isOptional(value.truncated, (flag) => flag === true)
  );
};

function isDocTypeSchema(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    isString(value.name) &&
    (value.sensitivity === 'standard' || value.sensitivity === 'restricted') &&
    Array.isArray(value.fields) &&
    value.fields.every(
      (field) =>
        isRecord(field) &&
        isString(field.fieldname) &&
        isString(field.fieldtype) &&
        isNullableString(field.component) &&
        typeof field.read_only === 'boolean' &&
        (field.sensitivity === 'standard' || field.sensitivity === 'restricted'),
    )
  );
}

export const isDocTypeMeta: Guard<DocTypeMeta> = (value): value is DocTypeMeta =>
  isRecord(value) &&
  isDocTypeSchema(value.schema) &&
  isRecord(value.child_tables) &&
  Object.values(value.child_tables).every(isDocTypeSchema) &&
  typeof value.catalog_version === 'number' &&
  isString(value.meta_hash) &&
  isString(value.perm_version) &&
  typeof value.mobile_cache_allowed === 'boolean';

const PROPOSAL_STATUSES = new Set(['pending', 'rejected', 'expired', 'consumed']);
const PROPOSAL_RESULTS = new Set(['', 'unknown', 'succeeded', 'failed']);
const PREVIEW_ACTIONS = new Set([
  'create',
  'update',
  'submit',
  'cancel',
  'delete',
  'app_tool',
  'admin',
]);

export function isPreview(value: unknown): boolean {
  return (
    isRecord(value) &&
    isString(value.action) &&
    PREVIEW_ACTIONS.has(value.action) &&
    isString(value.summary) &&
    (value.changes === undefined ||
      (Array.isArray(value.changes) &&
        value.changes.every(
          (change) => isRecord(change) && isString(change.fieldname) && 'new' in change,
        )))
  );
}

export const isProposal: Guard<Proposal> = (value): value is Proposal =>
  isRecord(value) &&
  isString(value.proposal_id) &&
  isString(value.status) &&
  PROPOSAL_STATUSES.has(value.status) &&
  isString(value.result) &&
  PROPOSAL_RESULTS.has(value.result) &&
  isString(value.tool) &&
  typeof value.destructive === 'boolean' &&
  typeof value.billable === 'boolean' &&
  isPreview(value.preview) &&
  isString(value.digest) &&
  /^[0-9a-f]{64}$/.test(value.digest) &&
  isString(value.expires_at) &&
  isString(value.created_at);

export const isProposalList: Guard<{ proposals: Proposal[]; has_next_page: boolean }> = (
  value,
): value is { proposals: Proposal[]; has_next_page: boolean } =>
  isRecord(value) &&
  Array.isArray(value.proposals) &&
  value.proposals.every(isProposal) &&
  typeof value.has_next_page === 'boolean';

export const isApprovalOutcome: Guard<ApprovalOutcome> = (value): value is ApprovalOutcome =>
  isRecord(value) &&
  typeof value.executed === 'boolean' &&
  (value.deny_reason === undefined || isNullableString(value.deny_reason)) &&
  isProposal(value.proposal);

export const isCompletionResult: Guard<CompletionResult> = (value): value is CompletionResult =>
  isRecord(value) &&
  isString(value.text) &&
  Array.isArray(value.tool_calls) &&
  value.tool_calls.every(
    (call) =>
      isRecord(call) && isString(call.id) && isString(call.name) && isRecord(call.arguments),
  ) &&
  isRecord(value.usage) &&
  isString(value.model) &&
  isString(value.api);

export const isJsonRpcResponse: Guard<JsonRpcResponse> = (value): value is JsonRpcResponse =>
  isRecord(value) &&
  value.jsonrpc === '2.0' &&
  (value.result === undefined || isRecord(value.result)) &&
  (value.error === undefined ||
    (isRecord(value.error) &&
      typeof value.error.code === 'number' &&
      isString(value.error.message)));

// HRMS izin başvuruları (hrms_tr sözleşmesi).
export type LeaveApplication = HrmsComponents['schemas']['LeaveApplication'];
export type LeaveName = HrmsComponents['schemas']['LeaveName'];

const LEAVE_STATUSES = new Set(['Open', 'Approved', 'Rejected', 'Cancelled']);
const LEAVE_TEXT_FIELDS = [
  'employee',
  'employee_name',
  'company',
  'leave_approver',
  'leave_type',
  'from_date',
  'to_date',
  'description',
  'amended_from',
];

export const isLeaveApplication: Guard<LeaveApplication> = (value): value is LeaveApplication =>
  isRecord(value) &&
  isString(value.name) &&
  LEAVE_TEXT_FIELDS.every((key) => isOptional(value[key], isNullableString)) &&
  isOptional(
    value.status,
    (status) => status === null || (isString(status) && LEAVE_STATUSES.has(status)),
  ) &&
  isOptional(
    value.docstatus,
    (docstatus) => docstatus === 0 || docstatus === 1 || docstatus === 2,
  ) &&
  isOptional(value.modified, isString) &&
  isOptional(value.total_leave_days, isNullableNumber) &&
  isOptional(value.leave_balance, isNullableNumber);

export const isLeaveList: Guard<LeaveApplication[]> = (value): value is LeaveApplication[] =>
  Array.isArray(value) && value.every(isLeaveApplication);

export const isLeaveName: Guard<LeaveName> = (value): value is LeaveName =>
  isRecord(value) && isString(value.name) && value.name.length > 0;

// Erişim kuralı motoru (platform_core-access sözleşmesi).
export type AccessScope = AccessComponents['schemas']['Scope'];
export type PermissionExplanation = AccessComponents['schemas']['Explanation'];
export type AccessSummary = AccessComponents['schemas']['AccessSummary'];
export type PermissionType = PermissionExplanation['ptype'];

const SCOPES = new Set(['own', 'team', 'department', 'company', 'all']);
const PERMISSION_TYPES = ['read', 'write', 'create', 'delete', 'submit', 'cancel'];
const EXPLANATION_REASONS = new Set([
  'allowed',
  'allowed_by_share',
  'no_role_permission',
  'no_matching_rule',
  'user_permission',
  'not_permitted_or_missing',
]);

function isScope(value: unknown): boolean {
  return isString(value) && SCOPES.has(value);
}

export const isPermissionExplanation: Guard<PermissionExplanation> = (
  value,
): value is PermissionExplanation =>
  isRecord(value) &&
  isString(value.doctype) &&
  isString(value.name) &&
  isString(value.ptype) &&
  PERMISSION_TYPES.includes(value.ptype) &&
  isString(value.user) &&
  typeof value.allowed === 'boolean' &&
  isString(value.reason) &&
  EXPLANATION_REASONS.has(value.reason) &&
  typeof value.governed === 'boolean' &&
  isRecord(value.layers) &&
  typeof value.layers.role === 'boolean' &&
  typeof value.layers.access_rule === 'boolean' &&
  typeof value.layers.share === 'boolean' &&
  Array.isArray(value.rules) &&
  value.rules.every(
    (rule) =>
      isRecord(rule) &&
      isString(rule.name) &&
      isString(rule.title) &&
      isString(rule.role) &&
      isScope(rule.scope) &&
      typeof rule.applies === 'boolean' &&
      typeof rule.matches === 'boolean',
  );

export const isAccessSummary: Guard<AccessSummary> = (value): value is AccessSummary => {
  if (!isRecord(value) || !isString(value.doctype) || typeof value.governed !== 'boolean') {
    return false;
  }
  const operations = value.operations;
  return (
    isRecord(operations) &&
    Object.keys(operations).every((key) => PERMISSION_TYPES.includes(key)) &&
    PERMISSION_TYPES.every(
      (key) => Array.isArray(operations[key]) && (operations[key] as unknown[]).every(isScope),
    )
  );
};

// Press hesap silme (press_tr sözleşmesi).
export type DeletionMessage = { url: string } | { submitted: true } | { pending: true };

export const isDeletionMessage: Guard<DeletionMessage> = (value): value is DeletionMessage =>
  isRecord(value) && (isString(value.url) || value.submitted === true || value.pending === true);
