import { describe, expect, it } from 'vitest';
import { readQuery } from './query';
import { sampleDefinition } from './sample';
import { parseGroupSummary, toGroupSummaryRequest } from './summary';

describe('group summary interface (platform_core.api.collection.group_summary)', () => {
  it('builds a request with the list filters and no paging', () => {
    const query = readQuery(
      new URLSearchParams('page=3&search=Örnek&filter=status&value=Açık'),
      sampleDefinition,
    );
    expect(toGroupSummaryRequest(sampleDefinition, query)).toEqual({
      doctype: sampleDefinition.doctype,
      groupBy: 'status',
      filters: [
        ['title', 'like', '%Örnek%'],
        ['status', '=', 'Açık'],
      ],
      limit: 100,
    });
  });

  it('returns no request without a group field', () => {
    const definition = { ...sampleDefinition };
    delete definition.groupField;
    expect(
      toGroupSummaryRequest(definition, readQuery(new URLSearchParams(), definition)),
    ).toBeUndefined();
  });

  it('accepts the client shape with totalCount and truncated', () => {
    expect(
      parseGroupSummary({
        groups: [
          { value: 'Açık', count: 16 },
          { value: null, count: 1, aggregate: 12.5 },
        ],
        totalCount: 17,
        truncated: false,
      }),
    ).toEqual({
      groups: [
        { value: 'Açık', count: 16 },
        { value: null, count: 1, aggregate: 12.5 },
      ],
      totalCount: 17,
      truncated: false,
    });
  });

  it.each([
    ['groups is not a list', { groups: {}, totalCount: 0, truncated: false }],
    [
      'count is not a positive integer',
      { groups: [{ value: 'A', count: 0 }], totalCount: 0, truncated: false },
    ],
    ['value is an object', { groups: [{ value: {}, count: 1 }], totalCount: 1, truncated: false }],
    ['totalCount is missing', { groups: [], truncated: false }],
    ['truncated is missing', { groups: [], totalCount: 0 }],
    [
      'aggregate is text',
      { groups: [{ value: 'A', count: 1, aggregate: '3' }], totalCount: 1, truncated: false },
    ],
  ])('rejects a summary when %s', (_label, input) => {
    expect(() => parseGroupSummary(input)).toThrow();
  });
});
