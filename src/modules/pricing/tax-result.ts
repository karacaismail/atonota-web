/**
 * Price and tax result from the server (AJA-1756).
 * Source: `contracts/tax_result.schema.json` in the metafrappe/backend repository.
 * The screen never calculates tax. It only shows the values the server sends.
 */

/** Decimal text with a dot, never a float. Example: `"112.34"`. */
export interface Money {
  value: string;
  currency: string;
}

export const TAX_STATUSES = [
  'calculated',
  'zero_rated',
  'exempt',
  'reverse_charge',
  'not_calculated',
  'service_unavailable',
] as const;

export type TaxStatus = (typeof TAX_STATUSES)[number];

export type TaxReasonCode =
  | 'TAX_STANDARD_RATE'
  | 'TAX_REDUCED_RATE'
  | 'TAX_ZERO_RATE_EXPORT'
  | 'TAX_ZERO_RATE_GOODS'
  | 'TAX_EXEMPT_BY_LAW'
  | 'TAX_EXEMPT_CUSTOMER'
  | 'TAX_REVERSE_CHARGE_B2B'
  | 'TAX_MISSING_BILLING_COUNTRY'
  | 'TAX_UNSUPPORTED_COUNTRY'
  | 'TAX_MISSING_TAX_ID'
  | 'TAX_SERVICE_UNAVAILABLE'
  | 'TAX_SERVICE_TIMEOUT';

export interface TaxLine {
  line_id: string;
  description: string;
  net: Money;
  /** Percent as decimal text. `null` when there is no rate. */
  tax_rate: string | null;
  /** `null` when the tax is not known. `null` never means zero. */
  tax: Money | null;
  gross: Money | null;
  tax_status: TaxStatus;
  reason_code: TaxReasonCode;
  label_key_short: string;
  label_key_long: string;
}

export interface TaxTotals {
  net: Money;
  tax: Money | null;
  gross: Money | null;
}

export interface TaxResult {
  operation: 'quote' | 'purchase' | 'refund';
  idempotency_key: string | null;
  /** The billing country decides the tax. The UI language never does. */
  billing_country: string;
  currency: string;
  lines: TaxLine[];
  totals: TaxTotals;
  invoice: unknown;
}
