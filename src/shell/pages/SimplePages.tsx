import { Button, Result } from 'antd';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { PageHeader } from '../header/PageHeader';
import { t } from '../messages';
import { routes } from '../routes';
import { sampleAgents } from '../sampleData';

const noop = () => undefined;

export function HomePage() {
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

interface AssistantState {
  q?: string;
}

export function AssistantPage() {
  const location = useLocation();
  const q = (location.state as AssistantState | null)?.q ?? '';
  return (
    <div className="shell-page">
      <div className="shell-body">
        <h1 className="shell-h1">{t.pages.assistant}</h1>
        {q && <blockquote className="shell-quote">{q}</blockquote>}
        <p>{t.pages.assistantText}</p>
      </div>
    </div>
  );
}

export function AgentPage() {
  const { id = '' } = useParams();
  const a = sampleAgents.find((x) => x.id === id);
  if (!a) return <NotFoundPage />;
  return (
    <div className="shell-page">
      <div className="shell-body">
        <h1 className="shell-h1">{a.name}</h1>
        <p>{t.agents.status[a.status]}</p>
        <p>{a.task}</p>
        <p className="shell-muted">{t.agents.lastEvent(a.lastEvent)}</p>
      </div>
    </div>
  );
}

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="shell-page">
      <Result
        status="404"
        title={<h1 className="shell-h1">{t.pages.notFound}</h1>}
        subTitle={t.pages.notFoundText}
        extra={
          <Button type="primary" onClick={() => navigate(routes.home())}>
            {t.pages.goHome}
          </Button>
        }
      />
    </div>
  );
}
