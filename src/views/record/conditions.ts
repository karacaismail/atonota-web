import type { DocField, FieldCondition } from './types';

export interface ConditionContext {
  doc: Readonly<Record<string, unknown>>;
  parent?: Readonly<Record<string, unknown>> | undefined;
}

export interface EvaluatedFieldState {
  visible: boolean;
  required: boolean;
  readOnly: boolean;
  collapsible: boolean;
}

export function isFrappeTruthy(value: unknown): boolean {
  if (value === null || value === undefined || value === false || value === 0 || value === '') {
    return false;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return true;
}

export function evaluateCondition(condition: FieldCondition, context: ConditionContext): boolean {
  const targetDoc = condition.scope === 'parent' ? (context.parent ?? {}) : context.doc;
  const actual = targetDoc[condition.field];

  switch (condition.op) {
    case 'truthy':
      return isFrappeTruthy(actual);
    case 'falsy':
      return !isFrappeTruthy(actual);
    case 'eq':
      return actual === condition.value;
    case 'ne':
      return actual !== condition.value;
    case 'gt':
      if (typeof actual === 'number' && typeof condition.value === 'number') {
        return actual > condition.value;
      }
      if (typeof actual === 'string' && typeof condition.value === 'string') {
        return actual > condition.value;
      }
      return false;
    case 'gte':
      if (typeof actual === 'number' && typeof condition.value === 'number') {
        return actual >= condition.value;
      }
      if (typeof actual === 'string' && typeof condition.value === 'string') {
        return actual >= condition.value;
      }
      return false;
    case 'lt':
      if (typeof actual === 'number' && typeof condition.value === 'number') {
        return actual < condition.value;
      }
      if (typeof actual === 'string' && typeof condition.value === 'string') {
        return actual < condition.value;
      }
      return false;
    case 'lte':
      if (typeof actual === 'number' && typeof condition.value === 'number') {
        return actual <= condition.value;
      }
      if (typeof actual === 'string' && typeof condition.value === 'string') {
        return actual <= condition.value;
      }
      return false;
  }
}

export interface EvaluateFieldStateOptions extends ConditionContext {
  isExistingRecord?: boolean | undefined;
  baseValue?: unknown;
  parentReadOnly?: boolean | undefined;
}

export function evaluateFieldState(
  field: DocField,
  options: EvaluateFieldStateOptions,
): EvaluatedFieldState {
  const unsupported = new Set(field.unsupported_conditions ?? []);

  let visible = field.hidden !== true;
  if (visible && field.depends_on && !unsupported.has('depends_on')) {
    visible = evaluateCondition(field.depends_on, options);
  }

  let required = field.reqd === true;
  if (!required && field.mandatory_depends_on && !unsupported.has('mandatory_depends_on')) {
    required = evaluateCondition(field.mandatory_depends_on, options);
  }
  if (!visible) {
    required = false;
  }

  let readOnly =
    field.read_only ||
    field.fieldtype === 'Read Only' ||
    options.parentReadOnly === true ||
    unsupported.has('read_only_depends_on');

  if (!readOnly && field.set_only_once === true && options.isExistingRecord === true) {
    if (isFrappeTruthy(options.baseValue)) {
      readOnly = true;
    }
  }

  if (!readOnly && field.read_only_depends_on) {
    readOnly = evaluateCondition(field.read_only_depends_on, options);
  }

  let collapsible = field.collapsible === true;
  if (collapsible && field.collapsible_depends_on && !unsupported.has('collapsible_depends_on')) {
    collapsible = evaluateCondition(field.collapsible_depends_on, options);
  }

  return {
    visible,
    required,
    readOnly,
    collapsible,
  };
}
