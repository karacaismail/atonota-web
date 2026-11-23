import { useParams } from 'react-router-dom';

import { t } from '../messages';
import { sampleAgents } from '../sampleData';
import NotFoundPage from './NotFoundPage';

export default function AgentPage() {
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
