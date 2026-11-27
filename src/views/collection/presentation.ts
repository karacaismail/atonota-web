import type { Formatter } from '@/app/locale';

import type { CollectionField, CollectionRow, SummaryState } from './types';
import { cellText } from './model';
const renderers = new Set([
  'Input',
  'Text',
  'Select',
  'DatePicker',
  'InputNumber',
  'Checkbox',
  'Link',
  'input',
  'text',
  'select',
  'date',
  'number',
  'check',
  'link',
]);
export function dateValue(value: unknown): number | undefined {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const time = Date.parse(value + 'T00:00:00Z');
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value
    ? time
    : undefined;
}
/**
 * A rich text field's value is HTML. The list cell shows only plain text.
 * The parser runs no scripts. Tags are dropped, and codes such as `&amp;` become characters.
 */
const richTextTypes = new Set(['Text Editor', 'HTML Editor']);
const skippedElements = 'script, style, template, noscript';
function plainText(html: string): string {
  if (typeof DOMParser === 'undefined')
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  const body = new DOMParser().parseFromString(html, 'text/html').body;
  body.querySelectorAll(skippedElements).forEach((node) => node.remove());
  return (body.textContent ?? '').replace(/\s+/g, ' ').trim();
}
/** The cell's visible text. Dates and numbers are written in the user's language (IC-13). */
export function displayCell(row: CollectionRow, field: CollectionField, format: Formatter): string {
  const value = row[field.fieldname];
  if (value === null || value === undefined) return 'Bilgi yok';
  if (typeof value === 'string' && richTextTypes.has(field.fieldtype)) return plainText(value);
  if (!field.component || !renderers.has(field.component)) return String(value);
  if (field.fieldtype === 'Date') {
    if (dateValue(value) === undefined) return 'Geçersiz tarih';
    return `${format.date(value as string)} günü`;
  }
  if (typeof value === 'number') return format.number(value, { maximumFractionDigits: 4 });
  if (typeof value === 'boolean') return value ? 'Evet' : 'Hayır';
  return cellText(row, field);
}
export function groupRows(rows: CollectionRow[], field: CollectionField) {
  const groups = new Map<string, { label: string; rows: CollectionRow[] }>();
  for (const choice of field.choices) groups.set(choice.value, { label: choice.label, rows: [] });
  for (const row of rows) {
    const key = String(row[field.fieldname] ?? '');
    const group = groups.get(key) ?? { label: cellText(row, field), rows: [] };
    group.rows.push(row);
    groups.set(key, group);
  }
  return [...groups.entries()].map(([key, group]) => ({ ...group, key }));
}

export interface GroupCount {
  key: string;
  label: string;
  count: number;
}
/** Groups and scope. Counts all records if the server summary is ready, else only the page. */
export function groupCounts(
  rows: CollectionRow[],
  field: CollectionField,
  summary: SummaryState = { status: 'off' },
): { scope: 'all' | 'page'; groups: GroupCount[]; total: number; truncated: boolean } {
  if (summary.status === 'ready') {
    return {
      scope: 'all',
      groups: summary.summary.groups.map((group) => ({
        key: String(group.value ?? ''),
        label:
          group.value === null
            ? 'Bilgi yok'
            : (field.choices.find((choice) => choice.value === String(group.value))?.label ??
              String(group.value)),
        count: group.count,
      })),
      total: summary.summary.totalCount,
      truncated: summary.summary.truncated,
    };
  }
  return {
    scope: 'page',
    groups: groupRows(rows, field).map((group) => ({
      key: group.key,
      label: group.label,
      count: group.rows.length,
    })),
    total: rows.length,
    truncated: false,
  };
}
/** A sentence describing the summary state. Empty while the page summary is in use. */
export function summaryNotice(summary: SummaryState = { status: 'off' }): string | undefined {
  if (summary.status === 'loading') return 'Sunucu özeti yükleniyor. Şimdilik bu sayfa özetlenir.';
  if (summary.status === 'error') return 'Sunucu özeti alınamadı. Yalnız bu sayfa özetlenir.';
  if (summary.status === 'unauthorized')
    return 'Sunucu özetini görme yetkiniz yok. Yalnız bu sayfa özetlenir.';
  if (summary.status === 'ready' && summary.summary.truncated)
    return 'Grup sayısı sınırı aşıldı. Bazı gruplar gösterilmiyor.';
  return undefined;
}
