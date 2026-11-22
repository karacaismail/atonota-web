import { CaretDown, Check } from '@phosphor-icons/react';
import { Button, ConfigProvider, Input, Select, theme } from 'antd';
import trTR from 'antd/locale/tr_TR';
import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CollectionState } from './CollectionState';
import { TableView } from './TableView';
import { collectionTheme, collectionVariables, collectionViewOptions } from './collection-theme';
import { parsePage } from './model';
import { readQuery, toListRequest, writeQuery } from './query';
import { CollectionError } from './types';
import type {
  CollectionDefinition,
  CollectionPage,
  CollectionQuery,
  CollectionSource,
  ViewType,
} from './types';
import { useCollectionInteractions } from './useCollectionInteractions';
import './collection.css';

const heavyViews = {
  kanban: lazy(() => import('./views/KanbanView')),
  pivot: lazy(() => import('./views/PivotView')),
  report: lazy(() => import('./views/ReportView')),
  gantt: lazy(() => import('./views/GanttView')),
  timesheet: lazy(() => import('./views/TimesheetView')),
};
class ViewBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override componentDidCatch(_error: Error, _info: ErrorInfo) {
    /* Errors are presented without raw server or bundler details. */
  }
  override render() {
    return this.state.failed ? (
      <div role="alert">
        <p>Görünüm yüklenemedi.</p>
        <Button
          onClick={() => {
            window.location.reload();
          }}
        >
          Sayfayı yenile
        </Button>
      </div>
    ) : (
      this.props.children
    );
  }
}
export interface CollectionViewProps {
  definition: CollectionDefinition;
  source: CollectionSource;
  mode?: 'dark' | 'light';
}
interface Result {
  key: string;
  source: CollectionSource;
  definition: CollectionDefinition;
  status: 'ready' | 'error' | 'unauthorized';
  page?: CollectionPage;
}
function CollectionContent({ definition, source, mode = 'dark' }: CollectionViewProps) {
  const [params, setParams] = useSearchParams();
  const query = useMemo(() => readQuery(params, definition), [params, definition]);
  const [draft, setDraft] = useState<{ search: string; base: string }>({
    search: query.search,
    base: query.search,
  });
  const search = draft.base === query.search ? draft.search : query.search;
  const request = useMemo(() => toListRequest(definition, query), [definition, query]);
  const [retry, setRetry] = useState(0);
  const key = JSON.stringify(request) + retry;
  const [result, setResult] = useState<Result>();
  const [selection, setSelection] = useState<{
    key: string;
    names: string[];
    source: CollectionSource;
    definition: CollectionDefinition;
  }>({
    key: '',
    names: [],
    source,
    definition,
  });
  const [inspect, setInspect] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const keyboard = useCollectionInteractions(root);
  const { token } = theme.useToken();
  const titleId = useId();
  const contentId = useId();
  const current =
    result?.key === key && result.source === source && result.definition === definition
      ? result
      : undefined;
  const page = current?.status === 'ready' ? current.page : undefined;
  const scope = key + query.view;
  const selected =
    selection.key === scope &&
    selection.source === source &&
    selection.definition === definition &&
    page
      ? selection.names.filter((name) => page.data.some((row) => row.name === name))
      : [];
  function update(patch: Partial<CollectionQuery>) {
    if (patch.search !== undefined) setDraft({ base: patch.search, search: patch.search });
    setParams(writeQuery(params, { ...query, page: 1, ...patch }));
    setInspect(false);
  }
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    void Promise.resolve()
      .then(() => source.list(request, controller.signal))
      .then((response) => {
        if (active)
          setResult({ key, source, definition, status: 'ready', page: parsePage(response) });
      })
      .catch((error: unknown) => {
        if (active && !controller.signal.aborted)
          setResult({
            key,
            source,
            definition,
            status:
              error instanceof CollectionError && error.kind === 'unauthorized'
                ? 'unauthorized'
                : 'error',
          });
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [key, source, request, definition, retry]);
  const HeavyView = query.view === 'table' ? undefined : heavyViews[query.view];
  const activeFilter = definition.columns.find((field) => field.fieldname === query.filter);
  const activeFilterValue =
    activeFilter?.choices.find((choice) => choice.value === query.value)?.label ?? query.value;
  const filterFields = definition.columns.filter(
    (field) => field.filterable && field.choices.length > 0,
  );
  return (
    <div
      ref={root}
      className="collection"
      data-collection-keyboard={keyboard}
      style={collectionVariables(token, mode)}
    >
      <section aria-labelledby={titleId}>
        <header className="collection-header">
          <div>
            <p className="collection-eyebrow">Kayıtlar</p>
            <h1 id={titleId}>{definition.doctype}</h1>
            {definition.sensitivity === 'restricted' && <p>Hassas kayıtlar</p>}
          </div>
          {source.kind === 'example' && <span className="collection-example">Örnek veri</span>}
        </header>
        <form
          role="search"
          className="collection-search"
          onSubmit={(event) => {
            event.preventDefault();
            update({ search });
          }}
        >
          <label className="collection-grow">
            <span>Kayıt ara</span>
            <Input
              aria-label="Kayıt ara"
              value={search}
              maxLength={200}
              suffix={<span className="collection-hit-suffix" />}
              onChange={(event) => {
                setDraft({ base: query.search, search: event.target.value });
              }}
            />
          </label>
          <Button htmlType="submit">Ara</Button>
        </form>
        <div className="collection-tools">
          <label>
            <span>Görünüm</span>
            <Select
              suffixIcon={<CaretDown weight="regular" aria-hidden />}
              menuItemSelectedIcon={<Check weight="regular" aria-hidden />}
              dropdownAlign={{ offset: [0, 0] }}
              aria-label="Görünüm"
              value={query.view}
              options={collectionViewOptions}
              onChange={(view: ViewType) => {
                update({ view, page: query.page });
              }}
              virtual={false}
              getPopupContainer={(trigger) => trigger.parentElement ?? trigger}
            />
          </label>
          <label>
            <span>Sıralama alanı</span>
            <Select
              suffixIcon={<CaretDown weight="regular" aria-hidden />}
              menuItemSelectedIcon={<Check weight="regular" aria-hidden />}
              dropdownAlign={{ offset: [0, 0] }}
              aria-label="Sıralama alanı"
              value={query.sort}
              options={definition.columns.map((field) => ({
                value: field.fieldname,
                label: field.label,
              }))}
              onChange={(sort: string) => {
                update({ sort });
              }}
              virtual={false}
              getPopupContainer={(trigger) => trigger.parentElement ?? trigger}
            />
          </label>
          <label>
            <span>Sıralama yönü</span>
            <Select
              suffixIcon={<CaretDown weight="regular" aria-hidden />}
              menuItemSelectedIcon={<Check weight="regular" aria-hidden />}
              dropdownAlign={{ offset: [0, 0] }}
              aria-label="Sıralama yönü"
              value={query.direction}
              options={[
                { value: 'asc', label: 'Artan' },
                { value: 'desc', label: 'Azalan' },
              ]}
              onChange={(direction: 'asc' | 'desc') => {
                update({ direction });
              }}
              virtual={false}
              getPopupContainer={(trigger) => trigger.parentElement ?? trigger}
            />
          </label>
          {filterFields.map((field) => (
            <label key={field.fieldname}>
              <span>{field.label}</span>
              <Select
                suffixIcon={<CaretDown weight="regular" aria-hidden />}
                menuItemSelectedIcon={<Check weight="regular" aria-hidden />}
                dropdownAlign={{ offset: [0, 0] }}
                aria-label={field.label}
                value={query.filter === field.fieldname ? query.value : ''}
                options={[{ value: '', label: 'Tümü' }, ...field.choices]}
                onChange={(value: string) => {
                  update({ filter: value ? field.fieldname : '', value });
                }}
                virtual={false}
                getPopupContainer={(trigger) => trigger.parentElement ?? trigger}
              />
            </label>
          ))}
        </div>
        {(query.search || query.filter) && (
          <div className="collection-applied">
            <p>{query.search ? '"' + query.search + '" metni aranıyor.' : 'Arama metni yok.'}</p>
            <p>
              {activeFilter
                ? activeFilter.label + ' alanında "' + activeFilterValue + '" değeri aranıyor.'
                : 'Etkin süzgeç yok.'}
            </p>
            <Button
              onClick={() => {
                setDraft({ search: '', base: '' });
                update({ search: '', filter: '', value: '' });
              }}
            >
              Süzgeçleri temizle
            </Button>
          </div>
        )}
        {selected.length > 0 && query.view === 'table' && (
          <div role="toolbar" aria-label="Seçilen kayıtlar" className="collection-bulk">
            <strong>{selected.length} kayıt seçildi.</strong>
            <Button
              aria-expanded={inspect}
              aria-controls={contentId + '-selection'}
              onClick={() => {
                setInspect(!inspect);
              }}
            >
              Seçilenleri göster
            </Button>
            <Button
              onClick={() => {
                setSelection({ key: scope, names: [], source, definition });
                setInspect(false);
              }}
            >
              Seçimi kaldır
            </Button>
          </div>
        )}
        {inspect && selected.length > 0 && (
          <ul id={contentId + '-selection'}>
            {selected.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        )}
        <div id={contentId} role="region" aria-label="Koleksiyon içeriği" aria-busy={!current}>
          {!current ? (
            <CollectionState state="loading" />
          ) : current.status !== 'ready' ? (
            <CollectionState
              state={current.status}
              onRetry={() => {
                setRetry((value) => value + 1);
              }}
            />
          ) : !page?.data.length ? (
            <CollectionState state="empty" />
          ) : (
            <ViewBoundary key={query.view}>
              <Suspense fallback={<CollectionState state="loading" />}>
                {HeavyView ? (
                  <HeavyView definition={definition} rows={page.data} />
                ) : (
                  <TableView
                    definition={definition}
                    rows={page.data}
                    selected={selected}
                    onSelect={(names) => {
                      setSelection({ key: scope, names, source, definition });
                    }}
                  />
                )}
              </Suspense>
            </ViewBoundary>
          )}
        </div>
        <nav aria-label="Kayıt sayfaları" className="collection-pagination">
          <p>
            {query.page}. sayfa
            {page?.total !== undefined ? '. Toplam ' + page.total + ' kayıt.' : '.'}
          </p>
          <div className="collection-page-actions">
            <Button
              disabled={query.page <= 1 || !current || current.status !== 'ready'}
              onClick={() => {
                update({ page: query.page - 1 });
              }}
            >
              Önceki sayfa
            </Button>
            <Button
              disabled={!page?.has_next_page}
              onClick={() => {
                update({ page: query.page + 1 });
              }}
            >
              Sonraki sayfa
            </Button>
          </div>
          <label>
            <span>Sayfadaki kayıt sayısı</span>
            <Select
              suffixIcon={<CaretDown weight="regular" aria-hidden />}
              menuItemSelectedIcon={<Check weight="regular" aria-hidden />}
              dropdownAlign={{ offset: [0, 0] }}
              aria-label="Sayfadaki kayıt sayısı"
              value={query.size}
              options={[10, 20, 50].map((value) => ({ value, label: String(value) }))}
              onChange={(size: number) => {
                update({ size });
              }}
              virtual={false}
              getPopupContainer={(trigger) => trigger.parentElement ?? trigger}
            />
          </label>
        </nav>
      </section>
    </div>
  );
}
function subscribeMotion(callback: () => void) {
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  media.addEventListener('change', callback);
  return () => {
    media.removeEventListener('change', callback);
  };
}
function getReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
export function CollectionView({ mode = 'dark', ...props }: CollectionViewProps) {
  const reducedMotion = useSyncExternalStore(subscribeMotion, getReducedMotion, () => false);
  return (
    <ConfigProvider
      locale={trTR}
      theme={collectionTheme(mode, reducedMotion)}
      wave={{ disabled: true }}
    >
      <CollectionContent {...props} mode={mode} />
    </ConfigProvider>
  );
}
