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
 * Salt okunur bağlantı alanı. Hedef kaydın adını gösterir ve kayda bağlantı verir.
 * Sunucuya istek atmaz. Görünen bilgi yalnız bu kayıtta zaten okunabilen addır.
 * Böylece izni olmayan hedef kaydın başka bilgisi sızmaz. Hedef sayfa izni kendisi denetler.
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
