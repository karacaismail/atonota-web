import { useId } from 'react';

import { useGenuiStrings } from '../useGenuiStrings';
import type { FieldChange } from '../types';

/**
 * Change table of the fixed confirm screen (AX-4, AX-6).
 *
 * Each field name is a header on its own row. The before and after values sit
 * side by side below it. So the table fits at 320 CSS px without scrolling and
 * words are not broken in the middle. Cells link to headers via `headers`.
 */
export function ChangeTable({ changes }: { changes: FieldChange[] }) {
  const text = useGenuiStrings();
  const id = useId();
  const before = `${id}-before`;
  const after = `${id}-after`;
  return (
    <table className="genui-changes" aria-label={text.changes.name}>
      <thead>
        <tr>
          <th scope="col" id={before}>
            {text.changes.before}
          </th>
          <th scope="col" id={after}>
            {text.changes.after}
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
              <td headers={`${field} ${before}`}>{change.before || text.changes.empty}</td>
              <td headers={`${field} ${after}`} className="genui-after">
                {change.after || text.changes.empty}
              </td>
            </tr>
          </tbody>
        );
      })}
    </table>
  );
}
