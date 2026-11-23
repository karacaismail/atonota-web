import { PageHeader } from '../header/PageHeader';
import { t } from '../messages';
import { sampleAgents } from '../sampleData';

const noop = () => undefined;

export default function HomePage() {
  return (
    <div className="shell-page">
      <PageHeader
        title={t.pages.home}
        crumbs={[{ label: t.pages.home }]}
        view="report"
        onViewChange={noop}
        state={{ kind: 'normal', syncedAt: '10:42' }}
      />
      <div className="shell-body">
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
      </div>
    </div>
  );
}
