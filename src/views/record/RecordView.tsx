import './RecordView.css';

import {
  CaretDown,
  CaretRight,
  CheckCircle,
  FloppyDisk,
  WarningCircle,
} from '@phosphor-icons/react';
import { Button, ConfigProvider, Tabs } from 'antd';
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { createFrappeRecordAdapter, RecordApiError } from './adapter';
import { CatalogField } from './catalog';
import { CATALOG_VERSION } from './catalogRegistry';
import { buildFormLayout, isLayoutBreakFieldType, type LayoutSection } from './layout';
import { formatRecordMessage } from './messages';
import { RecordErrorBoundary } from './RecordErrorBoundary';
import { RecordNavigator } from './RecordNavigator';
import {
  EmptyRecordState,
  ErrorRecordState,
  LoadingRecordState,
  UnauthorizedRecordState,
} from './RecordStates';
import { SchemaValidationError, validateRecordAgainstMeta } from './schema';
import { buildRecordAntdTheme, buildRecordCssVariables, type RecordThemeMode } from './tokens';
import type {
  DocField,
  DocTypeMeta,
  RecordConflictInfo,
  RecordDataAdapter,
  RecordDocument,
  RecordLocale,
  RecordScreenState,
  SiteFormatting,
} from './types';
import { computeDirtyFields, validateRecordDraft } from './validation';

const PHONE_MAX_WIDTH_PX = 767;

function useIsPhoneViewport(): boolean {
  const [isPhone, setIsPhone] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return true;
    }
    return window.innerWidth <= PHONE_MAX_WIDTH_PX;
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }
    const handleResize = () => {
      setIsPhone(window.innerWidth <= PHONE_MAX_WIDTH_PX);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return isPhone;
}

function buildInitialNewRecord(meta: DocTypeMeta): RecordDocument {
  const initial: RecordDocument = { name: '' };
  for (const field of meta.schema.fields) {
    if (isLayoutBreakFieldType(field.fieldtype)) {
      continue;
    }
    if (field.default !== undefined && field.default !== null) {
      initial[field.fieldname] = field.default;
    } else if (field.fieldtype === 'Table' || field.fieldtype === 'Table MultiSelect') {
      initial[field.fieldname] = [];
    } else if (field.fieldtype === 'Check') {
      initial[field.fieldname] = 0;
    }
  }
  return initial;
}

export interface RecordNavigatorConfig {
  currentIndex: number;
  totalCount: number;
  onNavigate?: ((nextIndex: number) => void) | undefined;
}

export interface RecordViewProps {
  doctype: string;
  name?: string | undefined;
  createMode?: boolean | undefined;
  adapter?: RecordDataAdapter | undefined;
  locale?: RecordLocale | undefined;
  themeMode?: RecordThemeMode | undefined;
  formatting?: SiteFormatting | undefined;
  breadcrumbs?: readonly string[] | undefined;
  navigator?: RecordNavigatorConfig | undefined;
  onSaved?: ((record: RecordDocument) => void) | undefined;
  onCreateNew?: (() => void) | undefined;
  onSignIn?: (() => void) | undefined;
}

