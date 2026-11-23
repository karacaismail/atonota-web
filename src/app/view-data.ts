import type { ApiClient } from '@/api';
import type { ShellAccount, ShellViewData } from '@/shell/view-data';
// Derin içe aktarım: `@/views/collection` girişi CollectionView ve yönlendiriciyi getirir.
// Bu dosya ilk yük parçasındadır; yönlendirici ve görünüm yalnız liste rotasıyla inmelidir.
import { createApiSource } from '@/views/collection/api-source';
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
      // Liste isteklerini `views-collection` işinin ortak bağlantısı sunucuya iletir.
      source: createApiSource(api),
    },
  };
}

/**
 * Kullanıcı kartı için oturumdaki kişiyi okur. Görünen ad açılış verisinden gelir.
 * Açılış verisi başka kullanıcıya aitse ya da istek başarısızsa yalnız kimlik döner.
 */
export async function loadShellAccount(
  api: Pick<ApiClient, 'getBootstrap'>,
  user: string,
  signal?: AbortSignal,
): Promise<ShellAccount> {
  try {
    const bootstrap = await api.getBootstrap(signal ? { signal } : {});
    const fullName = bootstrap.user.full_name?.trim();
    if (bootstrap.user.name === user && fullName) return { user, fullName };
  } catch {
    /* Ad okunamazsa kart kimliği gösterir. */
  }
  return { user };
}
