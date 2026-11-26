import { formatRecordMessage } from './messages';
import { SchemaValidationError } from './schema';
import type {
  DocTypeMeta,
  NewRecordContext,
  PrefillSource,
  RecordDocument,
  RecordLocale,
} from './types';

const LEAVE_SOURCES = {
  employee: 'Employee',
  employee_name: 'Employee',
  leave_type: 'Leave Type',
  leave_balance: 'Leave Ledger Entry',
} as const;

function object(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new SchemaValidationError('Expected leave context object', '$.message');
  }
  return value as Record<string, unknown>;
}

/** Validate the generated contract at the runtime boundary too. */
export function validateNewRecordContext(input: unknown): NewRecordContext {
  const message = object(object(input)['message']);
  const sources = object(message['sources']);
  for (const [field, expectedSource] of Object.entries(LEAVE_SOURCES)) {
    const value = message[field];
    const validValue =
      value === null ||
      (field === 'leave_balance'
        ? typeof value === 'number' && Number.isFinite(value)
        : typeof value === 'string' && value.trim().length > 0);
    if (!validValue || (sources[field] !== null && sources[field] !== expectedSource)) {
      throw new SchemaValidationError(
        'Invalid leave context value or source',
        `$.message.${field}`,
      );
    }
  }
  // Every required value and source above was checked against the generated contract.
  return message as NewRecordContext;
}

/** Only metadata-visible fields are populated. Never copy another application's balance. */
export function applyNewRecordContext(
  meta: DocTypeMeta,
  initial: RecordDocument,
  context: NewRecordContext | undefined,
) {
  if (meta.schema.name !== 'Leave Application') return { meta, record: initial };
  const record = { ...initial };
  const prefillSources: Record<string, PrefillSource> = {};
  const fields = meta.schema.fields.map((field) => {
    const key = field.fieldname;
    if (!Object.hasOwn(LEAVE_SOURCES, key)) return field;
    const contextKey = key as keyof typeof LEAVE_SOURCES;
    const value = context?.[contextKey];
    const source = context?.sources[contextKey];
    // No context or source means no default, including metadata's stale defaults.
    record[key] = value != null && source ? value : null;
    if (value != null && source) prefillSources[key] = source;
    // Keep metadata's numeric type when present. Data controls use string values.
    if (typeof record[key] === 'number' && field.fieldtype === 'Data') {
      record[key] = String(record[key]);
    }
    return key === 'leave_balance' ? { ...field, read_only: true } : field;
  });
  return { meta: { ...meta, schema: { ...meta.schema, fields } }, record, prefillSources };
}

export function prefillSourceNote(source: PrefillSource | undefined, locale: RecordLocale) {
  if (!source) return undefined;
  const key =
    source === 'Employee'
      ? 'sourceEmployee'
      : source === 'Leave Type'
        ? 'sourceLeaveType'
        : 'sourceLeaveBalance';
  return formatRecordMessage(locale, key);
}

/** Format only the visible balance. Keep raw values out of localized display strings. */
export function formatLeaveBalance(value: unknown, locale: RecordLocale): string {
  if ((typeof value !== 'number' && typeof value !== 'string') || value === '') return '';
  const days = Number(value);
  if (!Number.isFinite(days)) return '';
  return new Intl.NumberFormat(locale === 'tr' ? 'tr-TR' : 'en-US', {
    style: 'unit',
    unit: 'day',
    unitDisplay: 'long',
    maximumFractionDigits: 20,
  }).format(days);
}
