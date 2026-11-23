/**
 * Sayfayı tarayıcıdan yeniden yükler.
 * Yeni sürümde eski sayfa dosyaları silinir. Yeniden yükleme yeni dosya adlarını getirir.
 * Ağ koptuğunda da yeniden yükleme dosyayı yeniden ister.
 */
export function reloadPage(): void {
  window.location.reload();
}
