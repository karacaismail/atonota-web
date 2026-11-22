import type {
  ConditionScope,
  DocField,
  DocTypeMeta,
  DocTypeSchema,
  FieldCondition,
  LinkOption,
  RecordDocument,
  ScalarComparisonOperator,
  SelectChoice,
  Sensitivity,
  TruthConditionOperator,
  UnsupportedConditionKind,
} from './types';

export class SchemaValidationError extends Error {
  public readonly path: string;

  public constructor(message: string, path = '$') {
    super(`${path}: ${message}`);
    this.name = 'SchemaValidationError';
    this.path = path;
  }
}

const ALLOWED_META_KEYS = new Set([
  'schema',
  'meta_hash',
  'perm_version',
  'child_tables',
  'catalog_version',
  'mobile_cache_allowed',
  'truncated',
]);

const ALLOWED_DOCTYPE_KEYS = new Set([
  'name',
  'module',
  'fields',
  'title_field',
  'search_fields',
  'sort_field',
  'sensitivity',
]);

const ALLOWED_FIELD_KEYS = new Set([
  'fieldname',
  'fieldtype',
  'read_only',
  'label',
  'description',
  'options',
  'default',
  'reqd',
  'hidden',
  'permlevel',
  'depends_on',
  'mandatory_depends_on',
  'read_only_depends_on',
  'fetch_from',
  'fetch_if_empty',
  'set_only_once',
  'unique',
  'in_list_view',
  'in_standard_filter',
  'precision',
  'length',
  'non_negative',
  'collapsible',
  'collapsible_depends_on',
  'unsupported_conditions',
  'component',
  'sensitivity',
  'choices',
]);

const ALLOWED_CONDITION_KEYS = new Set(['scope', 'field', 'op', 'value']);
const ALLOWED_CHOICE_KEYS = new Set(['value', 'label']);
const TRUTH_OPS = new Set<TruthConditionOperator>(['truthy', 'falsy']);
const SCALAR_OPS = new Set<ScalarComparisonOperator>(['eq', 'ne', 'gt', 'gte', 'lt', 'lte']);
const UNSUPPORTED_CONDITIONS = new Set<UnsupportedConditionKind>([
  'depends_on',
  'mandatory_depends_on',
  'read_only_depends_on',
  'collapsible_depends_on',
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const proto: unknown = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function assertAllowedKeys(
  obj: Record<string, unknown>,
  allowed: ReadonlySet<string>,
  path: string,
): void {
  for (const key of Object.keys(obj)) {
    if (!allowed.has(key)) {
      throw new SchemaValidationError(`Unexpected property "${key}"`, path);
    }
  }
}

function assertString(value: unknown, path: string, nonEmpty = false): string {
  if (typeof value !== 'string') {
    throw new SchemaValidationError('Expected string', path);
  }
  if (nonEmpty && value.trim().length === 0) {
    throw new SchemaValidationError('Expected non-empty string', path);
  }
  return value;
}

function assertNullableString(value: unknown, path: string): string | null {
  if (value === null) {
    return null;
  }
  return assertString(value, path);
}

function assertOptionalNullableString(value: unknown, path: string): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  return assertNullableString(value, path);
}

function assertBoolean(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') {
    throw new SchemaValidationError('Expected boolean', path);
  }
  return value;
}

function assertOptionalBoolean(value: unknown, path: string): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }
  return assertBoolean(value, path);
}

function assertSensitivity(value: unknown, path: string): Sensitivity {
  if (value === 'standard' || value === 'restricted') {
    return value;
  }
  throw new SchemaValidationError('Expected sensitivity "standard" or "restricted"', path);
}

