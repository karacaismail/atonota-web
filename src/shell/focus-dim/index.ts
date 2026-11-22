/**
 * Odak perdesi (D1–D5) için kabuk bağlantısı.
 *
 * GEÇİCİ: `foundation` işinin `src/engines/focus-dim/` motoru henüz `main`
 * dalında yok. Bu klasör aynı kararı kabuk içinde uygular. Motor gelince
 * `useFocusDim` yalnız o motoru çağıracak. Bileşenler bu kancayı kullanır,
 * bu yüzden geçişte bileşen değişmez.
 */
export { FocusDimProvider } from './FocusDimProvider';
export { useFocusDim } from './useFocusDim';
