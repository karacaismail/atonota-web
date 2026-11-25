import { CollectionError } from './types';
import type {
  CollectionDefinition,
  CollectionField,
  CollectionPage,
  CollectionRow,
  ViewRoles,
  Sensitivity,
} from './types';

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new CollectionError('error', 'Geçersiz veri.');
  return value as Record<string, unknown>;
}
function text(value: unknown): string {
  if (typeof value !== 'string' || !value.trim())
    throw new CollectionError('error', 'Geçersiz alan tanımı.');
  return value;
}
function sensitivity(value: unknown): Sensitivity {
  if (value !== 'standard' && value !== 'restricted')
    throw new CollectionError('error', 'Gizlilik işareti geçersiz.');
  return value;
}
const identifier = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const numericTypes = new Set(['Int', 'Float', 'Currency', 'Percent', 'Duration']);
export function isNumeric(field: CollectionField) {
  return numericTypes.has(field.fieldtype);
}

/**
 * Seçim alanının seçeneklerini okur. Boş değerli seçenek alınmaz.
 * Frappe'de boş seçenek "değer yok" demektir. Süzgeç zaten "Tümü" seçeneğini kendisi ekler.
 * Biçimi bozuk seçenek atlanır. Tek bir bozuk seçenek bütün listeyi kapatmaz.
 * Etiketi boş olan seçenek değerini etiket olarak kullanır.
 */
function readChoices(items: unknown[]): CollectionField['choices'] {
  return items.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const { value, label } = item as Record<string, unknown>;
    if (typeof value !== 'string' || !value.trim()) return [];
    return [{ value, label: typeof label === 'string' && label.trim() ? label : value }];
  });
}

/** Local projection of platform_core-shell Meta. No scripts or executable rules are accepted. */
export function createDefinition(input: unknown, roles: ViewRoles = {}): CollectionDefinition {
  const meta = object(input);
  if (
    meta['truncated'] ||
    ![1, 2].includes(Number(meta['catalog_version'])) ||
    typeof meta['catalog_version'] !== 'number'
  )
    throw new CollectionError('error', 'Kayıt tanımı desteklenmiyor.');
  const schema = object(meta['schema']);
  const doctype = text(schema['name']);
  const recordSensitivity = sensitivity(schema['sensitivity']);
  if (!Array.isArray(schema['fields'])) throw new CollectionError('error', 'Alanlar bulunamadı.');
  const columns: CollectionField[] = [
    {
      sensitivity: recordSensitivity,
      fieldname: 'name',
      fieldtype: 'Data',
      label: 'Kayıt',
      component: 'Input',
      choices: [],
      filterable: false,
    },
  ];
  const seen = new Set(['name']);
  for (const value of schema['fields']) {
    const field = object(value);
    const name = text(field['fieldname']);
    const fieldtype = text(field['fieldtype']);
    if (!identifier.test(name)) throw new CollectionError('error', 'Geçersiz alan adı.');
    if (
      field['hidden'] === true ||
      fieldtype === 'Password' ||
      (!field['in_list_view'] && name !== schema['title_field'])
    )
      continue;
    if (seen.has(name)) {
      if (name === 'name') continue;
      throw new CollectionError('error', 'Alan adı yineleniyor.');
    }
    seen.add(name);
    const choices = Array.isArray(field['choices']) ? readChoices(field['choices']) : [];
    columns.push({
      sensitivity: sensitivity(field['sensitivity']),
      fieldname: name,
      fieldtype,
      label: typeof field['label'] === 'string' && field['label'] ? field['label'] : name,
      component: typeof field['component'] === 'string' ? field['component'] : null,
      choices,
      filterable: field['in_standard_filter'] === true,
    });
  }
  const titleField = columns.some((f) => f.fieldname === schema['title_field'])
    ? String(schema['title_field'])
    : 'name';
  const definition: CollectionDefinition = {
    doctype,
    label: roles.label?.trim() || 'Kayıtlar',
    columns,
    titleField,
    sensitivity: recordSensitivity,
  };
  for (const key of ['groupField', 'startField', 'endField', 'durationField'] as const) {
    const name = roles[key];
    const field = columns.find((candidate) => candidate.fieldname === name);
    if (name && !field) throw new CollectionError('error', 'Görünüm alanı okunamıyor.');
    if (field && (key === 'startField' || key === 'endField') && field.fieldtype !== 'Date')
      throw new CollectionError('error', 'Tarih alanı gerekli.');
    if (field && key === 'durationField' && !isNumeric(field))
      throw new CollectionError('error', 'Süre alanı gerekli.');
    if (name) definition[key] = name;
  }
  return definition;
}
export function parsePage(input: unknown): CollectionPage {
  const page = object(input);
  if (!Array.isArray(page['data']) || typeof page['hasNextPage'] !== 'boolean')
    throw new CollectionError('error', 'Liste yanıtı geçersiz.');
  const names = new Set<string>();
  const data = page['data'].map((value): CollectionRow => {
    const row = object(value);
    const name = text(row['name']);
    if (names.has(name)) throw new CollectionError('error', 'Kayıt kimliği yineleniyor.');
    names.add(name);
    const result: CollectionRow = { name };
    for (const [key, cell] of Object.entries(row)) {
      if (
        cell === null ||
        typeof cell === 'string' ||
        typeof cell === 'boolean' ||
        (typeof cell === 'number' && Number.isFinite(cell))
      ) {
        Object.defineProperty(result, key, {
          value: cell,
          enumerable: true,
          writable: true,
          configurable: true,
        });
      } else throw new CollectionError('error', 'Kayıt değeri geçersiz.');
    }
    return result;
  });
  return { data, hasNextPage: page['hasNextPage'] };
}
export function cellText(row: CollectionRow, field: CollectionField): string {
  const value = row[field.fieldname];
  if (value === null || value === undefined) return 'Bilgi yok';
  return field.choices.find((choice) => choice.value === String(value))?.label ?? String(value);
}
