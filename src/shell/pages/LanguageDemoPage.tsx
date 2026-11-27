import { useId } from 'react';

import { Input } from '@/components/controls';

import { PageHeader } from '../header/PageHeader';
import { t } from '../messages';
import { routes } from '../paths';

const noop = () => undefined;

/**
 * Language choice test page (AJA-1772). Opens at `/_demo/dil` only in the e2e build.
 * The page has a half-filled form, a draft and an open filter. The values live only in the
 * page's own state, so a page reload or a remount would clear them. The browser test changes
 * the language and checks that the values stay.
 */
export default function LanguageDemoPage() {
  const id = useId();
  const text = t.languageDemo;
  return (
    <div className="shell-page">
      <PageHeader
        title={text.title}
        crumbs={[{ label: t.pages.home, to: routes.home() }, { label: text.title }]}
        view="report"
        onViewChange={noop}
        state={{ kind: 'normal', syncedAt: '10:42' }}
      />
      <div className="shell-body">
        <p>{text.intro}</p>
        <div className="shell-demo-field">
          <label htmlFor={`${id}-filter`}>{text.filter}</label>
          <Input id={`${id}-filter`} type="search" />
        </div>
        <form aria-label={text.form} className="shell-demo-form">
          <div className="shell-demo-field">
            <label htmlFor={`${id}-subject`}>{text.subject}</label>
            <Input id={`${id}-subject`} />
          </div>
          <div className="shell-demo-field">
            <label htmlFor={`${id}-draft`}>{text.draft}</label>
            <Input.TextArea id={`${id}-draft`} rows={3} />
          </div>
        </form>
      </div>
    </div>
  );
}
