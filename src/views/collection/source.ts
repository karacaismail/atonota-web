/**
 * Hafif giriş: kaynak ve tanım yardımcıları. Görünümü ve yönlendiriciyi getirmez.
 * Uygulama girişi (`src/app/view-data.ts`) ilk yük parçasındadır ve yalnız bunları ister.
 * `index.ts` girişi `CollectionView` ile birlikte `react-router-dom` paketini de getirir.
 */
export { createApiSource, toCollectionError } from './api-source';
export { createDefinition, parsePage } from './model';
export type {
  CollectionDefinition,
  CollectionPage,
  CollectionRow,
  CollectionSource,
  ListRequest,
  ViewRoles,
} from './types';
