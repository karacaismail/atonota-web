/**
 * Plan price with its tax status (AJA-1761).
 * The screen takes every amount from the server (`TaxResult`). It never calculates tax.
 * An unknown tax is never shown as zero. The screen shows the net price, the status text and the next step.
 * The layout of the price screen belongs to AJA-1734. This component carries only the four parts and the next step.
 */
import { useId } from 'react';

import { useFormat, useLanguage } from '@/app/locale';

import { taxMessages } from './messages';
import type { Money, TaxLine, TaxResult } from './tax-result';
import './plan-price.css';

const UNKNOWN = new Set(['service_unavailable', 'not_calculated']);

/**
 * The line whose status describes the whole price.
 * A service outage wins over a missing calculation. Both win over known statuses.
 */
function leadingLine(result: TaxResult): TaxLine | undefined {
  const { lines } = result;
  return (
    lines.find((line) => line.tax_status === 'service_unavailable') ??
    lines.find((line) => line.tax_status === 'not_calculated') ??
    (lines.every((line) => line.tax_status === lines[0]?.tax_status)
      ? lines[0]
      : (lines.find((line) => line.tax_status === 'calculated') ?? lines[0]))
  );
}

export interface PlanPriceProps {
  planName: string;
  /** Billing unit from the plan data. Example: "per month". */
  unit: string;
  result: TaxResult;
}

export function PlanPrice({ planName, unit, result }: PlanPriceProps) {
  const id = useId();
  const format = useFormat();
  const copy = taxMessages[useLanguage()];
  const line = leadingLine(result);
  const status = line?.tax_status ?? 'not_calculated';
  const unknown = UNKNOWN.has(status) || !result.totals.gross;

  // The amount is decimal text. Intl.NumberFormat formats decimal strings exactly (ECMA-402),
  // so no float conversion happens. The TypeScript lib in use types only numbers.
  const money = (amount: Money) =>
    new Intl.NumberFormat(format.intl, { style: 'currency', currency: amount.currency }).format(
      amount.value as unknown as number,
    );

  const price = unknown || !result.totals.gross ? result.totals.net : result.totals.gross;
  const taxText = copy.status[status].replace(
    '{tax}',
    result.totals.tax ? money(result.totals.tax) : '',
  );
  const nextStep = unknown && line ? copy.step[line.reason_code] : undefined;

  return (
    <section
      className="plan-price"
      aria-labelledby={id}
      data-testid={`plan-price-${status}`}
      data-tax-status={status}
    >
      <h3 id={id} className="plan-price-name" data-testid="plan-price-name">
        {planName}
      </h3>
      <p className="plan-price-line">
        <span className="plan-price-amount" data-testid="plan-price-amount">
          {money(price)}
        </span>{' '}
        <span className="plan-price-unit" data-testid="plan-price-unit">
          {unit}
        </span>
      </p>
      <p className="plan-price-tax" data-testid="plan-price-tax">
        {taxText}
      </p>
      {nextStep && (
        <p className="plan-price-step" data-testid="plan-price-next-step">
          {nextStep}
        </p>
      )}
    </section>
  );
}
