import { Alert, Button, theme } from 'antd';
import type { CSSProperties, ReactNode } from 'react';
import type { Resource } from './data';
import { useCopy } from './messages';
import { useModule } from './context';
import './modules.css';

type Variables = CSSProperties & Record<`--${string}`, string | number>;
export function ModuleFrame({ title, children }: { title: string; children: ReactNode }) {
  const { token } = theme.useToken();
  const env = useModule();
  const copy = useCopy();
  const style: Variables = {
    '--module-gap': `${token.margin}px`,
    '--module-padding': `${token.padding}px`,
    '--module-text': token.colorText,
    '--module-muted': token.colorTextSecondary,
    '--module-surface': token.colorBgContainer,
    '--module-line': token.colorBorderSecondary,
    '--module-font': `${token.fontSize}px`,
    '--module-heading': `${token.fontSizeHeading3}px`,
  };
  return (
    <section className="module-page module-stack" style={style} aria-label={title}>
      <header>
        <h1>{title}</h1>
        {env && (
          <dl className="module-context">
            <div>
              <dt>{copy.tenant}</dt>
              <dd>{env.tenant}</dd>
            </div>
            <div>
              <dt>{copy.user}</dt>
              <dd>{env.user}</dd>
            </div>
            <div>
              <dt>{copy.mode}</dt>
              <dd>{env.mode === 'example' ? copy.example : copy.live}</dd>
            </div>
          </dl>
        )}
      </header>
      {!env ? <Alert type="info" message={copy.unavailable} /> : children}
    </section>
  );
}
export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="module-stack" aria-label={title}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}
export function ResourceView<T>({
  state,
  retry,
  children,
}: {
  state: Resource<T>;
  retry: () => void;
  children: (data: T) => ReactNode;
}) {
  const copy = useCopy();
  if (state.status === 'ready') return children(state.data);
  if (state.status === 'loading') return <p role="status">{copy.loading}</p>;
  if (state.status === 'unavailable') return <Alert type="info" message={copy.unavailable} />;
  return (
    <div className="module-stack">
      <Alert role="alert" type="error" message={copy[state.error]} />
      <Button onClick={retry}>{copy.retry}</Button>
    </div>
  );
}
export function Pager({
  start,
  hasNext,
  change,
}: {
  start: number;
  hasNext: boolean;
  change: (start: number) => void;
}) {
  const copy = useCopy();
  return (
    <nav className="module-actions" aria-label={copy.proposals}>
      <Button disabled={start === 0} onClick={() => change(Math.max(0, start - 20))}>
        {copy.previous}
      </Button>
      <Button disabled={!hasNext} onClick={() => change(start + 20)}>
        {copy.next}
      </Button>
    </nav>
  );
}
export function DateValue({ value }: { value: string | null | undefined }) {
  const env = useModule();
  const copy = useCopy();
  if (!value || !Number.isFinite(Date.parse(value))) return <>{copy.notProvided}</>;
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = new Date(dateOnly ? `${value}T12:00:00Z` : value);
  const label = new Intl.DateTimeFormat(env?.locale === 'en' ? 'en-GB' : 'tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    weekday: 'long',
    ...(dateOnly ? { timeZone: 'UTC' } : { hour: '2-digit', minute: '2-digit' }),
  }).format(date);
  return <time dateTime={value}>{label}</time>;
}
