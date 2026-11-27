/**
 * Tax status demo page. Opens only in the e2e build at `/_demo/tax-status`.
 * The route row is in `src/shell/routes.ts`. `?lang=tr` switches the language.
 * The page shows every status twice: in the page column and in a 260 px side panel.
 */
import { LanguageProvider } from '@/app/locale';

import { sampleQuote } from '../fixtures';
import { PlanPrice } from '../PlanPrice';
import { TAX_STATUSES } from '../tax-result';
import './demo.css';

const UNIT = { en: 'per month', tr: 'aylık' } as const;

function Cards({ unit }: { unit: string }) {
  return (
    <>
      {TAX_STATUSES.map((status) => (
        <PlanPrice key={status} planName="Plan A" unit={unit} result={sampleQuote(status)} />
      ))}
    </>
  );
}

export default function TaxStatusDemoPage() {
  const lang = new URLSearchParams(window.location.search).get('lang') ?? undefined;
  const unit = lang === 'tr' ? UNIT.tr : UNIT.en;
  return (
    <LanguageProvider initialLanguage={lang}>
      <div className="tax-demo">
        <section className="tax-demo-area" data-testid="tax-demo-page" aria-label="Page column">
          <Cards unit={unit} />
        </section>
        <aside
          className="tax-demo-area tax-demo-panel"
          data-testid="tax-demo-panel"
          aria-label="Side panel"
        >
          <Cards unit={unit} />
        </aside>
      </div>
    </LanguageProvider>
  );
}
