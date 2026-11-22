// Frappe REST API v2 kayıt listesi ucu için elle yazılmış tipler.
//
// Bu uç bizim OpenAPI sözleşmelerimizde yoktur. Frappe'nin standart ucudur.
// Orkestratör kararı, 23 Kasım 2026 Pazartesi: views-collection liste ve sayfalama için bu ucu kullanır.
// Biçim Frappe 16.56.0 kaynağından doğrulandı: frappe/api/v2.py `document_list`,
// frappe/api/__init__.py `handle` ve frappe/utils/response.py hata biçimi.
// Ayrıntı ve sürüm: src/api/README.md. Frappe sürümü değişince biçimi yeniden doğrulayın.

/** Frappe süzgeç operatörleri. */
export type FilterOperator =
  '=' | '!=' | '>' | '<' | '>=' | '<=' | 'like' | 'not like' | 'in' | 'not in' | 'is' | 'between';

export type FilterScalar = string | number | boolean | null;

/**
 * Süzgeç iki biçimde verilir:
 * - nesne: `{ status: 'Açık' }` ya da `{ amount: ['>', 400] }`,
 * - liste: `[['amount', '>', 400]]`.
 */
export type DocumentFilters =
  | Record<string, FilterScalar | [FilterOperator, FilterScalar | FilterScalar[]]>
  | [string, FilterOperator, FilterScalar | FilterScalar[]][];

export interface DocumentListQuery {
  /** Okunacak alanlar. Verilmezse Frappe yalnız `name` döner. */
  fields?: string[];
  filters?: DocumentFilters;
  /** Örnek: `modified desc` ya da `name asc`. */
  orderBy?: string;
  /** Atlanacak kayıt sayısı. En az 0. */
  start?: number;
  /** Sayfa boyu. 1 ile 100 arasındadır. Varsayılan 20. Sınır proje kararıdır (SZ-10). */
  limit?: number;
}

export interface DocumentPage {
  /** Kullanıcının okuyabildiği kayıtlar. Her kayıt alan adından değere bir nesnedir. */
  data: Record<string, unknown>[];
  /** Sonraki sayfa var mı? Frappe toplam sayı vermez. */
  hasNextPage: boolean;
}

/** openapi-fetch için yol tipi. Yalnız liste ucu tanımlıdır. */
export interface FrappeV2Paths {
  '/api/v2/document/{doctype}': {
    parameters: { query?: never; header?: never; path?: never; cookie?: never };
    get: {
      parameters: {
        query?: {
          fields?: string;
          filters?: string;
          order_by?: string;
          start?: number;
          limit?: number;
        };
        header?: never;
        path: { doctype: string };
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        200: {
          headers: Record<string, unknown>;
          content: {
            'application/json': { data: Record<string, unknown>[]; has_next_page: boolean };
          };
        };
        default: {
          headers: Record<string, unknown>;
          content: { 'application/json': { errors?: { type: string; message?: string }[] } };
        };
      };
    };
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
}
