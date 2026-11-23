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
}

export const valueProps: readonly ValueProp[] = [
  { key: 'single_door', requirement: 'G-158', status: 'ready' },
  { key: 'many_platforms', requirement: 'G-159', status: 'ready' },
  { key: 'linked_accounts', requirement: 'G-160', status: 'ready' },
  { key: 'open_source', requirement: 'G-157', status: 'ready' },
  { key: 'data_location', requirement: 'G-167', status: 'ready' },
  { key: 'access_rules', requirement: 'G-161', status: 'soon' },
  { key: 'strong_sign_in', requirement: 'G-163', status: 'soon' },
  { key: 'email_link', requirement: 'G-162', status: 'soon' },
  { key: 'identity_check', requirement: 'G-164', status: 'soon' },
];
