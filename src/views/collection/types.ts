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
export interface CollectionPage {
  data: CollectionRow[];
  has_next_page: boolean;
  total?: number;
}
export interface CollectionSource {
  kind: 'example' | 'api';
  list: (request: ListRequest, signal: AbortSignal) => Promise<unknown>;
}
export interface ViewProps {
  definition: CollectionDefinition;
  rows: CollectionRow[];
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
