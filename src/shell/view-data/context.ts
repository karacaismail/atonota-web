import { createContext } from 'react';

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
export interface ShellViewData {
  collection?: ShellCollectionData;
}

export const ViewDataContext = createContext<ShellViewData | null>(null);
