import { useMemo } from 'react';

import type { ApiClient } from '@/api';
import type { RecordAddress } from '@/shell/view-data';
import { createFrappeRecordAdapter, RecordView } from '@/views/record';

import { doctypeFromSlug } from './view-data';

function decode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export interface RecordRouteProps extends RecordAddress {
  /** Oturumun ortak API istemcisi. Site kökü, CSRF deposu ve oturum süresi işi buradan gelir. */
  api: Pick<ApiClient, 'frappeDocument'>;
}

/**
 * Kayıt rotası. Kaydı `views-record` işinin `RecordView` bileşeni çizer.
 * İstekler ortak API istemcisinden geçer (SZ-5). Sayfa çerçevesini kabuk çizer; bu bileşen
 * yalnız içeriği verir.
 */
export default function RecordRoute({ api, doctype, name }: RecordRouteProps) {
  const adapter = useMemo(() => createFrappeRecordAdapter({ api, locale: 'tr' }), [api]);
  return (
    <RecordView
      doctype={doctypeFromSlug(doctype)}
      name={decode(name)}
      locale="tr"
      adapter={adapter}
    />
  );
}
