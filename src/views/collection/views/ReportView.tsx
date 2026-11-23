import { groupCounts, summaryNotice } from '../presentation';
import type { ViewProps } from '../types';
export default function ReportView({ definition, rows, summary }: ViewProps) {
  const field = definition.columns.find((item) => item.fieldname === definition.groupField);
  if (!field) return <p data-view="report">Bu rapor için gruplama alanı tanımlanmamış.</p>;
  const counts = groupCounts(rows, field, summary);
  const notice = summaryNotice(summary);
  return (
    <section data-view="report">
      <p>
        {counts.scope === 'all'
          ? 'Özet bütün uygun kayıtları kapsar. Toplam ' + counts.total + ' kayıt.'
          : 'Rapor yalnız bu sayfadaki kayıtları kapsar.'}
      </p>
      {notice && <p role="status">{notice}</p>}
      <ul className="collection-report">
        {counts.groups.map((group) => (
          <li key={group.key}>
            <p>
              {group.label}: {group.count} kayıt
            </p>
            <div className="collection-track" aria-hidden="true">
              <span
                style={{ width: (counts.total ? (group.count / counts.total) * 100 : 0) + '%' }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
