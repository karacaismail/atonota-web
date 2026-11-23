import { useLocation } from 'react-router-dom';

import { t } from '../messages';

interface AssistantState {
  q?: string;
}

export default function AssistantPage() {
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
