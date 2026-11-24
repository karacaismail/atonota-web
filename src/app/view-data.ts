import { createElement, lazy } from 'react';

import type { ApiClient } from '@/api';
import type { RecordAddress, ShellAccount, ShellSidebar, ShellViewData } from '@/shell/view-data';
import type { CollectionSource } from '@/views/collection/source';

// Bu dosya ilk yük parçasındadır. Koleksiyon kaynağı ve tanım kurucusu ilk yükte olmamalıdır.
// Zincir yalnız liste rotası ilk isteği yapınca `import()` ile iner (orkestratör eki: ilk yük).
// Kayıt bağdaştırıcısı da yalnız kayıt rotasıyla iner (`RecordRoute` tembel parçası).
const loadCollectionSource = () => import('@/views/collection/source');

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

/**
 * Modül adını adres parçasına çevirir. Örnek: `Selling` -> `selling`, `Site Plan` -> `site-plan`.
 * Menü grubu ve kayıt bağlantısı aynı çeviriyi kullanır; böylece adres menüdeki grupla eşleşir.
 */
export function moduleSlug(name: string): string {
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

// Kayıt görünümü kendi parçasında iner; yalnız kayıt rotası açılınca yüklenir.
const RecordRoute = lazy(() => import('./RecordRoute'));

/**
 * Kabuğun liste ve kayıt rotalarını ortak API istemcisine bağlar. Kabuk kendi istemcisini kurmaz.
 * Kayıt rotası da aynı istemciyi kullanır: site kökü, CSRF deposu ve oturum süresi işi ortaktır.
 */
export function createShellViewData(
  api: Pick<ApiClient, 'getDocType' | 'listDocuments' | 'frappeDocument' | 'getBootstrap'>,
): ShellViewData {
  function Record(address: RecordAddress) {
    return createElement(RecordRoute, { ...address, api });
  }
  // Liste isteklerini `views-collection` işinin ortak bağlantısı sunucuya iletir.
  // Bağlantı ilk istekte bir kez kurulur.
  let pending: Promise<CollectionSource> | undefined;
  const source: CollectionSource = {
    async list(request, signal) {
      pending ??= loadCollectionSource().then((module) => module.createApiSource(api));
      return (await pending).list(request, signal);
    },
  };
  return {
    collection: {
      async loadDefinition({ doctype }, signal) {
        const [result, module] = await Promise.all([
          api.getDocType(doctypeFromSlug(doctype), undefined, { signal }),
          loadCollectionSource(),
        ]);
        if (result.status !== 'fresh') throw new Error('DocType bilgisi alınamadı.');
        // Liste başlığı DocType'ın görünen adıdır. Sözleşmede ayrı görünen ad yoktur; ad budur.
        return module.createDefinition(result.meta, { label: result.meta.schema.name });
      },
      source,
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
    record: { Component: Record },
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
