import type { FilterOperator, FilterScalar } from './frappe-v2';
import type { components, operations } from './generated/platform_core-collection';
import { isRecord } from './guards';

export const GROUP_SUMMARY_PATH = '/platform_core.api.collection.group_summary';

type RawQuery = operations['getCollectionGroupSummary']['parameters']['query'];
type RawSummary = components['schemas']['Summary'];
type Group = components['schemas']['Group'];
type FilterValue = FilterScalar | readonly FilterScalar[];
type FilterCondition =
  | readonly [field: string, operator: FilterOperator, value: FilterValue]
  | readonly [doctype: string, field: string, operator: FilterOperator, value: FilterValue];

export type GroupSummaryFilters =
  | Readonly<Record<string, FilterScalar | readonly [FilterOperator, FilterValue]>>
  | readonly FilterCondition[];

export type GroupSummaryQuery = {
  groupBy: RawQuery['group_by'];
  filters?: GroupSummaryFilters;
  limit?: RawQuery['limit'];
} & (
  | { aggregate?: never; aggregateField?: never }
  | {
      aggregate: NonNullable<RawQuery['aggregate']>;
      aggregateField: NonNullable<RawQuery['aggregate_field']>;
    }
);

export type GroupSummary = Omit<RawSummary, 'total_count'> & { totalCount: number };

function isGroup(value: unknown): value is Group {
  if (!isRecord(value)) return false;
  const { value: key, count, aggregate } = value;
  return (
    (key === null ||
      typeof key === 'string' ||
      typeof key === 'boolean' ||
      (typeof key === 'number' && Number.isFinite(key))) &&
    typeof count === 'number' &&
    Number.isInteger(count) &&
    count > 0 &&
    (aggregate === undefined ||
      aggregate === null ||
      (typeof aggregate === 'number' && Number.isFinite(aggregate)))
  );
}

export function isRawGroupSummary(value: unknown): value is RawSummary {
  return (
    isRecord(value) &&
    Array.isArray(value.groups) &&
    value.groups.length <= 100 &&
    value.groups.every(isGroup) &&
    typeof value.total_count === 'number' &&
    Number.isInteger(value.total_count) &&
    value.total_count >= 0 &&
    typeof value.truncated === 'boolean'
  );
}
