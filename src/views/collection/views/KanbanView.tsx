import { groupRows } from '../presentation';
import type { ViewProps } from '../types';
export default function KanbanView({ definition, rows }: ViewProps) {
  const field = definition.columns.find((item) => item.fieldname === definition.groupField);
  if (!field) return <p data-view="kanban">Bu görünüm için gruplama alanı tanımlanmamış.</p>;
  return (
    <section data-view="kanban">
      <p>Bu sayfadaki kayıtlar durumlarına göre gruplanır.</p>
      <div className="collection-board">
        {groupRows(rows, field).map((group) => (
          <section className="collection-lane" key={group.key}>
            <h3>
              {group.label} ({group.rows.length})
            </h3>
            <ul>
              {group.rows.map((row) => (
                <li key={row.name}>
                  <strong>{String(row[definition.titleField] ?? row.name)}</strong>
                  <p>{row.name}</p>
                </li>
              ))}
            </ul>
            {!group.rows.length && <p>Bu grupta kayıt yok.</p>}
          </section>
        ))}
      </div>
    </section>
  );
}
