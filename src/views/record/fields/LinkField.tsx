import { Select } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { formatRecordMessage } from '../messages';
import type { DocField, LinkOption, RecordDataAdapter, RecordLocale } from '../types';
import type { FieldControlA11yProps } from './FieldShell';

export interface LinkFieldProps {
  field: DocField;
  targetDoctype: string;
  referenceDoctype: string;
  value: string | null | undefined;
  readOnly: boolean;
  required: boolean;
  locale: RecordLocale;
  adapter: RecordDataAdapter;
  a11y: FieldControlA11yProps;
  placeholderOverride?: string | undefined;
  onChange: (nextValue: string | null) => void;
}

export function LinkField(props: LinkFieldProps) {
  const {
    field,
    targetDoctype,
    referenceDoctype,
    value,
    readOnly,
    required,
    locale,
    adapter,
    a11y,
    placeholderOverride,
    onChange,
  } = props;

  const [options, setOptions] = useState<readonly LinkOption[]>([]);
  const [searching, setSearching] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const seqRef = useRef(0);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const executeServerSearch = useCallback(
    (searchText: string) => {
      const cleanTarget = targetDoctype.trim();
      if (!cleanTarget || readOnly) {
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      seqRef.current += 1;
      const requestId = seqRef.current;
      setSearching(true);

      void adapter
        .searchLink({
          doctype: cleanTarget,
          txt: searchText,
          referenceDoctype,
          linkFieldname: field.fieldname,
          signal: controller.signal,
        })
        .then((results) => {
          if (controller.signal.aborted || requestId !== seqRef.current) {
            return;
          }
          setOptions(results);
          setSearching(false);
        })
        .catch(() => {
          if (controller.signal.aborted || requestId !== seqRef.current) {
            return;
          }
          setOptions([]);
          setSearching(false);
        });
    },
    [adapter, field.fieldname, readOnly, referenceDoctype, targetDoctype],
  );

  const normalizedValue = typeof value === 'string' && value.length > 0 ? value : undefined;

  const selectOptions = useMemo(() => {
    const mapped = options.map((opt) => ({
      value: opt.value,
      label: opt.label ?? opt.value,
      description: opt.description,
    }));
    if (normalizedValue && !mapped.some((item) => item.value === normalizedValue)) {
      mapped.unshift({
        value: normalizedValue,
        label: normalizedValue,
        description: undefined,
      });
    }
    return mapped;
  }, [normalizedValue, options]);

  const isDisabled = readOnly || targetDoctype.trim().length === 0;
  const placeholder =
    placeholderOverride ??
    (targetDoctype.trim().length > 0
      ? formatRecordMessage(locale, 'linkSearchPlaceholder', { doctype: targetDoctype })
      : formatRecordMessage(locale, 'linkSelectTargetFirst'));

  return (
    <Select<string | undefined>
      id={a11y.controlId}
      aria-labelledby={a11y.labelId}
      aria-describedby={a11y.ariaDescribedBy}
      aria-invalid={a11y.ariaInvalid}
      size="middle"
      style={{ width: '100%' }}
      showSearch
      filterOption={false}
      allowClear={!required && !isDisabled}
      disabled={isDisabled}
      loading={searching}
      placeholder={placeholder}
      value={normalizedValue}
      options={selectOptions}
      notFoundContent={
        searching
          ? formatRecordMessage(locale, 'linkSearching')
          : formatRecordMessage(locale, 'linkNoResults')
      }
      onOpenChange={(open) => {
        if (open) {
          executeServerSearch('');
        }
      }}
      onSearch={(txt) => {
        executeServerSearch(txt);
      }}
      onChange={(nextVal) => {
        onChange(nextVal ?? null);
      }}
      optionRender={(oriOption) => {
        const desc = (oriOption.data as { description?: string | undefined }).description;
        return (
          <div className="rv-link-option">
            <span>{oriOption.label}</span>
            {desc ? <span className="rv-link-option-desc">{desc}</span> : null}
          </div>
        );
      }}
    />
  );
}
