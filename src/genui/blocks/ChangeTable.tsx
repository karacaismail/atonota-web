import { useId } from 'react';

import type { FieldChange } from '../types';

/**
 * Sabit onay ekranının değişiklik tablosu (AX-4, AX-6).
 *
 * Her alanın adı kendi satırında başlıktır. Altında önceki ve sonraki değer
 * yan yana durur. Böylece tablo 320 CSS px'te de kaydırmadan sığar ve
 * kelimeler ortasından bölünmez. Hücreler `headers` ile başlıklara bağlıdır.
 */
export function ChangeTable({ changes }: { changes: FieldChange[] }) {
  const id = useId();
  const before = `${id}-before`;
  const after = `${id}-after`;
  return (
    <table className="genui-changes" aria-label="Değişecek alanlar">
      <thead>
        <tr>
          <th scope="col" id={before}>
            Önce
          </th>
          <th scope="col" id={after}>
            Sonra
          </th>
        </tr>
      </thead>
      {changes.map((change, index) => {
        const field = `${id}-f${index}`;
        return (
          <tbody key={change.field}>
            <tr>
              <th scope="colgroup" colSpan={2} id={field} className="genui-change-field">
                {change.field}
              </th>
            </tr>
            <tr>
              <td headers={`${field} ${before}`}>{change.before || 'Boş'}</td>
              <td headers={`${field} ${after}`} className="genui-after">
                {change.after || 'Boş'}
              </td>
            </tr>
          </tbody>
        );
      })}
    </table>
  );
}
