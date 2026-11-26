import { useSyncExternalStore } from 'react';

/**
 * Sanal klavye payı. Görünür alan pencerenin bu oranından fazla küçülürse klavye açık sayılır.
 * Telefon klavyesi dikeyde ekranın yaklaşık üçte birini, yatayda yarısını kaplar.
 * Tarayıcının adres çubuğu bu orandan azdır. Bu yüzden adres çubuğu klavye sayılmaz.
 */
const KEYBOARD_SHARE = 0.2;

function keyboardOpen(): boolean {
  const vv = window.visualViewport;
  if (!vv) return false;
  // Yakınlaştırmada görünür alan küçülür ama ölçekle çarpımı pencereye eşit kalır.
  const visible = vv.height * vv.scale;
  return window.innerHeight - visible > window.innerHeight * KEYBOARD_SHARE;
}

function subscribe(cb: () => void) {
  const vv = window.visualViewport;
  vv?.addEventListener('resize', cb);
  window.addEventListener('resize', cb);
  return () => {
    vv?.removeEventListener('resize', cb);
    window.removeEventListener('resize', cb);
  };
}

/**
 * Sanal klavye açık mı? Karar `visualViewport` boyutundan gelir.
 * Cihaz adı ya da user-agent kullanılmaz. `visualViewport` yoksa klavye kapalı sayılır.
 */
export function useVirtualKeyboard(): boolean {
  return useSyncExternalStore(subscribe, keyboardOpen, () => false);
}
