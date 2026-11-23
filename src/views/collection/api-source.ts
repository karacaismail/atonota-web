import { ApiError } from '@/api';
import type { ApiClient } from '@/api';
import { CollectionError } from './types';
import type { CollectionSource } from './types';

/**
 * Koleksiyon listesini ortak `listDocuments` istemcisine bağlar (Frappe `/api/v2/document`).
 * Yetki ve oturum hataları `unauthorized` olur. Öteki hatalar yeniden denenebilir.
 * Ham sunucu iletisi ekrana taşınmaz. İptal hatası olduğu gibi geçer.
 */
export function createApiSource(client: Pick<ApiClient, 'listDocuments'>): CollectionSource {
  return {
    async list(request, signal) {
      try {
        return await client.listDocuments(
          request.doctype,
          {
            fields: request.fields,
            ...(request.filters.length ? { filters: request.filters } : {}),
            orderBy: request.order_by,
            start: request.limit_start,
            limit: request.limit_page_length,
          },
          { signal },
        );
      } catch (error) {
        throw toCollectionError(error, signal);
      }
    },
  };
}

/** Ortak API hatasını koleksiyon hatasına çevirir. Özet kaynağı da bunu kullanır. */
export function toCollectionError(error: unknown, signal: AbortSignal): unknown {
  if (signal.aborted || (error instanceof DOMException && error.name === 'AbortError'))
    return error;
  if (error instanceof CollectionError) return error;
  if (error instanceof ApiError && (error.kind === 'forbidden' || error.kind === 'session_expired'))
    return new CollectionError('unauthorized', 'Kayıtları görme yetkisi yok.');
  return new CollectionError('error', 'Kayıtlar yüklenemedi.');
}
