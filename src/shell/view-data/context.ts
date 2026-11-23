import { createContext } from 'react';

import type { ModuleEnvironment } from '@/modules';
import type { CollectionDefinition, CollectionSource } from '@/views/collection';

/** Liste rotasının adres parçaları. Eşleme sağlayıcının işidir. */
export interface CollectionAddress {
  module: string;
  doctype: string;
}

export interface ShellCollectionData {
  /** Adresteki DocType için koleksiyon tanımını getirir. İptal sinyaline uyar. */
  loadDefinition: (
    address: CollectionAddress,
    signal: AbortSignal,
  ) => Promise<CollectionDefinition>;
  /** Liste isteklerini sunucuya ileten kaynak. */
  source: CollectionSource;
}

/**
 * Kabuğun görünümlere verdiği veri bağlantısı.
 * Kabuk API istemcisi kurmaz. Bağlantıyı uygulama girişi (`src/app/`) verir.
 */
/** Oturumdaki kişi. Kullanıcı kartı bunu gösterir. */
export interface ShellAccount {
  /** Frappe kullanıcı kimliği. Örnek: `kisi@example.test`. */
  user: string;
  /** Görünen ad. Yoksa kart kullanıcı kimliğini gösterir. */
  fullName?: string;
}

export interface ShellViewData {
  collection?: ShellCollectionData;
  /** Oturumdaki kişi. Yoksa kabuk örnek kişiyi gösterir (deneme sayfaları). */
  account?: ShellAccount;
  /** Modül sayfalarının ortamı. Kabuk bunu `ModuleProvider` ile verir. */
  modules?: ModuleEnvironment;
}

export const ViewDataContext = createContext<ShellViewData | null>(null);
