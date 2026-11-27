import { formatRecordMessage } from '../messages';
import { useRecordLinkRenderer } from '../recordLink';
import type { RecordLocale } from '../types';
import type { FieldControlA11yProps } from './FieldShell';

export interface LinkValueProps {
  targetDoctype: string;
  value: string | null;
  locale: RecordLocale;
  a11y: FieldControlA11yProps;
}

/**
 * Read-only link field. Shows the target record's name and links to the record.
 * It sends no server request. The only data shown is the name already readable in this record.
 * So no other data of an unpermitted target record leaks. The target page checks access itself.
 */
export function LinkValue({ targetDoctype, value, locale, a11y }: LinkValueProps) {
  const renderLink = useRecordLinkRenderer();
  const name = value?.trim() ?? '';
  const target = targetDoctype.trim();
  const link =
    name !== '' && target !== '' && renderLink
      ? renderLink({ doctype: target, name }, <span className="rv-link-value-text">{name}</span>)
      : null;
  return (
    <div
      id={a11y.controlId}
      role="group"
      aria-labelledby={a11y.labelId}
      aria-describedby={a11y.ariaDescribedBy}
      className="rv-readonly-box rv-link-value"
    >
      {name === '' ? formatRecordMessage(locale, 'readOnlyEmpty') : (link ?? name)}
    </div>
  );
}
