import { createContext } from 'react';
import type { ComponentType } from 'react';

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
  /**
   * Adresteki türün görünen adı. Tanım gelmeden (bekleme ve hata ekranı) sayfa başlığı budur.
   * Örnek: `/satis/teklif` -> `Teklif`. Yoksa başlık genel "Kayıtlar" olur.
   */
  title?: (address: CollectionAddress) => string;
}

/** Sidebar grubundaki liste bağlantısı. */
export interface ShellSidebarLink {
  /** Menüde görünen ad. */
  label: string;
  /** Frappe DocType adı. Adres parçası bundan üretilir. */
  doctype: string;
}

/** Sunucunun açılış verisindeki bir sidebar grubu. Eşleme uygulama girişinin işidir. */
export interface ShellSidebar {
  id: string;
  label: string;
  /** Liste adresinin ilk parçası. Örnek: `selling`. */
  module: string;
  links: ShellSidebarLink[];
}

export interface ShellNavigationData {
  /** Menü gruplarını getirir. Veri yoksa ya da istek başarısızsa boş liste döner. */
  loadSidebars: (signal: AbortSignal) => Promise<ShellSidebar[]>;
}

/** Kayıt rotasının adres parçaları. */
export interface RecordAddress {
  module: string;
  doctype: string;
  /** Adresteki kayıt adı, kodlanmış hâliyle. */
  name: string;
}

export interface ShellRecordData {
  /** Kaydı çizen bileşen. Uygulama girişi bunu tembel yükler. */
  Component: ComponentType<RecordAddress>;
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
  /** Kayıt rotasının bağlantısı. Yoksa kabuk örnek kaydı gösterir (deneme sayfaları). */
  record?: ShellRecordData;
  /** Oturumdaki kişi. Yoksa kabuk örnek kişiyi gösterir (deneme sayfaları). */
  account?: ShellAccount;
  /** Menü grupları. Yoksa menüde yalnız rota kaydındaki sayfalar görünür. */
  navigation?: ShellNavigationData;
  /** Modül sayfalarının ortamı. Kabuk bunu `ModuleProvider` ile verir. */
  modules?: ModuleEnvironment;
}

export const ViewDataContext = createContext<ShellViewData | null>(null);
