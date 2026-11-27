import { CollectionError } from './types';
import { toListRequest } from './query';
import type {
  CollectionDefinition,
  CollectionQuery,
  GroupSummary,
  GroupSummaryGroup,
  GroupSummaryRequest,
} from './types';

/** The largest group count in the contract. */
export const SUMMARY_GROUP_LIMIT = 100;

/**
 * Builds a `group_summary` request from the list query. The filters match the list.
 * Paging and sorting do not apply to the summary. With no group-by field, no request is built.
 */
export function toGroupSummaryRequest(
  definition: CollectionDefinition,
  query: CollectionQuery,
): GroupSummaryRequest | undefined {
  if (!definition.groupField) return undefined;
  const list = toListRequest(definition, query);
  return {
    doctype: list.doctype,
    groupBy: definition.groupField,
    filters: list.filters,
    limit: SUMMARY_GROUP_LIMIT,
  };
}

function invalid(): never {
  throw new CollectionError('error', 'Özet yanıtı geçersiz.');
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid();
  return value as Record<string, unknown>;
}
function count(value: unknown, minimum: number): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < minimum) invalid();
  return value;
}

/**
 * Validates the summary that the client returns.
 * The shape is the contract's `message` object. Names convert as in `listDocuments`:
 * the `total_count` field becomes `totalCount`.
 */
export function parseGroupSummary(input: unknown): GroupSummary {
  const summary = record(input);
  const groups = summary['groups'];
  if (!Array.isArray(groups) || groups.length > SUMMARY_GROUP_LIMIT) invalid();
  const truncated = summary['truncated'];
  if (typeof truncated !== 'boolean') invalid();
  return {
    groups: groups.map((item): GroupSummaryGroup => {
      const group = record(item);
      const value = group['value'];
      if (
        value !== null &&
        typeof value !== 'string' &&
        typeof value !== 'boolean' &&
        !(typeof value === 'number' && Number.isFinite(value))
      )
        invalid();
      const result: GroupSummaryGroup = { value, count: count(group['count'], 1) };
      if ('aggregate' in group) {
        const aggregate = group['aggregate'];
        if (aggregate !== null && !(typeof aggregate === 'number' && Number.isFinite(aggregate)))
          invalid();
        result.aggregate = aggregate;
      }
      return result;
    }),
    totalCount: count(summary['totalCount'], 0),
    truncated,
  };
}
