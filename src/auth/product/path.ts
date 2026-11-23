// Tanıtım sayfasının adresi. Bu dosya küçüktür ve ana pakete girer.
// Sayfanın kendisi ayrı parçadır (`ProductPage.tsx`). Parça yalnız bu adreste yüklenir.

/** AtonotA Login tanıtım sayfasının adresi. Sayfa oturum istemez (G-165). */
export const PRODUCT_PATH = '/atonota-login';

/** Adres oturum istemeyen bir sayfanın mı? Sondaki tek `/` kabul edilir. */
export function isPublicPath(pathname: string): boolean {
  return pathname === PRODUCT_PATH || pathname === `${PRODUCT_PATH}/`;
}