function validateCondition(input: unknown, path: string): FieldCondition {
  if (!isPlainObject(input)) {
    throw new SchemaValidationError('Expected condition object', path);
  }
  assertAllowedKeys(input, ALLOWED_CONDITION_KEYS, path);

  const rawScope = input['scope'];
  if (rawScope !== 'doc' && rawScope !== 'parent') {
    throw new SchemaValidationError('Expected condition scope "doc" or "parent"', `${path}.scope`);
  }
  const scope: ConditionScope = rawScope;
  const field = assertString(input['field'], `${path}.field`, true);
  const rawOp = assertString(input['op'], `${path}.op`, true);

  if (TRUTH_OPS.has(rawOp as TruthConditionOperator)) {
    if ('value' in input) {
      throw new SchemaValidationError(
        `Operator "${rawOp}" must not carry a comparison value`,
        `${path}.value`,
      );
    }
    return {
      scope,
      field,
      op: rawOp as TruthConditionOperator,
    };
  }

  if (SCALAR_OPS.has(rawOp as ScalarComparisonOperator)) {
    if (!('value' in input)) {
      throw new SchemaValidationError(
        `Operator "${rawOp}" requires a scalar comparison value`,
        `${path}.value`,
      );
    }
    const rawVal = input['value'];
    if (
      rawVal !== null &&
      typeof rawVal !== 'string' &&
      typeof rawVal !== 'number' &&
      typeof rawVal !== 'boolean'
    ) {
      throw new SchemaValidationError('Expected scalar comparison value', `${path}.value`);
    }
    if (typeof rawVal === 'number' && !Number.isFinite(rawVal)) {
      throw new SchemaValidationError('Expected finite numeric value', `${path}.value`);
    }
    return {
      scope,
      field,
      op: rawOp as ScalarComparisonOperator,
      value: rawVal,
    };
  }

  throw new SchemaValidationError(`Unsupported condition operator "${rawOp}"`, `${path}.op`);
}

function validateSelectChoice(input: unknown, path: string): SelectChoice {
  if (!isPlainObject(input)) {
    throw new SchemaValidationError('Expected SelectChoice object', path);
  }
  assertAllowedKeys(input, ALLOWED_CHOICE_KEYS, path);
  return {
    value: assertString(input['value'], `${path}.value`),
    label: assertString(input['label'], `${path}.label`),
  };
}

function validateDocField(input: unknown, path: string): DocField {
  if (!isPlainObject(input)) {
    throw new SchemaValidationError('Expected Field object', path);
  }
  assertAllowedKeys(input, ALLOWED_FIELD_KEYS, path);

  const fieldname = assertString(input['fieldname'], `${path}.fieldname`, true);
  const fieldtype = assertString(input['fieldtype'], `${path}.fieldtype`, true);
  const readOnly = assertBoolean(input['read_only'], `${path}.read_only`);
  const component = assertNullableString(input['component'], `${path}.component`);
  const sensitivity = assertSensitivity(input['sensitivity'], `${path}.sensitivity`);

  let permlevel: number | null | undefined;
  if (input['permlevel'] !== undefined) {
    if (input['permlevel'] === null) {
      permlevel = null;
    } else if (typeof input['permlevel'] === 'number' && Number.isInteger(input['permlevel'])) {
      permlevel = input['permlevel'];
    } else {
      throw new SchemaValidationError('Expected integer or null', `${path}.permlevel`);
    }
  }

  let length: number | null | undefined;
  if (input['length'] !== undefined) {
    if (input['length'] === null) {
      length = null;
    } else if (
      typeof input['length'] === 'number' &&
      Number.isInteger(input['length']) &&
      input['length'] >= 0
    ) {
      length = input['length'];
    } else {
      throw new SchemaValidationError('Expected non-negative integer or null', `${path}.length`);
    }
  }

  let unsupportedConditions: UnsupportedConditionKind[] | undefined;
  if (input['unsupported_conditions'] !== undefined) {
    if (!Array.isArray(input['unsupported_conditions'])) {
      throw new SchemaValidationError('Expected array', `${path}.unsupported_conditions`);
    }
    const seen = new Set<UnsupportedConditionKind>();
    unsupportedConditions = [];
    for (let i = 0; i < input['unsupported_conditions'].length; i += 1) {
      const item = input['unsupported_conditions'][i];
      if (
        typeof item !== 'string' ||
        !UNSUPPORTED_CONDITIONS.has(item as UnsupportedConditionKind)
      ) {
        throw new SchemaValidationError(
          'Invalid unsupported_conditions entry',
          `${path}.unsupported_conditions[${i}]`,
        );
      }
      const typed = item as UnsupportedConditionKind;
      if (seen.has(typed)) {
        throw new SchemaValidationError(
          'Duplicate unsupported_conditions entry',
          `${path}.unsupported_conditions[${i}]`,
        );
      }
      seen.add(typed);
      unsupportedConditions.push(typed);
    }
  }

  let choices: SelectChoice[] | undefined;
  if (input['choices'] !== undefined) {
    if (!Array.isArray(input['choices'])) {
      throw new SchemaValidationError('Expected choices array', `${path}.choices`);
    }
    choices = input['choices'].map((item, index) =>
      validateSelectChoice(item, `${path}.choices[${index}]`),
    );
  }

  return {
    fieldname,
    fieldtype,
    read_only: readOnly,
    component,
    sensitivity,
    label: assertOptionalNullableString(input['label'], `${path}.label`),
    description: assertOptionalNullableString(input['description'], `${path}.description`),
    options: assertOptionalNullableString(input['options'], `${path}.options`),
    default: assertOptionalNullableString(input['default'], `${path}.default`),
    reqd: assertOptionalBoolean(input['reqd'], `${path}.reqd`),
    hidden: assertOptionalBoolean(input['hidden'], `${path}.hidden`),
    permlevel,
    depends_on:
      input['depends_on'] !== undefined
        ? validateCondition(input['depends_on'], `${path}.depends_on`)
        : undefined,
    mandatory_depends_on:
      input['mandatory_depends_on'] !== undefined
        ? validateCondition(input['mandatory_depends_on'], `${path}.mandatory_depends_on`)
        : undefined,
    read_only_depends_on:
      input['read_only_depends_on'] !== undefined
        ? validateCondition(input['read_only_depends_on'], `${path}.read_only_depends_on`)
        : undefined,
    fetch_from: assertOptionalNullableString(input['fetch_from'], `${path}.fetch_from`),
    fetch_if_empty: assertOptionalBoolean(input['fetch_if_empty'], `${path}.fetch_if_empty`),
    set_only_once: assertOptionalBoolean(input['set_only_once'], `${path}.set_only_once`),
    unique: assertOptionalBoolean(input['unique'], `${path}.unique`),
    in_list_view: assertOptionalBoolean(input['in_list_view'], `${path}.in_list_view`),
    in_standard_filter: assertOptionalBoolean(
      input['in_standard_filter'],
      `${path}.in_standard_filter`,
    ),
    precision: assertOptionalNullableString(input['precision'], `${path}.precision`),
    length,
    non_negative: assertOptionalBoolean(input['non_negative'], `${path}.non_negative`),
    collapsible: assertOptionalBoolean(input['collapsible'], `${path}.collapsible`),
    collapsible_depends_on:
      input['collapsible_depends_on'] !== undefined
        ? validateCondition(input['collapsible_depends_on'], `${path}.collapsible_depends_on`)
        : undefined,
    unsupported_conditions: unsupportedConditions,
    choices,
  };
}

