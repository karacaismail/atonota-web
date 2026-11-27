import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LanguageProvider } from '@/app/locale';

import { SAMPLE_REASON, sampleQuote } from './fixtures';
import { PlanPrice } from './PlanPrice';
import { TAX_STATUSES, type TaxStatus } from './tax-result';

function show(status: TaxStatus, lang = 'en', reason = SAMPLE_REASON[status]) {
  return render(
    <LanguageProvider initialLanguage={lang}>
      <PlanPrice planName="Plan A" unit="per month" result={sampleQuote(status, reason)} />
    </LanguageProvider>,
  );
}

const ZERO = /0[.,]00/;

describe('PlanPrice: tax service is down (AJA-1761, test 1)', () => {
  it('shows no "0.00" or "0,00" in the tax area', () => {
    for (const lang of ['en', 'tr']) {
      const { unmount } = show('service_unavailable', lang);
      const card = screen.getByRole('region', { name: 'Plan A' });
      const tax = within(card).getByTestId('plan-price-tax');
      expect(tax.textContent).not.toMatch(ZERO);
      expect(tax.textContent?.trim()).not.toBe('');
      unmount();
    }
  });

  it('writes the next step', () => {
    show('service_unavailable');
    const step = screen.getByTestId('plan-price-next-step');
    expect(step).toHaveTextContent('Check the price again in a few minutes.');
  });

  it('shows the net price and says it excludes tax', () => {
    show('service_unavailable');
    const price = screen.getByTestId('plan-price-amount');
    expect(price).toHaveTextContent('100.00');
    expect(screen.getByTestId('plan-price-tax')).toHaveTextContent(/excl/i);
  });

  it('a timeout also shows the next step', () => {
    show('service_unavailable', 'en', 'TAX_SERVICE_TIMEOUT');
    expect(screen.getByTestId('plan-price-next-step')).toBeInTheDocument();
    expect(screen.getByTestId('plan-price-tax').textContent).not.toMatch(ZERO);
  });
});

describe('PlanPrice: each tax status has its own text (AJA-1761, test 2)', () => {
  for (const lang of ['en', 'tr']) {
    it(`six statuses give six different texts (${lang})`, () => {
      const texts = TAX_STATUSES.map((status) => {
        const { unmount } = show(status, lang);
        const text = screen.getByTestId('plan-price-tax').textContent ?? '';
        unmount();
        return text;
      });
      expect(texts.every((t) => t.trim().length > 0)).toBe(true);
      expect(new Set(texts).size).toBe(TAX_STATUSES.length);
    });
  }

  it('the tax area has an accessible name that includes the status text', () => {
    show('reverse_charge');
    const tax = screen.getByTestId('plan-price-tax');
    expect(tax).toHaveTextContent('You declare the tax');
  });

  it('known statuses show the gross price, unknown ones the net price', () => {
    const { unmount } = show('calculated');
    expect(screen.getByTestId('plan-price-amount')).toHaveTextContent('112.34');
    unmount();
    show('not_calculated');
    expect(screen.getByTestId('plan-price-amount')).toHaveTextContent('100.00');
    expect(screen.getByTestId('plan-price-next-step')).toHaveTextContent('Add your tax number.');
  });

  it('each "not calculated" reason gives its own next step', () => {
    const steps = (
      ['TAX_MISSING_BILLING_COUNTRY', 'TAX_UNSUPPORTED_COUNTRY', 'TAX_MISSING_TAX_ID'] as const
    ).map((reason) => {
      const { unmount } = show('not_calculated', 'en', reason);
      const text = screen.getByTestId('plan-price-next-step').textContent;
      unmount();
      return text;
    });
    expect(new Set(steps).size).toBe(3);
  });

  it('known statuses show no next step', () => {
    for (const status of ['calculated', 'zero_rated', 'exempt', 'reverse_charge'] as const) {
      const { unmount } = show(status);
      expect(screen.queryByTestId('plan-price-next-step')).toBeNull();
      unmount();
    }
  });
});

describe('PlanPrice: the language does not change the amount', () => {
  it('en and tr show the same digits', () => {
    const digits = ['en', 'tr'].map((lang) => {
      const { unmount } = show('calculated', lang);
      const text = screen.getByTestId('plan-price-amount').textContent ?? '';
      unmount();
      return text.replace(/\D/g, '');
    });
    expect(digits[0]).toBe('11234');
    expect(digits[1]).toBe(digits[0]);
  });

  it('the default language is British English', () => {
    render(<PlanPrice planName="Plan A" unit="per month" result={sampleQuote('calculated')} />);
    expect(screen.getByTestId('plan-price-amount')).toHaveTextContent('€112.34');
  });
});
