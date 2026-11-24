import { useCallback, useMemo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import type { ApiClient } from '@/api';
import { routes } from '@/shell/paths';
import type { RecordAddress } from '@/shell/view-data';
import { createFrappeRecordAdapter, type RecordLinkTarget, RecordView } from '@/views/record';

import { slugFromDoctype } from './record-slug';
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
 * Bağlantı alanındaki hedef kayıt aynı modül yolunda açılır. Yönlendirici panel yolunu
 * (`/panel`) kendisi ekler. Hedef sayfa kaydı sunucudan ister; izin orada denetlenir.
 */
export default function RecordRoute({ api, module, doctype, name }: RecordRouteProps) {
  const adapter = useMemo(() => createFrappeRecordAdapter({ api, locale: 'tr' }), [api]);
  const renderRecordLink = useCallback(
    (target: RecordLinkTarget, children: ReactNode) => {
      const slug = slugFromDoctype(target.doctype);
      if (!slug || !module) return null;
      return <Link to={routes.record(module, slug, target.name)}>{children}</Link>;
    },
    [module],
  );
  return (
    <RecordView
      doctype={doctypeFromSlug(doctype)}
      name={decode(name)}
      locale="tr"
      adapter={adapter}
      renderRecordLink={renderRecordLink}
    />
  );
}
