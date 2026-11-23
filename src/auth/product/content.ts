// Tanıtım sayfasının değer önerileri (G-165).
// Kural: sayfa yalnız var olan yeteneği "var" diye anlatır. Yapılmamış olan "Yakında" bölümündedir.
// Her öneri bir gereksinime bağlıdır. Metinler `messages.json` dosyasındadır.
import type messages from './messages.json';

export type ValueKey = keyof (typeof messages)['tr']['values'];

export interface ValueProp {
  key: ValueKey;
  /** Ürün sayfasındaki gereksinim kimliği. Örnek: `G-159`. */
  requirement: string;
  /** `ready`: bugün var. `soon`: henüz yok. */
  status: 'ready' | 'soon';
  /**
   * Yalnız `ready` önerilerde zorunludur: yeteneğin bugün var olduğunu gösteren kanıt.
   * Kanıt depoda doğrulanabilir bir yerdir. Kanıt yoksa öneri "Yakında" bölümünde durur.
   */
  evidence?: string;
}

// Kural (inceleme 1, bulgu 1): platformla giriş ve bağlı hesaplar için backend uçları ve
// platform istemcileri henüz canlıda yok. Bu yüzden ikisi "Yakında" bölümündedir.
// Canlıda doğrulanınca `ready` olur ve kanıtı yazılır.
export const valueProps: readonly ValueProp[] = [
  {
    key: 'single_door',
    requirement: 'G-158',
    status: 'ready',
    evidence:
      'src/auth/LoginScreen.tsx: "AtonotA Login ile oturum aç" düğmesi start_login akışını açar.',
  },
  {
    key: 'open_source',
    requirement: 'G-157',
    status: 'ready',
    evidence:
      'Proje sahibinin 23 Kasım 2026 kararları, 5. madde: ürün kodu MIT, Keycloak Apache-2.0.',
  },
  { key: 'many_platforms', requirement: 'G-159', status: 'soon' },
  { key: 'linked_accounts', requirement: 'G-160', status: 'soon' },
  // Kaynak: G-76 (Keycloak Hetzner'de kurulur) ve KARARLAR dosyasının 27. kararı.
  { key: 'data_location', requirement: 'G-76', status: 'soon' },
  { key: 'access_rules', requirement: 'G-161', status: 'soon' },
  { key: 'strong_sign_in', requirement: 'G-163', status: 'soon' },
  { key: 'email_link', requirement: 'G-162', status: 'soon' },
  { key: 'identity_check', requirement: 'G-164', status: 'soon' },
];
