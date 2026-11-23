import { ArrowClockwise } from '@phosphor-icons/react';
import { Button, Select } from 'antd';
import { useMemo } from 'react';

import { formatRecordMessage } from '../messages';
import type { DocField, RecordDataAdapter, RecordLocale } from '../types';
import type { FieldControlA11yProps } from './FieldShell';
import { useLinkSearch } from './useLinkSearch';

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

  const search = useLinkSearch({
    targetDoctype,
    referenceDoctype,
    linkFieldname: field.fieldname,
    readOnly,
    locale,
    adapter,
  });

  const normalizedValue = typeof value === 'string' && value.length > 0 ? value : undefined;

  const selectOptions = useMemo(() => {
    if (search.searchError) {
      return [];
    }
    const mapped = search.options.map((opt) => ({
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
  }, [normalizedValue, search.options, search.searchError]);

  const isDisabled = readOnly || targetDoctype.trim().length === 0;
  const placeholder =
    placeholderOverride ??
    (targetDoctype.trim().length > 0
      ? formatRecordMessage(locale, 'linkSearchPlaceholder', { doctype: targetDoctype })
      : formatRecordMessage(locale, 'linkSelectTargetFirst'));

  const notFoundNode = search.searching
    ? formatRecordMessage(locale, 'linkSearching')
    : search.searchError
      ? null
      : formatRecordMessage(locale, 'linkNoResults');

  return (
    <div className="rv-signature-pad">
      <Select<string | undefined>
        id={a11y.controlId}
        aria-labelledby={a11y.labelId}
        aria-describedby={a11y.ariaDescribedBy}
        aria-invalid={a11y.ariaInvalid}
        size="middle"
        style={{ width: '100%' }}
        showSearch
        autoClearSearchValue={search.searchError === null}
        filterOption={false}
        allowClear={!required && !isDisabled}
        disabled={isDisabled}
        loading={search.searching}
        open={search.dropdownOpen && search.searchError === null}
        placeholder={placeholder}
        value={normalizedValue}
        options={selectOptions}
        notFoundContent={notFoundNode}
        onOpenChange={search.handleOpenChange}
        onSearch={search.handleSearchInput}
        onInputKeyDown={search.handleInputKeyDown}
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
      {search.searchError ? (
        <div className="rv-link-error-popup" role="alert">
          <span>{search.searchError}</span>
          <Button
            size="small"
            icon={<ArrowClockwise weight="regular" />}
            onClick={search.handleRetry}
          >
            {formatRecordMessage(locale, 'retryAction')}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
