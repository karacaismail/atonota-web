// Bayi istemcisi: bağlı müşteriler, site durumu ve yeni müşteri isteği (G-169, G-170).
//
// Bu dosya ilk yüke girmez. "Müşteriler" sayfası onu `import()` ile yükler.
// İstekler ortak istemciden geçer: `frappeDocument` site kökünü, CSRF başlığını,
// zaman aşımını ve oturum süresi işini üstlenir.
//
// Uçlar `platform_core.api.reseller` modülündedir. Yanıt biçimi AJA-831 testlerinin sözleşmesidir:
// - `list_customers` (GET): satır listesi. Her satırda `customer_tenant` vardır.
// - `customer_status` (GET, `customer_tenant`): `customer_tenant` ve `status`.
// - `request_customer` (POST, `customer_name`, `contact_email`): isteğin `name` değeri.
// Yetkiyi sunucu denetler. Örnek: "Reseller Assistant" isteği gönderirse sunucu 403 verir.
import type { ApiClient, RequestOptions } from './client';
import type { Guard } from './guards';
import { ApiError } from './index';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const MAX_CUSTOMERS = 500;
const MAX_TEXT = 140;

const isText = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= MAX_TEXT;

export interface ResellerCustomer {
  /** Müşteri kiracısının site adı. Örnek: `musteri-a.example.test`. */
  customer_tenant: string;
}

export interface CustomerStatus {
  customer_tenant: string;
  /** Sitenin durumu. Örnek: `active`. Sayfa bilinmeyen değeri olduğu gibi yazar. */
  status: string;
}

export interface CustomerRequestInput {
  customer_name: string;
  contact_email: string;
}

export interface CustomerRequest {
  /** Açılan isteğin kimliği. */
  name: string;
}

const isCustomer = (value: unknown): value is ResellerCustomer =>
  isRecord(value) && isText(value.customer_tenant);

export const isCustomerList: Guard<ResellerCustomer[]> = (value): value is ResellerCustomer[] =>
  Array.isArray(value) &&
  value.length <= MAX_CUSTOMERS &&
  value.every(isCustomer) &&
  new Set(value.map((row) => row.customer_tenant)).size === value.length;

export const isCustomerStatus: Guard<CustomerStatus> = (value): value is CustomerStatus =>
  isRecord(value) && isText(value.customer_tenant) && isText(value.status);

export const isCustomerRequest: Guard<CustomerRequest> = (value): value is CustomerRequest =>
  isRecord(value) && isText(value.name);

const METHOD = '/api/method/platform_core.api.reseller.';

export function createResellerClient(api: Pick<ApiClient, 'frappeDocument'>) {
  async function call<T>(
    request: {
      method: 'GET' | 'POST';
      name: string;
      query?: Record<string, string>;
      body?: object;
    },
    guard: Guard<T>,
    options: RequestOptions,
  ): Promise<T> {
    const response = await api.frappeDocument({
      method: request.method,
      path: `${METHOD}${request.name}`,
      ...(request.query ? { query: request.query } : {}),
      ...(request.body ? { body: request.body } : {}),
      ...(options.signal ? { signal: options.signal } : {}),
    });
    if (!response.ok) throw response.error;
    const value = isRecord(response.body) ? response.body.message : undefined;
    if (!guard(value)) throw new ApiError({ kind: 'invalid_response', status: response.status });
    return value;
  }

  return {
    /** Bayinin bağlı müşterileri. Sunucu yalnız bu bayiye bağlı kiracıları döner. */
    listCustomers(options: RequestOptions = {}): Promise<ResellerCustomer[]> {
      return call({ method: 'GET', name: 'list_customers' }, isCustomerList, options);
    },

    /** Bir müşterinin site durumu. Başka bayinin müşterisinde sunucu 403 verir. */
    async customerStatus(tenant: string, options: RequestOptions = {}): Promise<CustomerStatus> {
      const status = await call(
        { method: 'GET', name: 'customer_status', query: { customer_tenant: tenant } },
        isCustomerStatus,
        options,
      );
      if (status.customer_tenant !== tenant)
        throw new ApiError({ kind: 'invalid_response', status: 200 });
      return status;
    },

    /** Yeni müşteri isteği açar. İsteği "Platform Operator" onaylar. */
    requestCustomer(
      input: CustomerRequestInput,
      options: RequestOptions = {},
    ): Promise<CustomerRequest> {
      return call(
        { method: 'POST', name: 'request_customer', body: { ...input } },
        isCustomerRequest,
        options,
      );
    },
  };
}

export type ResellerClient = ReturnType<typeof createResellerClient>;
