import { displayCell } from '../presentation';
import type { ViewProps } from '../types';
export default function TimesheetView({ definition, rows }: ViewProps) {
  const field = definition.columns.find((item) => item.fieldname === definition.durationField);
  if (!field) return <p data-view="timesheet">Bu görünüm için süre alanı tanımlanmamış.</p>;
  const values = rows.map((row) => row[field.fieldname]);
  const valid = values.filter(
    (value): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0,
  );
  return (
    <section data-view="timesheet">
      <p>Çalışma süreleri yalnız bu sayfadaki kayıtları kapsar.</p>
      {valid.length !== rows.length && (
        <p>{rows.length - valid.length} kaydın süresi eksik veya geçersiz.</p>
      )}
      <div
        className="collection-scroll"
        tabIndex={0}
        role="region"
        aria-label="Çalışma süreleri yatay kaydırma"
      >
        <table className="collection-table">
          <caption className="collection-sr-only">Kayıtların çalışma süreleri</caption>
          <thead>
            <tr>
              <th scope="col">İş</th>
              <th scope="col">{field.label}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name}>
                <th scope="row">{String(row[definition.titleField] ?? row.name)}</th>
                <td>{displayCell(row, field)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Geçerli sürelerin toplamı</th>
              <td>
                {new Intl.NumberFormat('tr-TR').format(
                  valid.reduce((total, value) => total + value, 0),
                )}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
