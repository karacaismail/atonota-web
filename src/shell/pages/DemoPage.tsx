import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { PageHeader } from '../header/PageHeader';
import { t } from '../messages';
import { routes } from '../paths';
import type { ViewType } from '../tokens';

const noop = () => undefined;

/**
 * Test data for the long filter row (AJA-1746). Opens with `?filters=long`.
 * These labels are not real records and are not translations.
 */
const DEMO_LONG_FILTERS: readonly { key: string; label: string }[] = [
  { key: 'region', label: 'Bölge: Kuzey İrlanda, İskoçya ve Galler sınır bölgeleri' },
  { key: 'owner', label: 'Sorumlu: Muhasebe ve finansal raporlama ekibinin yöneticileri' },
  { key: 'status', label: 'Durum: Onay bekleyen ve yeniden gönderilen başvurular' },
  { key: 'period', label: 'Dönem: Geçen mali yılın son çeyreği ve bu yılın ilk ayı' },
  { key: 'code', label: 'Ürün kodu: AB-120/XL' },
];

/**
 * The shell's test page. Opens at `/_demo/shell` only in the e2e build.
 * Here the menu is rendered with sample groups. The page has a breadcrumb link and a text link.
 * Browser tests check focus, underline and touch area on these elements.
 * With `?filters=long` the header shows five long active filters.
 */
export default function DemoPage() {
  const [params] = useSearchParams();
  const longFilters = params.get('filters') === 'long';
  const [filters, setFilters] = useState(longFilters ? [...DEMO_LONG_FILTERS] : []);
  const [search, setSearch] = useState(longFilters ? 'AB-120' : '');
  const [view, setView] = useState<ViewType>('report');

  return (
    <div className="shell-page">
      <PageHeader
        title={t.demo.title}
        crumbs={[{ label: t.pages.home, to: routes.home() }, { label: t.demo.title }]}
        view={view}
        onViewChange={longFilters ? setView : noop}
        state={{ kind: 'normal', syncedAt: '10:42' }}
        {...(longFilters
          ? {
              search,
              onSearchChange: setSearch,
              filters,
              onRemoveFilter: (key: string) => setFilters((f) => f.filter((x) => x.key !== key)),
              onClearFilters: () => setFilters([]),
            }
          : {})}
      />
      <div className="shell-body">
        <p className="shell-muted">{t.pages.sample}</p>
        <p>
          {t.demo.linkBefore} <Link to={routes.assistant()}>{t.demo.link}</Link> {t.demo.linkAfter}
        </p>
      </div>
    </div>
  );
}
