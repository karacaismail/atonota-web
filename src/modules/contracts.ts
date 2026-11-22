/** View projections of the copied OpenAPI contracts. Network ownership stays in src/api. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
export function object(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) throw new Error('invalid_response');
  return value;
}
export function text(value: unknown): string {
  if (typeof value !== 'string') throw new Error('invalid_response');
  return value;
}
function boolean(value: unknown): boolean {
  if (typeof value !== 'boolean') throw new Error('invalid_response');
  return value;
}
function choice<const T extends string>(value: unknown, values: readonly T[]): T {
  const found = values.find((item) => item === value);
  if (found === undefined) throw new Error('invalid_response');
  return found;
}
function dateTime(value: unknown): string {
  const result = text(value);
  if (!/(Z|[+-]\d{2}:\d{2})$/.test(result) || !Number.isFinite(Date.parse(result)))
    throw new Error('invalid_response');
  return result;
}
function array<T>(value: unknown, parse: (item: unknown) => T): T[] {
  if (!Array.isArray(value)) throw new Error('invalid_response');
  return value.map(parse);
}
export interface Leave {
  name: string;
  employee_name?: string | null;
  leave_type?: string | null;
  from_date?: string | null;
  to_date?: string | null;
  status?: 'Open' | 'Approved' | 'Rejected' | 'Cancelled' | null;
  docstatus?: number;
  modified?: string;
  total_leave_days?: number | null;
}
export function parseLeave(value: unknown): Leave {
  const source = object(value);
  const result: Leave = { name: text(source['name']) };
  const keys: ('employee_name' | 'leave_type' | 'from_date' | 'to_date')[] = [
    'employee_name',
    'leave_type',
    'from_date',
    'to_date',
  ];
  for (const key of keys)
    if (key in source) result[key] = source[key] === null ? null : text(source[key]);
  if ('status' in source)
    result.status =
      source['status'] === null
        ? null
        : choice(source['status'], ['Open', 'Approved', 'Rejected', 'Cancelled']);
  if ('modified' in source) result.modified = text(source['modified']);
  if ('docstatus' in source) {
    const status = source['docstatus'];
    if (status !== 0 && status !== 1 && status !== 2) throw new Error('invalid_response');
    result.docstatus = status;
  }
  if ('total_leave_days' in source) {
    const days = source['total_leave_days'];
    if (days !== null && (typeof days !== 'number' || !Number.isFinite(days)))
      throw new Error('invalid_response');
    result.total_leave_days = days;
  }
  return result;
}
export const parseLeaveList = (value: unknown) => array(value, parseLeave);
export function leaveCommand(leave: Leave, action: 'approve' | 'cancel') {
  if (!leave.modified || !leave.name || leave.name.length > 140 || leave.modified.length > 40)
    throw new Error('version_required');
  if (action === 'approve' && (leave.status !== 'Open' || leave.docstatus !== 0))
    throw new Error('invalid_state');
  if (action === 'cancel' && leave.docstatus !== 1) throw new Error('invalid_state');
  return { name: leave.name, version: leave.modified };
}
export function deletionState(value: unknown): 'pending' | 'submitted' | 'reauthenticate' {
  const data = object(value);
  const matches =
    Number(data['pending'] === true) +
    Number(data['submitted'] === true) +
    Number(typeof data['url'] === 'string');
  if (matches !== 1) throw new Error('invalid_response');
  if (data['pending'] === true) return 'pending';
  if (data['submitted'] === true) return 'submitted';
  return 'reauthenticate';
}
export function safeIdentityUrl(value: unknown, realmUrl: string): string {
  const url = new URL(text(value));
  const realm = new URL(realmUrl);
  const prefix = realm.pathname.endsWith('/') ? realm.pathname : `${realm.pathname}/`;
  if (
    realm.protocol !== 'https:' ||
    url.protocol !== 'https:' ||
    url.origin !== realm.origin ||
    !url.pathname.startsWith(prefix) ||
    url.username ||
    url.password
  )
    throw new Error('invalid_response');
  return url.href;
}
export function parseProposal(value: unknown) {
  const source = object(value);
  const preview = object(source['preview']);
  const digest = text(source['digest']);
  if (!/^[0-9a-f]{64}$/.test(digest)) throw new Error('invalid_response');
  return {
    proposal_id: text(source['proposal_id']),
    status: choice(source['status'], ['pending', 'rejected', 'expired', 'consumed']),
    result: choice(source['result'], ['', 'unknown', 'succeeded', 'failed']),
    tool: text(source['tool']),
    digest,
    created_at: dateTime(source['created_at']),
    expires_at: dateTime(source['expires_at']),
    destructive: boolean(source['destructive']),
    billable: boolean(source['billable']),
    preview: {
      action: choice(preview['action'], [
        'create',
        'update',
        'submit',
        'cancel',
        'delete',
        'app_tool',
        'admin',
      ]),
      summary: text(preview['summary']),
      changes:
        preview['changes'] === undefined
          ? []
          : array(preview['changes'], (item) => {
              const change = object(item);
              if (!('new' in change)) throw new Error('invalid_response');
              return {
                fieldname: text(change['fieldname']),
                label:
                  typeof change['label'] === 'string' ? change['label'] : text(change['fieldname']),
                old: change['old'],
                new: change['new'],
              };
            }),
      details: preview['details'] === undefined ? undefined : object(preview['details']),
    },
  };
}
export type Proposal = ReturnType<typeof parseProposal>;
export function parseProposalList(value: unknown) {
  const source = object(value);
  return {
    proposals: array(source['proposals'], parseProposal),
    has_next_page: boolean(source['has_next_page']),
  };
}
export function parseApproval(value: unknown) {
  const source = object(value);
  return {
    executed: boolean(source['executed']),
    proposal: parseProposal(source['proposal']),
    deny_reason:
      source['deny_reason'] === undefined || source['deny_reason'] === null
        ? undefined
        : text(source['deny_reason']),
  };
}
export function proposalCanRun(proposal: Proposal, now = Date.now()): boolean {
  return (
    proposal.status === 'pending' && proposal.result === '' && Date.parse(proposal.expires_at) > now
  );
}
export function parseExplanation(value: unknown) {
  const source = object(value);
  const layers = object(source['layers']);
  return {
    doctype: text(source['doctype']),
    name: text(source['name']),
    user: text(source['user']),
    ptype: choice(source['ptype'], ['read', 'write', 'create', 'delete', 'submit', 'cancel']),
    allowed: boolean(source['allowed']),
    governed: boolean(source['governed']),
    reason: choice(source['reason'], [
      'allowed',
      'allowed_by_share',
      'no_role_permission',
      'no_matching_rule',
      'user_permission',
      'not_permitted_or_missing',
    ]),
    layers: {
      role: boolean(layers['role']),
      access_rule: boolean(layers['access_rule']),
      share: boolean(layers['share']),
    },
    rules: array(source['rules'], (item) => {
      const rule = object(item);
      return {
        name: text(rule['name']),
        title: text(rule['title']),
        role: text(rule['role']),
        scope: choice(rule['scope'], ['own', 'team', 'department', 'company', 'all']),
        applies: boolean(rule['applies']),
        matches: boolean(rule['matches']),
      };
    }),
  };
}
export function displayValue(value: unknown): string {
  if (value === undefined) return '';
  if (typeof value === 'string') return value;
  return JSON.stringify(value) ?? '';
}
