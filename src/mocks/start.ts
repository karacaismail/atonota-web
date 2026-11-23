// Tarayıcıda sahte sunucuyu açar.
//
// Sahte sunucu şu durumda açılır:
//   - geliştirme sunucusunda (`import.meta.env.DEV`), `VITE_API_MOCKS=off` değilse,
//   - ya da derlemede `VITE_API_MOCKS=on` verilmişse. Örneğin tarayıcı testlerinde.
// Üretim derlemesinde bu ayar yoksa sahte sunucu koda girmez.

export interface MockEnv {
  DEV: boolean;
  VITE_API_MOCKS?: string;
}

export function mocksEnabled(env: MockEnv): boolean {
  if (env.VITE_API_MOCKS === 'off') return false;
  return env.DEV || env.VITE_API_MOCKS === 'on';
}

export type MockStartResult = { active: false } | { active: true; csrfToken: string };

/**
 * Sahte sunucunun sahiplendiği istekler: yolu `/api/` ile başlayanlar.
 * Sayfa, parça ve yazı tipi istekleri sahte sunucuya ait değildir; olduğu gibi geçer.
 * Karşılığı olmayan `/api/` isteği hata alır ve ağa çıkmaz.
 */
export function isMockedApiRequest(url: string): boolean {
  return new URL(url).pathname.startsWith('/api/');
}

/** API isteklerinden önce çağrılır. İşçi hazır olmadan istek gönderilmez. */
export async function startApiMocks(): Promise<MockStartResult> {
  // Koşul doğrudan `import.meta.env` ile yazılır. Derleme onu sabite çevirir.
  // Böylece kapalıyken sahte sunucu pakete girmez. Kural `mocksEnabled` ile aynıdır.
  if (
    import.meta.env.VITE_API_MOCKS === 'off' ||
    !(import.meta.env.DEV || import.meta.env.VITE_API_MOCKS === 'on')
  ) {
    return { active: false };
  }
  const { startMockWorker } = await import('./browser');
  const { csrfToken } = await startMockWorker();
  return { active: true, csrfToken };
}
