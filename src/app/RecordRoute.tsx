import { RecordView } from '@/views/record';
import type { RecordAddress } from '@/shell/view-data';

import { doctypeFromSlug } from './view-data';

function decode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * Kayıt rotası. Kaydı `views-record` işinin `RecordView` bileşeni çizer.
 * Varsayılan bağdaştırıcı aynı kökteki Frappe API'sini ve sayfadaki CSRF belirtecini kullanır.
 */
export default function RecordRoute({ doctype, name }: RecordAddress) {
  return (
    <div className="shell-page">
      <div className="shell-body">
        <RecordView doctype={doctypeFromSlug(doctype)} name={decode(name)} locale="tr" />
      </div>
    </div>
  );
}