export function validateDocTypeSchema(input: unknown, path = '$.schema'): DocTypeSchema {
  if (!isPlainObject(input)) {
    throw new SchemaValidationError('Expected DocType schema object', path);
  }
  assertAllowedKeys(input, ALLOWED_DOCTYPE_KEYS, path);

  if (!Array.isArray(input['fields'])) {
    throw new SchemaValidationError('Expected fields array', `${path}.fields`);
  }

  return {
    name: assertString(input['name'], `${path}.name`, true),
    module: assertNullableString(input['module'], `${path}.module`),
    fields: input['fields'].map((field, index) =>
      validateDocField(field, `${path}.fields[${index}]`),
    ),
    title_field: assertNullableString(input['title_field'], `${path}.title_field`),
    search_fields: assertString(input['search_fields'], `${path}.search_fields`),
    sort_field: assertNullableString(input['sort_field'], `${path}.sort_field`),
    sensitivity: assertSensitivity(input['sensitivity'], `${path}.sensitivity`),
  };
}

export function validateDocTypeMeta(input: unknown): DocTypeMeta {
  if (!isPlainObject(input)) {
    throw new SchemaValidationError('Expected Meta object or Frappe message envelope', '$');
  }

  let metaSource: Record<string, unknown> = input;
  let basePath = '$';
  if ('message' in input) {
    if (Object.keys(input).length !== 1) {
      throw new SchemaValidationError('Unexpected properties alongside message envelope', '$');
    }
    if (!isPlainObject(input['message'])) {
      throw new SchemaValidationError('Expected Meta object inside message', '$.message');
    }
    metaSource = input['message'];
    basePath = '$.message';
  }

  assertAllowedKeys(metaSource, ALLOWED_META_KEYS, basePath);

  const schema = validateDocTypeSchema(metaSource['schema'], `${basePath}.schema`);
  const metaHash = assertString(metaSource['meta_hash'], `${basePath}.meta_hash`, true);
  const permVersion = assertString(metaSource['perm_version'], `${basePath}.perm_version`, true);

  if (!isPlainObject(metaSource['child_tables'])) {
    throw new SchemaValidationError('Expected child_tables map', `${basePath}.child_tables`);
  }
  const childTables: Record<string, DocTypeSchema> = {};
  for (const [childName, childDef] of Object.entries(metaSource['child_tables'])) {
    childTables[childName] = validateDocTypeSchema(
      childDef,
      `${basePath}.child_tables.${childName}`,
    );
  }

  const catalogVersion = metaSource['catalog_version'];
  if (
    typeof catalogVersion !== 'number' ||
    !Number.isInteger(catalogVersion) ||
    catalogVersion < 1
  ) {
    throw new SchemaValidationError(
      'Expected integer catalog_version >= 1',
      `${basePath}.catalog_version`,
    );
  }

  const mobileCacheAllowed = assertBoolean(
    metaSource['mobile_cache_allowed'],
    `${basePath}.mobile_cache_allowed`,
  );

  let truncated: true | undefined;
  if ('truncated' in metaSource && metaSource['truncated'] !== undefined) {
    if (metaSource['truncated'] !== true) {
      throw new SchemaValidationError(
        'truncated must be true when present',
        `${basePath}.truncated`,
      );
    }
    if (
      schema.fields.length > 0 ||
      Object.keys(childTables).length > 0 ||
      mobileCacheAllowed ||
      schema.title_field !== null ||
      schema.search_fields !== '' ||
      schema.sort_field !== null
    ) {
      throw new SchemaValidationError(
        'Truncated Meta violated empty-projection contract',
        `${basePath}.truncated`,
      );
    }
    truncated = true;
  }

  return {
    schema,
    meta_hash: metaHash,
    perm_version: permVersion,
    child_tables: childTables,
    catalog_version: catalogVersion,
    mobile_cache_allowed: mobileCacheAllowed,
    truncated,
  };
}

