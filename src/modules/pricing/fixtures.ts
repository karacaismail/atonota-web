/**
 * Sample price results for tests and the demo page.
 * All rates are fictional. The country code `ZZ` is fictional too.
 */
import type { Money, TaxReasonCode, TaxResult, TaxStatus } from './tax-result';

const eur = (value: string): Money => ({ value, currency: 'EUR' });

/** One reason code for each status, taken from the contract. */
export const SAMPLE_REASON: Record<TaxStatus, TaxReasonCode> = {
  calculated: 'TAX_STANDARD_RATE',
  zero_rated: 'TAX_ZERO_RATE_EXPORT',
  exempt: 'TAX_EXEMPT_BY_LAW',
  reverse_charge: 'TAX_REVERSE_CHARGE_B2B',
  not_calculated: 'TAX_MISSING_TAX_ID',
  service_unavailable: 'TAX_SERVICE_UNAVAILABLE',
};

/** A one-line price quote with the given tax status. Net is 100.00 EUR. */
export function sampleQuote(
  status: TaxStatus,
  reason: TaxReasonCode = SAMPLE_REASON[status],
): TaxResult {
  const unknown = status === 'not_calculated' || status === 'service_unavailable';
  const tax = status === 'calculated' ? eur('12.34') : eur('0.00');
  const gross = status === 'calculated' ? eur('112.34') : eur('100.00');
  return {
    operation: 'quote',
    idempotency_key: null,
    billing_country: 'ZZ',
    currency: 'EUR',
    lines: [
      {
        line_id: 'L1',
        description: 'Plan A',
        net: eur('100.00'),
        tax_rate: status === 'calculated' ? '12.34' : status === 'zero_rated' ? '0' : null,
        tax: unknown ? null : tax,
        gross: unknown ? null : gross,
        tax_status: status,
        reason_code: reason,
        label_key_short: `tax.status.${status}.short`,
        label_key_long: `tax.status.${status}.long`,
      },
    ],
    totals: {
      net: eur('100.00'),
      tax: unknown ? null : tax,
      gross: unknown ? null : gross,
    },
    invoice: null,
  };
}
