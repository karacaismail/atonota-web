import { Table } from 'antd';
import type { CheckboxProps, TableColumnsType } from 'antd';
import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import type { HeaderState } from '../header/PageHeader';
import { PageHeader } from '../header/PageHeader';
import { formatNumber, t } from '../messages';
import { queryKeys, routes } from '../routes';
import type { SampleRow } from '../sampleData';
import { findGroup, findLeaf } from '../sampleData';
import type { ViewType } from '../tokens';
import { shellTokens } from '../tokens';
import type { DemoState } from './useSampleCollection';
import { useSampleCollection, useSecondsSince } from './useSampleCollection';

const VIEW_VALUES = new Set<string>(shellTokens.header.viewTypes.map((v) => v.value));
const DEMO: Record<string, DemoState> = {
  canli: 'live',
  yukleniyor: 'loading',
  bos: 'empty',
  hata: 'error',
};

const currency = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' });

const columns: TableColumnsType<SampleRow> = [
  { title: 'Kayıt', dataIndex: 'name', key: 'name', width: 120 },
  { title: 'Başlık', dataIndex: 'title', key: 'title', width: 160 },
  { title: 'Kişi', dataIndex: 'party', key: 'party', width: 150 },
  { title: 'Durum', dataIndex: 'status', key: 'status', width: 120 },
  {
    title: 'Tutar',
    dataIndex: 'amount',
    key: 'amount',
    width: 140,
    align: 'right',
    render: (v: number) => <span className="shell-num">{currency.format(v)}</span>,
  },
  { title: 'Tarih', dataIndex: 'date', key: 'date', width: 120 },
];

/** antd satır kutusu adı. Kutu kalan özellikleri girdiye geçirir. */
function checkboxLabel(label: string): Partial<CheckboxProps> {
  const props: Record<string, string> = { 'aria-label': label };
  return props;
}

export function CollectionPage() {
  const { module = '', doctype = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const rawView = params.get(queryKeys.view) ?? 'table';
  const view: ViewType = VIEW_VALUES.has(rawView) ? (rawView as ViewType) : 'table';
  const demo: DemoState = DEMO[params.get(queryKeys.demoState) ?? ''] ?? 'normal';
  const search = params.get(queryKeys.search) ?? '';
  const leaf = findLeaf(module, doctype);
  const group = findGroup(module);
  const title = leaf?.label ?? doctype;
  const data = useSampleCollection(doctype, demo);
  const [selected, setSelected] = useState<React.Key[]>([]);
  const [filters, setFilters] = useState([{ key: 'durum', label: 'Durum: Gönderildi' }]);
  const seconds = useSecondsSince(data.loadedAt, demo === 'live');

  const rows = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('tr-TR');
    if (!q) return data.rows;
    return data.rows.filter((r) =>
      `${r.name} ${r.title} ${r.party}`.toLocaleLowerCase('tr-TR').includes(q),
    );
  }, [data.rows, search]);

  const setParam = (k: string, v: string | null) => {
    const next = new URLSearchParams(params);
    if (v === null || v === '') next.delete(k);
    else next.set(k, v);
    setParams(next, { replace: k === queryKeys.search });
  };

  const onViewChange = (v: ViewType) => {
    if (v === 'form') {
      const first = rows[0] ?? data.rows[0];
      if (first) navigate(routes.record(module, doctype, first.name));
      return;
    }
    setParam(queryKeys.view, v === 'table' ? null : v);
  };

  let state: HeaderState;
  if (data.status === 'loading') state = { kind: 'loading' };
  else if (data.status === 'error')
    state = { kind: 'error', message: t.pages.errorText, onRetry: data.reload };
  else if (selected.length > 0)
    state = { kind: 'selection', count: selected.length, onClear: () => setSelected([]) };
  else if (data.rows.length === 0) state = { kind: 'empty' };
  else if (demo === 'live') state = { kind: 'live', secondsAgo: seconds };
  else
    state = {
      kind: 'normal',
      syncedAt: (data.loadedAt ?? new Date()).toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

  return (
    <div className="shell-page">
      <PageHeader
        title={title}
        crumbs={[...(group ? [{ label: group.label }] : []), { label: title }]}
        count={data.status === 'loading' ? 0 : rows.length}
        view={view}
        onViewChange={onViewChange}
        state={state}
        primaryAction={{ label: 'Yeni kayıt', onClick: () => undefined }}
        secondaryActions={[{ label: 'Dışa aktar', onClick: () => undefined }]}
        search={search}
        onSearchChange={(q) => setParam(queryKeys.search, q)}
        filters={filters}
        onRemoveFilter={(k) => setFilters((f) => f.filter((x) => x.key !== k))}
        onClearFilters={() => setFilters([])}
        savedViews={[
          { value: 'all', label: 'Tüm kayıtlar' },
          { value: 'mine', label: 'Benim kayıtlarım' },
        ]}
      />
      <div className="shell-body">
        <p className="shell-muted">{t.pages.sample}</p>
        {data.status !== 'loading' && data.rows.length === 0 ? (
          <p>{t.pages.emptyText}</p>
        ) : (
          <ViewBody
            view={view}
            rows={rows}
            loading={data.status === 'loading'}
            selected={selected}
            onSelect={setSelected}
            onOpen={(name) => navigate(routes.record(module, doctype, name))}
          />
        )}
      </div>
    </div>
  );
}

interface ViewBodyProps {
  view: ViewType;
  rows: SampleRow[];
  loading: boolean;
  selected: React.Key[];
  onSelect: (k: React.Key[]) => void;
  onOpen: (name: string) => void;
}

function ViewBody({ view, rows, loading, selected, onSelect, onOpen }: ViewBodyProps) {
  if (view === 'table') {
    return (
      <div className="shell-table">
        <Table<SampleRow>
          rowKey="name"
          size="middle"
          loading={loading}
          columns={columns}
          dataSource={rows}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          rowSelection={{
            selectedRowKeys: selected,
            onChange: onSelect,
            getCheckboxProps: (r) => checkboxLabel(t.pages.selectRow(r.name)),
          }}
          onRow={(r) => ({ onDoubleClick: () => onOpen(r.name) })}
        />
      </div>
    );
  }

  const byStatus = new Map<string, SampleRow[]>();
  for (const r of rows) byStatus.set(r.status, [...(byStatus.get(r.status) ?? []), r]);

  if (view === 'kanban') {
    return (
      <div className="shell-kanban" role="list">
        {[...byStatus].map(([status, items]) => (
          <section key={status} className="shell-kb-col" role="listitem" aria-label={status}>
            <h2 className="shell-kb-h">
              {status} <span className="shell-num">{formatNumber(items.length)}</span>
            </h2>
            {items.slice(0, 5).map((r) => (
              <button
                key={r.name}
                type="button"
                className="shell-kb-card"
                onClick={() => onOpen(r.name)}
              >
                <b>{r.title}</b>
                <small>
                  {r.name} · {r.party}
                </small>
              </button>
            ))}
          </section>
        ))}
      </div>
    );
  }

  return (
    <div className="shell-summary">
      <p className="shell-muted">{t.pages.viewSoon}</p>
      <ul className="shell-summary-grid">
        {[...byStatus].map(([status, items]) => (
          <li key={status} className="shell-stat">
            <small>{status}</small>
            <b className="shell-num">{formatNumber(items.length)}</b>
            <span className="shell-num">
              {currency.format(items.reduce((s, r) => s + r.amount, 0))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
