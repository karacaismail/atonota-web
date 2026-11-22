import { groupRows } from '../presentation';
import type { ViewProps } from '../types';
export default function ReportView({ definition, rows }: ViewProps) {
  const field = definition.columns.find((item) => item.fieldname === definition.groupField);
  if (!field) return <p data-view="report">Bu rapor için gruplama alanı tanımlanmamış.</p>;
  return (
    <section data-view="report">
      <p>Rapor yalnız bu sayfadaki kayıtları kapsar.</p>
      <ul className="collection-report">
        {groupRows(rows, field).map((group) => (
          <li key={group.key}>
            <p>
              {group.label}: {group.rows.length} kayıt
            </p>
            <div className="collection-track" aria-hidden="true">
              <span style={{ width: (group.rows.length / rows.length) * 100 + '%' }} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
