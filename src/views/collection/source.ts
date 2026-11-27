/**
 * Light entry: source and definition helpers. It does not pull in the view or the router.
 * The app entry (`src/app/view-data.ts`) is in the first-load chunk and needs only these.
 * The `index.ts` entry also pulls in the `react-router-dom` package with `CollectionView`.
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
