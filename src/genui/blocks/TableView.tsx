import { Table as TableIcon } from '@phosphor-icons/react';
import { Table } from 'antd';

import type { TableBlock, TableCell } from '../types';

export function TableView({ block }: { block: TableBlock }) {
  const columns = block.columns.map((column) => ({
    key: column.key,
    dataIndex: column.key,
    title: column.title,
  }));
  return (
    <section data-genui="table" className="genui-card">
      <header className="genui-card-h">
        <TableIcon aria-hidden />
        <strong>{block.title}</strong>
        <span className="genui-muted">{block.rows.length} satır</span>
      </header>
      {/* Tablo kendi kapsayıcısında yatay kayar. Sayfa taşmaz. */}
      <div className="genui-table-scroll">
        <Table<Record<string, TableCell>>
          size="small"
          pagination={false}
          rowKey={(row) => String(row[block.rowKey])}
          columns={columns}
          dataSource={block.rows}
          scroll={{ x: 'max-content' }}
        />
      </div>
    </section>
  );
}