function RecordSectionCard(props: {
  section: LayoutSection;
  collapsed: boolean;
  onToggleCollapse: () => void;
  effectiveDoc: Readonly<Record<string, unknown>>;
  baseRecord: Readonly<Record<string, unknown>>;
  doctype: string;
  meta: DocTypeMeta;
  adapter: RecordDataAdapter;
  locale: RecordLocale;
  formatting?: SiteFormatting | undefined;
  isExistingRecord: boolean;
  isRecordReadOnly: boolean;
  dirtySet: ReadonlySet<string>;
  fieldErrors: Readonly<Record<string, string>>;
  isSaving: boolean;
  onFieldChange: (fieldname: string, nextValue: unknown) => void;
  onFieldAction: (field: DocField) => void;
}) {
  const {
    section,
    collapsed,
    onToggleCollapse,
    effectiveDoc,
    baseRecord,
    doctype,
    meta,
    adapter,
    locale,
    formatting,
    isExistingRecord,
    isRecordReadOnly,
    dirtySet,
    fieldErrors,
    isSaving,
    onFieldChange,
    onFieldAction,
  } = props;

  const gridStyle = {
    '--rv-section-cols': String(section.effectiveColumnCount),
  } as CSSProperties;

  return (
    <section className="rv-section-card" aria-label={section.label ?? meta.schema.name}>
      {section.label ? (
        <div className="rv-section-header">
          <h2 className="rv-section-title">{section.label}</h2>
          {section.collapsible ? (
            <Button
              size="small"
              type="text"
              icon={collapsed ? <CaretRight weight="regular" /> : <CaretDown weight="regular" />}
              aria-expanded={!collapsed}
              aria-label={formatRecordMessage(locale, 'sectionCollapseToggle', {
                label: section.label,
              })}
              onClick={onToggleCollapse}
            />
          ) : null}
        </div>
      ) : null}

      {section.description && !collapsed ? (
        <p className="rv-section-description">{section.description}</p>
      ) : null}

      {!collapsed ? (
        <div className="rv-section-grid" style={gridStyle}>
          {section.columns.map((col) => (
            <div key={col.key} className="rv-column">
              {col.label ? <h3 className="rv-column-title">{col.label}</h3> : null}
              {col.fields.map((field) => (
                <CatalogField
                  key={field.fieldname}
                  field={field}
                  value={effectiveDoc[field.fieldname]}
                  doc={effectiveDoc}
                  doctype={doctype}
                  meta={meta}
                  adapter={adapter}
                  locale={locale}
                  formatting={formatting}
                  catalogVersion={meta.catalog_version}
                  isExistingRecord={isExistingRecord}
                  baseValue={baseRecord[field.fieldname]}
                  parentReadOnly={isRecordReadOnly}
                  isDirty={dirtySet.has(field.fieldname)}
                  isSubmitting={isSaving}
                  error={fieldErrors[field.fieldname]}
                  onChange={onFieldChange}
                  onFieldAction={onFieldAction}
                />
              ))}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function RecordViewBody(props: RecordViewProps) {
  const {
    doctype,
    name,
    createMode = false,
    adapter: externalAdapter,
    locale = 'tr',
    formatting,
    breadcrumbs,
    navigator: navigatorCfg,
    onSaved,
    onCreateNew,
    onSignIn,
  } = props;

  const defaultAdapter = useMemo(() => createFrappeRecordAdapter({ locale }), [locale]);
  const adapter = externalAdapter ?? defaultAdapter;
  const isPhoneViewport = useIsPhoneViewport();

  const [screenState, setScreenState] = useState<RecordScreenState>(() =>
    !name && !createMode ? { status: 'empty', reason: 'no_record' } : { status: 'loading' },
  );
  const [reloadNonce, setReloadNonce] = useState(0);

  // RE-5: Server record stays in screenState; only user draft overrides live in draftEdits.
  const [draftEdits, setDraftEdits] = useState<Record<string, unknown>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<RecordConflictInfo | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [activeTabKey, setActiveTabKey] = useState<string | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);

  const requestSeqRef = useRef(0);
  const savingLockRef = useRef(false);

  useEffect(() => {
    setDraftEdits({});
    setFieldErrors({});
    setActionError(null);
    setConflict(null);
    setCollapsedSections({});
    setActiveTabKey(undefined);

    if (!name && !createMode) {
      setScreenState({ status: 'empty', reason: 'no_record' });
      return undefined;
    }

    const controller = new AbortController();
    requestSeqRef.current += 1;
    const currentSeq = requestSeqRef.current;
    setScreenState({ status: 'loading' });

    const load = async () => {
      try {
        const metaPromise = adapter.getDocTypeMeta({
          doctype,
          language: locale,
          signal: controller.signal,
        });

        if (createMode || !name) {
          const meta = await metaPromise;
          if (controller.signal.aborted || currentSeq !== requestSeqRef.current) {
            return;
          }
          if (meta.truncated) {
            setScreenState({
              status: 'error',
              code: 'truncated_meta',
              message: formatRecordMessage(locale, 'errorTruncatedMeta'),
            });
            return;
          }
          setScreenState({
            status: 'ready',
            meta,
            record: buildInitialNewRecord(meta),
          });
          return;
        }

        const [meta, record] = await Promise.all([
          metaPromise,
          adapter.getRecord({ doctype, name, signal: controller.signal }),
        ]);

        if (controller.signal.aborted || currentSeq !== requestSeqRef.current) {
          return;
        }

        if (meta.truncated) {
          setScreenState({
            status: 'error',
            code: 'truncated_meta',
            message: formatRecordMessage(locale, 'errorTruncatedMeta'),
          });
          return;
        }

        let validatedRecord: RecordDocument;
        try {
          validatedRecord = validateRecordAgainstMeta(record, meta);
        } catch (err) {
          if (err instanceof SchemaValidationError) {
            setScreenState({
              status: 'error',
              code: 'invalid_response',
              message: formatRecordMessage(locale, 'invalidServerResponse'),
            });
            return;
          }
          throw err;
        }

        setScreenState({
          status: 'ready',
          meta,
          record: validatedRecord,
        });
      } catch (err) {
        if (controller.signal.aborted || currentSeq !== requestSeqRef.current) {
          return;
        }
        if (err instanceof RecordApiError) {
          if (err.code === 'unauthorized') {
            setScreenState({ status: 'unauthorized', reason: 'permission_denied' });
            return;
          }
          if (err.code === 'session_expired') {
            setScreenState({ status: 'unauthorized', reason: 'session_expired' });
            return;
          }
          if (err.code === 'not_found') {
            setScreenState({ status: 'empty', reason: 'not_found' });
            return;
          }
          setScreenState({
            status: 'error',
            code: err.code,
            message: err.message,
          });
          return;
        }
        setScreenState({
          status: 'error',
          code: 'server_error',
          message: formatRecordMessage(locale, 'errorDefaultDescription'),
        });
      }
    };

    void load();

    return () => {
      controller.abort();
    };
  }, [adapter, createMode, doctype, locale, name, reloadNonce]);

  const handleFieldChange = useCallback((fieldname: string, nextValue: unknown) => {
    setDraftEdits((prev) => ({
      ...prev,
      [fieldname]: nextValue,
    }));
    setFieldErrors((prev) => {
      if (!(fieldname in prev)) {
        return prev;
      }
      const { [fieldname]: _removed, ...rest } = prev;
      return rest;
    });
  }, []);

  const handleDiscard = useCallback(() => {
    setDraftEdits({});
    setFieldErrors({});
    setActionError(null);
    setConflict(null);
  }, []);

  const readyMeta = screenState.status === 'ready' ? screenState.meta : undefined;
  const baseRecord = screenState.status === 'ready' ? screenState.record : undefined;

  const effectiveDoc = useMemo<Readonly<Record<string, unknown>>>(() => {
    if (!baseRecord) {
      return draftEdits;
    }
    return {
      ...baseRecord,
      ...draftEdits,
    };
  }, [baseRecord, draftEdits]);

  const dirtyFields = useMemo(() => {
    if (!readyMeta || !baseRecord) {
      return [];
    }
    return computeDirtyFields(readyMeta.schema.fields, baseRecord, effectiveDoc);
  }, [baseRecord, effectiveDoc, readyMeta]);

  const dirtySet = useMemo(() => new Set(dirtyFields), [dirtyFields]);
  const dirtyCount = dirtyFields.length;

  const layout = useMemo(() => {
    if (!readyMeta) {
      return { hasExplicitTabs: false, tabs: [] };
    }
    return buildFormLayout(readyMeta.schema.fields, {
      doc: effectiveDoc,
      isPhoneViewport,
      defaultTabLabel: formatRecordMessage(locale, 'defaultTabLabel'),
    });
  }, [effectiveDoc, isPhoneViewport, locale, readyMeta]);

  const handleSave = useCallback(async () => {
    if (screenState.status !== 'ready' || savingLockRef.current) {
      return;
    }
    const { meta, record } = screenState;

    const validationErrors = validateRecordDraft(meta, effectiveDoc, locale, {
      isExistingRecord: !createMode && record.name.length > 0,
      baseRecord: record,
    });

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      return;
    }

    savingLockRef.current = true;
    setIsSaving(true);
    setActionError(null);

    const payload: Record<string, unknown> = {};
    if (createMode || record.name.length === 0) {
      for (const field of meta.schema.fields) {
        if (!isLayoutBreakFieldType(field.fieldtype) && !field.read_only) {
          if (field.fieldname in effectiveDoc) {
            payload[field.fieldname] = effectiveDoc[field.fieldname];
          }
        }
      }
    } else {
      for (const fname of dirtyFields) {
        payload[fname] = effectiveDoc[fname];
      }
    }

    try {
      const saved = await adapter.saveRecord({
        doctype,
        name: createMode || record.name.length === 0 ? undefined : record.name,
        modified: record.modified,
        data: payload,
      });

      setScreenState({
        status: 'ready',
        meta,
        record: saved,
      });
      setDraftEdits({});
      setFieldErrors({});
      setConflict(null);
      onSaved?.(saved);
    } catch (err) {
      if (err instanceof RecordApiError) {
        if (err.code === 'conflict') {
          let latestServerRecord: RecordDocument | undefined;
          if (record.name.length > 0) {
            try {
              latestServerRecord = await adapter.getRecord({ doctype, name: record.name });
            } catch {
              latestServerRecord = undefined;
            }
          }
          // SZ-11: Preserve user draft values completely on conflict!
          setConflict({
            message: err.message,
            attemptedModified: record.modified ?? '',
            latestRecord: latestServerRecord,
          });
        } else if (err.code === 'validation') {
          if (err.fieldErrors) {
            setFieldErrors({ ...err.fieldErrors });
          }
          setActionError(err.message);
        } else if (err.code === 'session_expired') {
          setScreenState({ status: 'unauthorized', reason: 'session_expired' });
        } else if (err.code === 'unauthorized') {
          setScreenState({ status: 'unauthorized', reason: 'permission_denied' });
        } else {
          setActionError(err.message);
        }
      } else {
        setActionError(formatRecordMessage(locale, 'errorDefaultDescription'));
      }
    } finally {
      savingLockRef.current = false;
      setIsSaving(false);
    }
  }, [adapter, createMode, dirtyFields, doctype, effectiveDoc, locale, onSaved, screenState]);

  const handleFieldAction = useCallback(
    async (field: DocField) => {
      if (
        screenState.status !== 'ready' ||
        savingLockRef.current ||
        !adapter.runDocAction ||
        !screenState.record.name ||
        !screenState.record.modified
      ) {
        return;
      }
      savingLockRef.current = true;
      setIsSaving(true);
      setActionError(null);
      try {
        const actionName =
          field.options && field.options.trim().length > 0 ? field.options.trim() : field.fieldname;
        const updated = await adapter.runDocAction({
          doctype,
          name: screenState.record.name,
          action: actionName,
          modified: screenState.record.modified,
        });
        if (updated) {
          setScreenState({
            status: 'ready',
            meta: screenState.meta,
            record: updated,
          });
        }
      } catch (err) {
        setActionError(
          err instanceof RecordApiError
            ? err.message
            : formatRecordMessage(locale, 'errorDefaultDescription'),
        );
      } finally {
        savingLockRef.current = false;
        setIsSaving(false);
      }
    },
    [adapter, doctype, locale, screenState],
  );

  if (screenState.status === 'loading') {
    return <LoadingRecordState locale={locale} />;
  }

  if (screenState.status === 'empty') {
    return (
      <EmptyRecordState locale={locale} reason={screenState.reason} onCreateNew={onCreateNew} />
    );
  }

  if (screenState.status === 'unauthorized') {
    return (
      <UnauthorizedRecordState locale={locale} reason={screenState.reason} onSignIn={onSignIn} />
    );
  }

  if (screenState.status === 'error') {
    return (
      <ErrorRecordState
        locale={locale}
        message={screenState.message}
        onRetry={() => setReloadNonce((n) => n + 1)}
      />
    );
  }

  const { meta, record } = screenState;
  const titleField = meta.schema.title_field;
  const rawTitle = titleField ? effectiveDoc[titleField] : undefined;
  const displayTitle =
    typeof rawTitle === 'string' && rawTitle.trim().length > 0
      ? rawTitle.trim()
      : record.name.length > 0
        ? record.name
        : meta.schema.name;

  const isRecordReadOnly = record.docstatus === 1 || record.docstatus === 2;
  const hasWritableFields = meta.schema.fields.some(
    (f) => !isLayoutBreakFieldType(f.fieldtype) && !f.read_only,
  );
  const canEdit = !isRecordReadOnly && hasWritableFields;
  const isDirty = dirtyCount > 0;

  const crumbItems =
    breadcrumbs ??
    [meta.schema.module, meta.schema.name, record.name].filter(
      (item): item is string => typeof item === 'string' && item.length > 0,
    );

  const docstatusBadge =
    record.docstatus === 1
      ? {
          className: 'rv-pill rv-pill--success',
          text: formatRecordMessage(locale, 'statusSubmitted'),
        }
      : record.docstatus === 2
        ? {
            className: 'rv-pill rv-pill--danger',
            text: formatRecordMessage(locale, 'statusCancelled'),
          }
        : {
            className: 'rv-pill rv-pill--primary',
            text: formatRecordMessage(locale, 'statusDraft'),
          };

  const renderSections = (sections: readonly LayoutSection[]) =>
    sections.map((sec) => (
      <RecordSectionCard
        key={sec.key}
        section={sec}
        collapsed={collapsedSections[sec.key] === true}
        onToggleCollapse={() =>
          setCollapsedSections((prev) => ({
            ...prev,
            [sec.key]: prev[sec.key] !== true,
          }))
        }
        effectiveDoc={effectiveDoc}
        baseRecord={record}
        doctype={doctype}
        meta={meta}
        adapter={adapter}
        locale={locale}
        formatting={formatting}
        isExistingRecord={!createMode && record.name.length > 0}
        isRecordReadOnly={isRecordReadOnly}
        dirtySet={dirtySet}
        fieldErrors={fieldErrors}
        isSaving={isSaving}
        onFieldChange={handleFieldChange}
        onFieldAction={(f) => {
          void handleFieldAction(f);
        }}
      />
    ));

  return (
    <div>
      <header className="rv-header">
        {crumbItems.length > 0 ? (
          <nav className="rv-header-breadcrumbs" aria-label="Breadcrumb">
            {crumbItems.map((crumb, idx) => (
              <span key={`${crumb}-${idx}`}>
                {idx > 0 ? ' / ' : ''}
                {crumb}
              </span>
            ))}
          </nav>
        ) : null}

        <div className="rv-header-top">
          <div className="rv-header-title-group">
            <h1 className="rv-header-title">{displayTitle}</h1>
            <span className={docstatusBadge.className}>{docstatusBadge.text}</span>
            {isDirty ? (
              <span className="rv-sync-badge rv-sync-badge--dirty" role="status">
                <i className="rv-dirty-dot" aria-hidden="true" />
                {formatRecordMessage(locale, 'unsavedChangesCount', { count: dirtyCount })}
              </span>
            ) : (
              <span className="rv-sync-badge">
                <CheckCircle weight="regular" />
                {formatRecordMessage(locale, 'upToDateStatus')}
              </span>
            )}
          </div>

          <div className="rv-header-actions">
            {isDirty ? (
              <Button size="middle" disabled={isSaving} onClick={handleDiscard}>
                {formatRecordMessage(locale, 'discardAction')}
              </Button>
            ) : null}
            {canEdit ? (
              <Button
                size="middle"
                type="primary"
                icon={<FloppyDisk weight="regular" />}
                loading={isSaving}
                disabled={isSaving || (!isDirty && !createMode)}
                onClick={() => {
                  void handleSave();
                }}
              >
                {formatRecordMessage(locale, isSaving ? 'savingAction' : 'saveAction')}
              </Button>
            ) : null}
          </div>
        </div>

        {navigatorCfg ? (
          <div className="rv-header-toolbar">
            <RecordNavigator
              currentIndex={navigatorCfg.currentIndex}
              totalCount={navigatorCfg.totalCount}
              locale={locale}
              disabled={isSaving}
              hasUnsavedChanges={isDirty}
              onDiscardBeforeNavigate={handleDiscard}
              onNavigate={navigatorCfg.onNavigate}
            />
          </div>
        ) : null}
      </header>

      <div className="rv-body">
        {meta.catalog_version > CATALOG_VERSION ? (
          <div className="rv-banner rv-banner--warning" role="status">
            <span>
              {formatRecordMessage(locale, 'catalogVersionWarning', {
                serverVersion: meta.catalog_version,
                clientVersion: CATALOG_VERSION,
              })}
            </span>
          </div>
        ) : null}

        {conflict ? (
          <div className="rv-banner rv-banner--conflict" role="alert">
            <div className="rv-field-header">
              <WarningCircle weight="regular" />
              <strong>{formatRecordMessage(locale, 'conflictTitle')}</strong>
            </div>
            <span>{formatRecordMessage(locale, 'conflictDescription')}</span>
            {conflict.latestRecord?.modified ? (
              <span className="rv-field-help">
                {formatRecordMessage(locale, 'conflictServerVersion', {
                  version: conflict.latestRecord.modified,
                })}
              </span>
            ) : null}
            <div className="rv-banner-actions">
              <Button
                size="small"
                type="primary"
                onClick={() => {
                  if (conflict.latestRecord) {
                    setScreenState({
                      status: 'ready',
                      meta,
                      record: conflict.latestRecord,
                    });
                  }
                  setConflict(null);
                }}
              >
                {formatRecordMessage(locale, 'conflictKeepDraft')}
              </Button>
              {conflict.latestRecord ? (
                <Button
                  size="small"
                  onClick={() => {
                    if (conflict.latestRecord) {
                      setScreenState({
                        status: 'ready',
                        meta,
                        record: conflict.latestRecord,
                      });
                    }
                    setDraftEdits({});
                    setFieldErrors({});
                    setConflict(null);
                  }}
                >
                  {formatRecordMessage(locale, 'conflictReloadServer')}
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}

        {Object.keys(fieldErrors).length > 0 ? (
          <div className="rv-banner rv-banner--error" role="alert">
            <strong>{formatRecordMessage(locale, 'validationSummaryTitle')}</strong>
          </div>
        ) : null}

        {actionError ? (
          <div className="rv-banner rv-banner--error" role="alert">
            <span>{actionError}</span>
          </div>
        ) : null}

        {layout.hasExplicitTabs ? (
          <Tabs
            {...(activeTabKey !== undefined ? { activeKey: activeTabKey } : {})}
            onChange={(nextKey) => setActiveTabKey(nextKey)}
            items={layout.tabs.map((tab) => ({
              key: tab.key,
              label: tab.label,
              children: <div className="rv-column">{renderSections(tab.sections)}</div>,
            }))}
          />
        ) : (
          layout.tabs.map((tab) => (
            <div key={tab.key} className="rv-column">
              {renderSections(tab.sections)}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function RecordView(props: RecordViewProps) {
  const themeMode: RecordThemeMode = props.themeMode ?? 'light';
  const locale: RecordLocale = props.locale ?? 'tr';
  const [isKeyboardModality, setIsKeyboardModality] = useState(false);

  const antdThemeConfig = useMemo(() => buildRecordAntdTheme(themeMode), [themeMode]);
  const cssVars = useMemo(() => buildRecordCssVariables(themeMode), [themeMode]);

  return (
    <ConfigProvider theme={antdThemeConfig}>
      <div
        className="rv-root"
        data-theme={themeMode}
        data-rv-kbd={isKeyboardModality ? 'true' : 'false'}
        style={cssVars}
        onKeyDownCapture={(event) => {
          if (event.key === 'Tab') {
            setIsKeyboardModality(true);
          }
        }}
        onPointerDownCapture={() => {
          setIsKeyboardModality(false);
        }}
      >
        <RecordErrorBoundary locale={locale}>
          <RecordViewBody {...props} />
        </RecordErrorBoundary>
      </div>
    </ConfigProvider>
  );
}
