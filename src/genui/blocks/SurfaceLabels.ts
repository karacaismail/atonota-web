import type { AssistMode, ResultOutcome, RiskLevel, ToolEventStatus } from '../types';

/** Yüzeylerdeki sabit ekran yazıları. Sunucu yalnız kodu gönderir, yazı burada kalır. */
export const MODE_LABEL: Record<AssistMode, string> = {
  ask: 'Sor',
  search: 'Ara',
  draft: 'Taslak hazırla',
  act: 'İşlem yap',
};

export const RISK_LABEL: Record<RiskLevel, string> = {
  R0: 'R0 Okuma',
  R1: 'R1 Düşük',
  R2: 'R2 Orta',
  R3: 'R3 Yüksek',
};

/** Rozet tonu. Renk tek başına anlam taşımaz: düzey her zaman yazıyla da yazar. */
export const RISK_TONE: Record<RiskLevel, 'info' | 'warn' | 'danger'> = {
  R0: 'info',
  R1: 'info',
  R2: 'warn',
  R3: 'danger',
};

export const EVENT_LABEL: Record<ToolEventStatus, string> = {
  running: 'Sürüyor',
  done: 'Bitti',
  failed: 'Başarısız',
};

export const OUTCOME_LABEL: Record<ResultOutcome, string> = {
  succeeded: 'Sonuç: başarılı.',
  failed: 'Sonuç: başarısız.',
  unknown: 'Sonuç: bilinmiyor.',
};
