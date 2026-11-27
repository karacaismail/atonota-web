export type ViewType = 'table' | 'kanban' | 'pivot' | 'report' | 'gantt' | 'timesheet';
export type Scalar = string | number | boolean | null;
export interface CollectionRow {
  name: string;
  [field: string]: Scalar;
}
export type Sensitivity = 'standard' | 'restricted';
export interface CollectionField {
  sensitivity: Sensitivity;
  fieldname: string;
  fieldtype: string;
  label: string;
  component: string | null;
  choices: { value: string; label: string }[];
  filterable: boolean;
}
export interface CollectionDefinition {
  label: string;
  sensitivity: Sensitivity;
  doctype: string;
  columns: CollectionField[];
  titleField: string;
  groupField?: string;
  startField?: string;
  endField?: string;
  durationField?: string;
}
export interface ViewRoles {
  label?: string;
  groupField?: string;
  startField?: string;
  endField?: string;
  durationField?: string;
}
export interface CollectionQuery {
  view: ViewType;
  page: number;
  size: number;
  search: string;
  sort: string;
  direction: 'asc' | 'desc';
  filter: string;
  value: string;
}
export interface ListRequest {
  doctype: string;
  fields: string[];
  filters: [string, '=' | 'like', string][];
  order_by: string;
  limit_start: number;
  limit_page_length: number;
}
/** Frappe gives no total count. Only `hasNextPage` tells whether a next page exists. */
export interface CollectionPage {
  data: CollectionRow[];
  hasNextPage: boolean;
}
/** List source. In production, `createApiSource` connects to the shared `listDocuments` client. */
export interface CollectionSource {
  list: (request: ListRequest, signal: AbortSignal) => Promise<unknown>;
}
/** The `platform_core.api.collection.group_summary` request. It has no page limit. */
export interface GroupSummaryRequest {
  doctype: string;
  groupBy: string;
  filters: ListRequest['filters'];
  aggregate?: { op: 'sum' | 'avg'; field: string };
  limit: number;
}
export interface GroupSummaryGroup {
  value: Scalar;
  count: number;
  aggregate?: number | null;
}
export interface GroupSummary {
  groups: GroupSummaryGroup[];
  /** The count of all readable records that match the filter. */
  totalCount: number;
  /** True if groups were dropped because of the group limit. */
  truncated: boolean;
}
/** Summary source. It will use the typed `group_summary` client once that reaches `main`. */
export interface CollectionSummarySource {
  groupSummary: (request: GroupSummaryRequest, signal: AbortSignal) => Promise<unknown>;
}
export type SummaryState =
  | { status: 'off' | 'loading' | 'error' | 'unauthorized' }
  | { status: 'ready'; summary: GroupSummary };
export interface ViewProps {
  definition: CollectionDefinition;
  rows: CollectionRow[];
  summary?: SummaryState;
}
export class CollectionError extends Error {
  constructor(
    public readonly kind: 'error' | 'unauthorized',
    message: string,
  ) {
    super(message);
    this.name = 'CollectionError';
  }
}
