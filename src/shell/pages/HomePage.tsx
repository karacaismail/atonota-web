import { useLocation } from 'react-router-dom';

import { isDemoEnabled, isDemoPath } from '@/app/demo-mode';

import { PageHeader } from '../header/PageHeader';
import { t } from '../messages';
import { sampleAgents } from '../sampleData';

const noop = () => undefined;

/** Deneme sayfaları yalnız e2e derlemesinde vardır. Koşul derleme zamanında sabittir. */
const DEMO_ENABLED = isDemoEnabled(import.meta.env.MODE);

/**
 * Ana sayfa. Sunucuda panel özeti verecek uç yoktur.
 * Canlı panel bunu açıkça yazar; örnek ajan ve uydurma eşitleme saati göstermez.
 * Örnek özet yalnız deneme sayfasında (`/_demo/...`) görünür.
 */
export default function HomePage() {
  const { pathname } = useLocation();
  const demo = DEMO_ENABLED && isDemoPath(pathname);
  return (
    <div className="shell-page">
      <PageHeader
        title={t.pages.home}
        crumbs={[{ label: t.pages.home }]}
        view="report"
        onViewChange={noop}
        state={demo ? { kind: 'normal', syncedAt: '10:42' } : { kind: 'empty' }}
      />
      <div className="shell-body">
        {demo ? (
          <>
            <p className="shell-muted">{t.pages.sample}</p>
            <ul className="shell-summary-grid">
              {sampleAgents.map((a) => (
                <li key={a.id} className="shell-stat">
                  <small>{a.name}</small>
                  <b>{t.agents.status[a.status]}</b>
                  <span>{a.task}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="shell-muted">{t.pages.homeEmpty}</p>
        )}
      </div>
    </div>
  );
}
