import type { ApiClient } from '@/api';
import type { ShellViewData } from '@/shell/view-data';
import { createDefinition } from '@/views/collection/model';

/**
 * Adres parçasını Frappe DocType adına çevirir.
 * Örnek: `sales-invoice` -> `Sales Invoice`.
 */
export function doctypeFromSlug(slug: string): string {
  return decodeURIComponent(slug)
    .split(/[-\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toLocaleUpperCase('en') + word.slice(1))
    .join(' ');
}

/** Kabuğun liste rotasını ortak API istemcisine bağlar. Kabuk kendi istemcisini kurmaz. */
export function createShellViewData(
  api: Pick<ApiClient, 'getDocType' | 'listDocuments'>,
): ShellViewData {
  return {
    collection: {
      async loadDefinition({ doctype }, signal) {
        const result = await api.getDocType(doctypeFromSlug(doctype), undefined, { signal });
        if (result.status !== 'fresh') throw new Error('DocType bilgisi alınamadı.');
        return createDefinition(result.meta);
      },
      source: {
        kind: 'api',
        async list(request, signal) {
          const page = await api.listDocuments(
            request.doctype,
            {
              fields: request.fields,
              filters: request.filters,
              orderBy: request.order_by,
              start: request.limit_start,
              limit: request.limit_page_length,
            },
            { signal },
          );
          return { data: page.data, has_next_page: page.hasNextPage };
        },
      },
    },
  };
}
