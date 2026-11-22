import type { FieldChange } from '../types';

/**
 * Sabit onay ekranının değişiklik tablosu (AX-4, AX-6).
 * Her satır bir alanın önceki ve sonraki değerini gösterir.
 */
export function ChangeTable({ changes }: { changes: FieldChange[] }) {
  return (
    <div className="genui-table-scroll">
      <table className="genui-changes" aria-label="Değişecek alanlar">
        <thead>
          <tr>
            <th scope="col">Alan</th>
            <th scope="col">Önce</th>
            <th scope="col">Sonra</th>
          </tr>
        </thead>
        <tbody>
          {changes.map((change) => (
            <tr key={change.field}>
              <th scope="row">{change.field}</th>
              <td>{change.before || 'Boş'}</td>
              <td className="genui-after">{change.after || 'Boş'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
