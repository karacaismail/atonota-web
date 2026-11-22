import { ArrowClockwise } from '@phosphor-icons/react';
import { Button, Select } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { RecordApiError } from '../adapter';
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
  const [searchError, setSearchError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const seqRef = useRef(0);
  const lastQueryRef = useRef('');

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

      lastQueryRef.current = searchText;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      seqRef.current += 1;
      const requestId = seqRef.current;
      setSearching(true);
      setSearchError(null);

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
          setSearchError(null);
          setSearching(false);
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted || requestId !== seqRef.current) {
            return;
          }
          setOptions([]);
          setSearchError(
            err instanceof RecordApiError
              ? err.message
              : formatRecordMessage(locale, 'networkError'),
          );
          setSearching(false);
        });
    },
    [adapter, field.fieldname, locale, readOnly, referenceDoctype, targetDoctype],
  );

  const normalizedValue = typeof value === 'string' && value.length > 0 ? value : undefined;

  const selectOptions = useMemo(() => {
    if (searchError) {
      return [];
    }
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
  }, [normalizedValue, options, searchError]);

  const isDisabled = readOnly || targetDoctype.trim().length === 0;
  const placeholder =
    placeholderOverride ??
    (targetDoctype.trim().length > 0
      ? formatRecordMessage(locale, 'linkSearchPlaceholder', { doctype: targetDoctype })
      : formatRecordMessage(locale, 'linkSelectTargetFirst'));

  const notFoundNode = searching ? (
    formatRecordMessage(locale, 'linkSearching')
  ) : searchError ? (
    <div className="rv-link-error-popup" role="alert">
      <span>{searchError}</span>
      <Button
        size="small"
        icon={<ArrowClockwise weight="regular" />}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => executeServerSearch(lastQueryRef.current)}
      >
        {formatRecordMessage(locale, 'retryAction')}
      </Button>
    </div>
  ) : (
    formatRecordMessage(locale, 'linkNoResults')
  );

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
      notFoundContent={notFoundNode}
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
