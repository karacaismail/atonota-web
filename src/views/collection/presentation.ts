import type { CollectionField, CollectionRow } from './types';
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
export function displayCell(row: CollectionRow, field: CollectionField): string {
  const value = row[field.fieldname];
  if (value === null || value === undefined) return 'Bilgi yok';
  if (!field.component || !renderers.has(field.component)) return JSON.stringify(value);
  if (field.fieldtype === 'Date') {
    const time = dateValue(value);
    if (time === undefined) return 'Geçersiz tarih';
    const date = new Date(time);
    return (
      new Intl.DateTimeFormat('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(date) +
      ' ' +
      new Intl.DateTimeFormat('tr-TR', { weekday: 'long', timeZone: 'UTC' }).format(date) +
      ' günü'
    );
  }
  if (typeof value === 'number')
    return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 4 }).format(value);
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
