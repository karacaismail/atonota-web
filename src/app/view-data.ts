import { lazy } from 'react';

import type { ApiClient } from '@/api';
import type { ShellAccount, ShellSidebar, ShellViewData } from '@/shell/view-data';
// Hafif giriş: `@/views/collection` ana girişi CollectionView ve yönlendiriciyi getirir.
// Bu dosya ilk yük parçasındadır; yönlendirici ve görünüm yalnız liste rotasıyla inmelidir.
import { createApiSource, createDefinition } from '@/views/collection/source';

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

type Bootstrap = Awaited<ReturnType<ApiClient['getBootstrap']>>;
type BootstrapSidebar = Bootstrap['sidebars'][number];

/** Grup adını adres parçasına çevirir. Örnek: `Selling` -> `selling`, `Site Plan` -> `site-plan`. */
function moduleSlug(name: string): string {
  return name.trim().toLocaleLowerCase('tr').split(/\s+/).filter(Boolean).join('-');
}

const truthy = (v: number | boolean | null | undefined) => v === true || v === 1;

/**
 * Açılış verisindeki sidebar satırlarını menü grubuna çevirir.
 * Yalnız DocType bağlantıları alınır; liste rotası yalnız bunları açar. Gizli satır alınmaz.
 * Adresten aynı ada geri çevrilemeyen tür alınmaz; bağlantı başka türe giderdi.
 */
function toShellSidebar(sidebar: BootstrapSidebar): ShellSidebar | null {
  const data = sidebar.data;
  const links = (data.items ?? []).flatMap((item) => {
    const doctype = item.link_to?.trim();
    if (item.link_type !== 'DocType' || !doctype || truthy(item.hidden)) return [];
    if (doctypeFromSlug(encodeURIComponent(doctype)) !== doctype) return [];
    return [{ label: item.label?.trim() || doctype, doctype }];
  });
  const module = moduleSlug(data.module ?? sidebar.name);
  if (links.length === 0 || !module) return null;
  return { id: sidebar.name, label: data.label?.trim() || sidebar.name, module, links };
}

/** Kabuğun liste rotasını ortak API istemcisine bağlar. Kabuk kendi istemcisini kurmaz. */
export function createShellViewData(
  api: Pick<ApiClient, 'getDocType' | 'listDocuments' | 'getBootstrap'>,
): ShellViewData {
  return {
    collection: {
      async loadDefinition({ doctype }, signal) {
        const result = await api.getDocType(doctypeFromSlug(doctype), undefined, { signal });
        if (result.status !== 'fresh') throw new Error('DocType bilgisi alınamadı.');
        // Liste başlığı DocType'ın görünen adıdır. Sözleşmede ayrı görünen ad yoktur; ad budur.
        return createDefinition(result.meta, { label: result.meta.schema.name });
      },
      // Liste isteklerini `views-collection` işinin ortak bağlantısı sunucuya iletir.
      source: createApiSource(api),
      title: ({ doctype }) => doctypeFromSlug(doctype),
    },
    navigation: {
      // Menü uydurma grup göstermez: veri yoksa ya da istek başarısızsa liste boştur.
      async loadSidebars(signal) {
        try {
          const bootstrap = await api.getBootstrap({ signal });
          return (bootstrap.sidebars ?? []).flatMap((s) => toShellSidebar(s) ?? []);
        } catch {
          return [];
        }
      },
    },
    // Kayıt görünümü kendi parçasında iner; yalnız kayıt rotası açılınca yüklenir.
    record: { Component: lazy(() => import('./RecordRoute')) },
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
