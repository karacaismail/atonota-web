import { groupRows } from '../presentation';
import type { ViewProps } from '../types';
export default function PivotView({ definition, rows }: ViewProps) {
  const field = definition.columns.find((item) => item.fieldname === definition.groupField);
  if (!field) return <p data-view="pivot">Bu görünüm için gruplama alanı tanımlanmamış.</p>;
  return (
    <section data-view="pivot">
      <p>Özet tablo yalnız bu sayfadaki kayıtları kapsar.</p>
      <div
        className="collection-scroll"
        tabIndex={0}
        role="region"
        aria-label="Özet tablo yatay kaydırma"
      >
        <table className="collection-table">
          <caption className="collection-sr-only">Duruma göre kayıt sayısı</caption>
          <thead>
            <tr>
              <th scope="col">{field.label}</th>
              <th scope="col">Kayıt sayısı</th>
            </tr>
          </thead>
          <tbody>
            {groupRows(rows, field).map((group) => (
              <tr key={group.key}>
                <th scope="row">{group.label}</th>
                <td>{group.rows.length}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Sayfa toplamı</th>
              <td>{rows.length}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