export function validateRecordDocument(input: unknown, path = '$.data'): RecordDocument {
  if (!isPlainObject(input)) {
    throw new SchemaValidationError('Expected record document object', path);
  }
  const name = assertString(input['name'], `${path}.name`, true);
  if (input['modified'] !== undefined && typeof input['modified'] !== 'string') {
    throw new SchemaValidationError('Expected string modified version', `${path}.modified`);
  }
  if (
    input['docstatus'] !== undefined &&
    input['docstatus'] !== 0 &&
    input['docstatus'] !== 1 &&
    input['docstatus'] !== 2
  ) {
    throw new SchemaValidationError('Expected docstatus 0, 1, or 2', `${path}.docstatus`);
  }

  // Copy own keys without altering null vs "" vs omitted properties (SZ-9).
  const result: RecordDocument = { name };
  for (const [key, val] of Object.entries(input)) {
    result[key] = val;
  }
  return result;
}

export function validateRecordEnvelope(input: unknown): RecordDocument {
  if (!isPlainObject(input)) {
    throw new SchemaValidationError('Expected record response envelope', '$');
  }
  if ('data' in input) {
    return validateRecordDocument(input['data'], '$.data');
  }
  if ('message' in input) {
    return validateRecordDocument(input['message'], '$.message');
  }
  throw new SchemaValidationError('Expected "data" or "message" property in record response', '$');
}

export function validateLinkSearchResponse(input: unknown): LinkOption[] {
  if (!isPlainObject(input) || !Array.isArray(input['message'])) {
    throw new SchemaValidationError('Expected search_link message array', '$.message');
  }
  return input['message'].map((item: unknown, index: number) => {
    const itemPath = `$.message[${index}]`;
    if (!isPlainObject(item)) {
      throw new SchemaValidationError('Expected link option object', itemPath);
    }
    const value = assertString(item['value'], `${itemPath}.value`, true);
    const label =
      item['label'] !== undefined && item['label'] !== null
        ? assertString(item['label'], `${itemPath}.label`)
        : undefined;
    const description =
      item['description'] !== undefined && item['description'] !== null
        ? assertString(item['description'], `${itemPath}.description`)
        : undefined;
    return {
      value,
      label,
      description,
    };
  });
}
