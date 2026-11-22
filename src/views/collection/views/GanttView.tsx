import { dateValue, displayCell } from '../presentation';
import type { ViewProps } from '../types';
export default function GanttView({ definition, rows }: ViewProps) {
  const startField = definition.columns.find((item) => item.fieldname === definition.startField);
  const endField = definition.columns.find((item) => item.fieldname === definition.endField);
  if (!startField || !endField)
    return <p data-view="gantt">Bu görünüm için başlangıç ve bitiş alanları tanımlanmamış.</p>;
  const valid = rows.flatMap((row) => {
    const start = dateValue(row[startField.fieldname]);
    const end = dateValue(row[endField.fieldname]);
    return start !== undefined && end !== undefined && end >= start ? [{ row, start, end }] : [];
  });
  const min = Math.min(...valid.map((entry) => entry.start));
  const max = Math.max(...valid.map((entry) => entry.end));
  const day = 86400000;
  const range = max - min + day;
  return (
    <section data-view="gantt">
      <p>Zaman çizelgesi yalnız bu sayfadaki kayıtları kapsar.</p>
      {valid.length !== rows.length && (
        <p>{rows.length - valid.length} kaydın tarih aralığı eksik veya geçersiz.</p>
      )}
      <div
        className="collection-scroll"
        tabIndex={0}
        role="region"
        aria-label="Zaman çizelgesi yatay kaydırma"
      >
        <table className="collection-table collection-timeline">
          <caption className="collection-sr-only">İşlerin başlangıç ve bitiş tarihleri</caption>
          <thead>
            <tr>
              <th scope="col">İş</th>
              <th scope="col">Tarih aralığı</th>
            </tr>
          </thead>
          <tbody>
            {valid.map(({ row, start, end }) => (
              <tr key={row.name}>
                <th scope="row">{String(row[definition.titleField] ?? row.name)}</th>
                <td>
                  <p>
                    {displayCell(row, startField)} ile {displayCell(row, endField)} arasında.
                  </p>
                  <div className="collection-track" aria-hidden="true">
                    <span
                      style={{
                        marginInlineStart: ((start - min) / range) * 100 + '%',
                        width: ((end - start + day) / range) * 100 + '%',
                      }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
