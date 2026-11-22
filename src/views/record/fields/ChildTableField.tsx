import { Plus, Trash } from '@phosphor-icons/react';
import { Button, Select, Table, type TableProps } from 'antd';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { isLayoutBreakFieldType } from '../layout';
import { formatRecordMessage } from '../messages';
import type { DocField, DocTypeMeta, LinkOption, RecordDataAdapter, RecordLocale } from '../types';
import type { FieldControlA11yProps } from './FieldShell';

export interface RenderChildCellParams {
  field: DocField;
  value: unknown;
  row: Readonly<Record<string, unknown>>;
  rowIndex: number;
  readOnly: boolean;
  onCellChange: (nextValue: unknown) => void;
}

export interface ChildTableFieldProps {
  field: DocField;
  value: unknown;
  parentDoc: Readonly<Record<string, unknown>>;
  meta: DocTypeMeta;
  readOnly: boolean;
  locale: RecordLocale;
  renderCell: (params: RenderChildCellParams) => ReactNode;
  onChange: (nextRows: Record<string, unknown>[]) => void;
}

export function ChildTableField(props: ChildTableFieldProps) {
  const { field, value, meta, readOnly, locale, renderCell, onChange } = props;
  const childSchema = field.options ? meta.child_tables[field.options] : undefined;

  const rowKeyMapRef = useRef(new WeakMap<object, string>());
  const keySeqRef = useRef(0);

  const getStableRowKey = useCallback((row: Record<string, unknown>): string => {
    if (typeof row['name'] === 'string' && row['name'].length > 0) {
      return row['name'];
    }
    const existing = rowKeyMapRef.current.get(row);
    if (existing) {
      return existing;
    }
    keySeqRef.current += 1;
    const generated = `client-row-${keySeqRef.current}`;
    rowKeyMapRef.current.set(row, generated);
    return generated;
  }, []);

  const rows: Record<string, unknown>[] = useMemo(() => {
    if (!Array.isArray(value)) {
      return [];
    }
    return value.filter(
      (item): item is Record<string, unknown> => typeof item === 'object' && item !== null,
    );
  }, [value]);

  if (!childSchema) {
    return (
      <div className="rv-unsupported-box" role="note">
        <span>{formatRecordMessage(locale, 'tableMissingSchema')}</span>
      </div>
    );
  }

  const dataFields = childSchema.fields.filter(
    (f) => !isLayoutBreakFieldType(f.fieldtype) && f.hidden !== true,
  );
  const listViewFields = dataFields.filter((f) => f.in_list_view === true);
  const visibleFields = listViewFields.length > 0 ? listViewFields : dataFields.slice(0, 5);

  const handleCellUpdate = (rowIndex: number, colFieldname: string, nextVal: unknown) => {
    const updated = rows.map((row, idx) => {
      if (idx !== rowIndex) {
        return row;
      }
      const prevKey = getStableRowKey(row);
      const nextRow: Record<string, unknown> = {
        ...row,
        [colFieldname]: nextVal,
      };
      rowKeyMapRef.current.set(nextRow, prevKey);
      return nextRow;
    });
    onChange(updated);
  };

  const handleAddRow = () => {
    const newRow: Record<string, unknown> = {};
    for (const childField of dataFields) {
      if (childField.default !== undefined && childField.default !== null) {
        newRow[childField.fieldname] = childField.default;
      }
    }
    getStableRowKey(newRow);
    onChange([...rows, newRow]);
  };

  const handleRemoveRow = (rowIndex: number) => {
    onChange(rows.filter((_, idx) => idx !== rowIndex));
  };

  const columns: NonNullable<TableProps<Record<string, unknown>>['columns']> = visibleFields.map(
    (colField) => ({
      key: colField.fieldname,
      title: colField.label ?? colField.fieldname,
      dataIndex: colField.fieldname,
      render: (_cellVal: unknown, row: Record<string, unknown>, rowIndex: number) =>
        renderCell({
          field: colField,
          value: row[colField.fieldname],
          row,
          rowIndex,
          readOnly: readOnly || colField.read_only,
          onCellChange: (nextVal) => handleCellUpdate(rowIndex, colField.fieldname, nextVal),
        }),
    }),
  );

  if (!readOnly) {
    columns.push({
      key: '_actions',
      title: '',
      width: 56,
      render: (_val: unknown, _row: Record<string, unknown>, rowIndex: number) => (
        <Button
          size="small"
          type="text"
          danger
          icon={<Trash weight="regular" />}
          aria-label={formatRecordMessage(locale, 'tableRemoveRow', { row: rowIndex + 1 })}
          onClick={() => handleRemoveRow(rowIndex)}
        />
      ),
    });
  }

  return (
    <div>
      <div className="rv-table-scroll">
        <Table<Record<string, unknown>>
          size="small"
          pagination={false}
          rowKey={getStableRowKey}
          columns={columns}
          dataSource={rows}
          locale={{ emptyText: formatRecordMessage(locale, 'tableEmpty') }}
        />
      </div>
      {!readOnly ? (
        <div className="rv-table-actions">
          <Button
            size="small"
            type="default"
            icon={<Plus weight="regular" />}
            onClick={handleAddRow}
          >
            {formatRecordMessage(locale, 'tableAddRow')}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export interface TableMultiSelectFieldProps {
  field: DocField;
  value: unknown;
  referenceDoctype: string;
  meta: DocTypeMeta;
  readOnly: boolean;
  locale: RecordLocale;
  adapter: RecordDataAdapter;
  a11y: FieldControlA11yProps;
  onChange: (nextRows: Record<string, unknown>[]) => void;
}

export function TableMultiSelectField(props: TableMultiSelectFieldProps) {
  const { field, value, referenceDoctype, meta, readOnly, locale, adapter, a11y, onChange } = props;
  const childSchema = field.options ? meta.child_tables[field.options] : undefined;
  const linkChildField = childSchema?.fields.find((f) => f.fieldtype === 'Link' && f.options);
  const targetDoctype = linkChildField?.options ?? '';
  const linkKey = linkChildField?.fieldname ?? 'value';

  const [options, setOptions] = useState<readonly LinkOption[]>([]);
  const [searching, setSearching] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const seqRef = useRef(0);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const rows = useMemo(() => {
    if (!Array.isArray(value)) {
      return [];
    }
    return value.filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null);
  }, [value]);

  const selectedValues = useMemo(() => {
    const out: string[] = [];
    for (const row of rows) {
      const cell = row[linkKey];
      if (typeof cell === 'string' && cell.length > 0) {
        out.push(cell);
      }
    }
    return out;
  }, [linkKey, rows]);

  const runSearch = useCallback(
    (txt: string) => {
      if (!targetDoctype || readOnly) {
        return;
      }
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      seqRef.current += 1;
      const reqId = seqRef.current;
      setSearching(true);

      void adapter
        .searchLink({
          doctype: targetDoctype,
          txt,
          referenceDoctype,
          linkFieldname: field.fieldname,
          signal: controller.signal,
        })
        .then((res) => {
          if (controller.signal.aborted || reqId !== seqRef.current) {
            return;
          }
          setOptions(res);
          setSearching(false);
        })
        .catch(() => {
          if (controller.signal.aborted || reqId !== seqRef.current) {
            return;
          }
          setOptions([]);
          setSearching(false);
        });
    },
    [adapter, field.fieldname, readOnly, referenceDoctype, targetDoctype],
  );

  const selectOptions = useMemo(() => {
    const mapped = options.map((o) => ({ value: o.value, label: o.label ?? o.value }));
    for (const sel of selectedValues) {
      if (!mapped.some((m) => m.value === sel)) {
        mapped.push({ value: sel, label: sel });
      }
    }
    return mapped;
  }, [options, selectedValues]);

  return (
    <Select<string[]>
      id={a11y.controlId}
      aria-labelledby={a11y.labelId}
      aria-describedby={a11y.ariaDescribedBy}
      aria-invalid={a11y.ariaInvalid}
      mode="multiple"
      size="middle"
      style={{ width: '100%' }}
      showSearch
      filterOption={false}
      disabled={readOnly || !targetDoctype}
      loading={searching}
      placeholder={
        targetDoctype
          ? formatRecordMessage(locale, 'linkSearchPlaceholder', { doctype: targetDoctype })
          : formatRecordMessage(locale, 'tableMissingSchema')
      }
      value={selectedValues}
      options={selectOptions}
      onOpenChange={(open) => {
        if (open) {
          runSearch('');
        }
      }}
      onSearch={runSearch}
      onChange={(nextSelected) => {
        const nextRows = nextSelected.map((val) => {
          const existing = rows.find((r) => r[linkKey] === val);
          return existing ? { ...existing } : { [linkKey]: val };
        });
        onChange(nextRows);
      }}
    />
  );
}
