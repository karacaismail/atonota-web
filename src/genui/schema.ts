/**
 * Sunucudan gelen GenUI bloklarını doğrular (U2, AX-4).
 *
 * Türü, alanları ve boyutu denetler. Geçmeyen blok `unknown` olur.
 * `unknown` blok yalnız düz JSON metni olarak çizilir.
 */
import type {
  ChartBar,
  FormField,
  FormOption,
  GenUIBlock,
  KnownBlock,
  KpiItem,
  TableCell,
  TableColumn,
} from './types';

/** Boyut sınırları. Büyük blok ekranı ve belleği zorlamasın. */
export const LIMITS = {
  text: 500,
  items: 12,
  bars: 31,
  columns: 8,
  rows: 50,
  fields: 12,
  options: 20,
  blocks: 12,
} as const;

type Obj = Record<string, unknown>;

function isObj(value: unknown): value is Obj {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function str(value: unknown, required = true): value is string {
  if (value === undefined) return !required;
  return (
    typeof value === 'string' && value.length <= LIMITS.text && (!required || value.length > 0)
  );
}

function num(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function list<T>(value: unknown, max: number, check: (item: unknown) => item is T): value is T[] {
  return Array.isArray(value) && value.length > 0 && value.length <= max && value.every(check);
}

function isKpi(value: unknown): value is KpiItem {
  return (
    isObj(value) &&
    str(value['label']) &&
    str(value['value']) &&
    (value['delta'] === undefined || num(value['delta'])) &&
    str(value['unit'], false) &&
    (value['goodWhen'] === undefined || value['goodWhen'] === 'up' || value['goodWhen'] === 'down')
  );
}

function isBar(value: unknown): value is ChartBar {
  return isObj(value) && str(value['label']) && num(value['value']) && value['value'] >= 0;
}

function isColumn(value: unknown): value is TableColumn {
  return isObj(value) && str(value['key']) && str(value['title']);
}

function isCell(value: unknown): value is TableCell {
  return num(value) || str(value, false);
}

function isRow(value: unknown): value is Record<string, TableCell> {
  return isObj(value) && Object.values(value).every(isCell);
}

function isOption(value: unknown): value is FormOption {
  return isObj(value) && str(value['value']) && str(value['label']);
}

function isField(value: unknown): value is FormField {
  if (!isObj(value) || !str(value['name']) || !str(value['label'])) return false;
  const kind = value['kind'];
  if (kind !== 'text' && kind !== 'select' && kind !== 'checks') return false;
  const options = value['options'];
  if (kind !== 'text' && !list(options, LIMITS.options, isOption)) return false;
  const v = value['value'];
  const valueOk =
    v === undefined ||
    str(v, false) ||
    (Array.isArray(v) && v.length <= LIMITS.options && v.every((x) => str(x)));
  return valueOk && (value['required'] === undefined || typeof value['required'] === 'boolean');
}

function isChoice(value: unknown): value is string {
  return str(value);
}

/** Bloğu doğrular. Geçerliyse aynı nesneyi tipli döndürür. */
function validate(raw: Obj): KnownBlock | null {
  switch (raw['type']) {
    case 'kpis':
      return list(raw['items'], LIMITS.items, isKpi) ? (raw as unknown as KnownBlock) : null;
    case 'chart':
      return str(raw['title']) && list(raw['bars'], LIMITS.bars, isBar)
        ? (raw as unknown as KnownBlock)
        : null;
    case 'table': {
      if (!str(raw['title']) || !str(raw['rowKey'])) return null;
      if (!list(raw['columns'], LIMITS.columns, isColumn)) return null;
      if (!list(raw['rows'], LIMITS.rows, isRow)) return null;
      const rowKey = raw['rowKey'];
      const keys = raw['rows'].map((row) => row[rowKey]);
      // AD-9: satır anahtarı kararlı ve tekil olmalı.
      if (keys.some((key) => key === undefined) || new Set(keys).size !== keys.length) return null;
      return raw as unknown as KnownBlock;
    }
    case 'confirm':
      return str(raw['id']) &&
        str(raw['title']) &&
        str(raw['detail'], false) &&
        str(raw['confirmLabel']) &&
        str(raw['cancelLabel']) &&
        (raw['danger'] === undefined || typeof raw['danger'] === 'boolean')
        ? (raw as unknown as KnownBlock)
        : null;
    case 'form':
      return str(raw['id']) &&
        str(raw['title']) &&
        str(raw['submitLabel']) &&
        str(raw['cancelLabel'], false) &&
        list(raw['fields'], LIMITS.fields, isField)
        ? (raw as unknown as KnownBlock)
        : null;
    case 'choices':
      return list(raw['items'], LIMITS.items, isChoice) ? (raw as unknown as KnownBlock) : null;
    default:
      return null;
  }
}

export function parseBlock(raw: unknown): GenUIBlock {
  if (!isObj(raw)) return { type: 'unknown', raw };
  return validate(raw) ?? { type: 'unknown', raw };
}

/** `ui` alanını doğrular. Dizi değilse tek bir JSON bloğu döner. */
export function parseBlocks(raw: unknown): GenUIBlock[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) return [{ type: 'unknown', raw }];
  return raw.slice(0, LIMITS.blocks).map(parseBlock);
}
