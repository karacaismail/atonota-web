import type { CollectionDefinition, CollectionQuery, ListRequest, ViewType } from './types';
export const viewTypes: readonly ViewType[] = [
  'table',
  'kanban',
  'pivot',
  'report',
  'gantt',
  'timesheet',
];
function pageNumber(value: string | null) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 && number <= 100000 ? number : 1;
}
export function readQuery(
  params: URLSearchParams,
  definition: CollectionDefinition,
): CollectionQuery {
  const view = params.get('view');
  const size = Number(params.get('size'));
  const sort = params.get('sort') ?? 'name';
  const filter = definition.columns.find(
    (field) => field.fieldname === params.get('filter') && field.filterable,
  );
  const value = (params.get('value') ?? '').slice(0, 200);
  const validFilter =
    filter && (!filter.choices.length || filter.choices.some((choice) => choice.value === value));
  return {
    view: viewTypes.includes(view as ViewType) ? (view as ViewType) : 'table',
    page: pageNumber(params.get('page')),
    size: [10, 20, 50].includes(size) ? size : 20,
    search: (params.get('search') ?? '').slice(0, 200),
    sort: definition.columns.some((field) => field.fieldname === sort) ? sort : 'name',
    direction: params.get('direction') === 'desc' ? 'desc' : 'asc',
    filter: validFilter ? filter.fieldname : '',
    value: validFilter ? value : '',
  };
}
export function writeQuery(previous: URLSearchParams, query: CollectionQuery) {
  const params = new URLSearchParams(previous);
  for (const [key, value] of Object.entries(query)) {
    if (value === '') params.delete(key);
    else params.set(key, String(value));
  }
  return params;
}
export function toListRequest(
  definition: CollectionDefinition,
  query: CollectionQuery,
): ListRequest {
  const safe = readQuery(writeQuery(new URLSearchParams(), query), definition);
  const filters: ListRequest['filters'] = [];
  if (safe.search)
    filters.push([
      definition.titleField,
      'like',
      '%' + safe.search.replace(/[\\%_]/g, '\\$&') + '%',
    ]);
  if (safe.filter && safe.value) filters.push([safe.filter, '=', safe.value]);
  return {
    doctype: definition.doctype,
    fields: definition.columns.map((field) => field.fieldname),
    filters,
    order_by: safe.sort + ' ' + safe.direction + (safe.sort === 'name' ? '' : ', name asc'),
    limit_start: (safe.page - 1) * safe.size,
    limit_page_length: safe.size,
  };
}
