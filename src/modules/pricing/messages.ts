/**
 * Tax status texts (AJA-1761). Keys are the contract's `label_key_short` values.
 * `{tax}` is replaced with the tax amount the server sent.
 */
import type { AppLanguage } from '@/app/locale';

import type { TaxReasonCode, TaxStatus } from './tax-result';

type StatusTexts = Record<TaxStatus, string>;
type StepTexts = Partial<Record<TaxReasonCode, string>>;

const en: { status: StatusTexts; step: StepTexts } = {
  status: {
    calculated: 'Includes tax of {tax}.',
    zero_rated: 'Tax rate is 0%.',
    exempt: 'Exempt from tax.',
    reverse_charge: 'You declare the tax. Price excludes tax.',
    not_calculated: 'Price excludes tax. Tax was not calculated.',
    service_unavailable: 'Price excludes tax. Tax is not known yet.',
  },
  step: {
    TAX_SERVICE_UNAVAILABLE:
      'Check the price again in a few minutes. You can pay once the tax is known.',
    TAX_SERVICE_TIMEOUT:
      'Check the price again in a few minutes. You can pay once the tax is known.',
    TAX_MISSING_BILLING_COUNTRY: 'Add your billing country.',
    TAX_UNSUPPORTED_COUNTRY: 'We cannot bill this country yet. Contact support.',
    TAX_MISSING_TAX_ID: 'Add your tax number.',
  },
};

const tr: typeof en = {
  status: {
    calculated: 'Fiyata {tax} vergi dahil.',
    zero_rated: 'Vergi oranı yüzde 0.',
    exempt: 'Bu fiyat vergiden muaf.',
    reverse_charge: 'Vergiyi siz beyan edersiniz. Fiyata vergi dahil değil.',
    not_calculated: 'Fiyata vergi dahil değil. Vergi hesaplanmadı.',
    service_unavailable: 'Fiyata vergi dahil değil. Vergi henüz belli değil.',
  },
  step: {
    TAX_SERVICE_UNAVAILABLE:
      'Birkaç dakika sonra fiyata yeniden bakın. Vergi belli olunca ödeme yapabilirsiniz.',
    TAX_SERVICE_TIMEOUT:
      'Birkaç dakika sonra fiyata yeniden bakın. Vergi belli olunca ödeme yapabilirsiniz.',
    TAX_MISSING_BILLING_COUNTRY: 'Fatura ülkenizi ekleyin.',
    TAX_UNSUPPORTED_COUNTRY: 'Bu ülkeye henüz fatura kesemiyoruz. Destek ekibine yazın.',
    TAX_MISSING_TAX_ID: 'Vergi numaranızı ekleyin.',
  },
};

export const taxMessages: Record<AppLanguage, typeof en> = { en, tr };
