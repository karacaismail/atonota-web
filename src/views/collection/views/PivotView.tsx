import { groupCounts, summaryNotice } from '../presentation';
import type { ViewProps } from '../types';
export default function PivotView({ definition, rows, summary }: ViewProps) {
  const field = definition.columns.find((item) => item.fieldname === definition.groupField);
  if (!field) return <p data-view="pivot">Bu görünüm için gruplama alanı tanımlanmamış.</p>;
  const counts = groupCounts(rows, field, summary);
  const notice = summaryNotice(summary);
  return (
    <section data-view="pivot">
      <p>
        {counts.scope === 'all'
          ? 'Özet bütün uygun kayıtları kapsar. Toplam ' + counts.total + ' kayıt.'
          : 'Özet tablo yalnız bu sayfadaki kayıtları kapsar.'}
      </p>
      {notice && <p role="status">{notice}</p>}
      <div
        className="collection-scroll"
        tabIndex={0}
        role="region"
        aria-label="Özet tablo yatay kaydırma"
      >
        <table className="collection-table">
          <caption className="collection-sr-only">{field.label} alanına göre kayıt sayısı</caption>
          <thead>
            <tr>
              <th scope="col">{field.label}</th>
              <th scope="col">Kayıt sayısı</th>
            </tr>
          </thead>
          <tbody>
            {counts.groups.map((group) => (
              <tr key={group.key}>
                <th scope="row">{group.label}</th>
                <td>{group.count}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">{counts.scope === 'all' ? 'Toplam' : 'Sayfa toplamı'}</th>
              <td>{counts.total}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
