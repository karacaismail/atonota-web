import { useState } from 'react';

import type { GenUIActionResult, GenUIDecision } from '../types';

export const BUSY_NOTE = 'Yanıt bitince onay verebilirsiniz.';
export const FAILED_NOTE = 'Onay gönderilemedi. Yanıt bitince yeniden deneyin.';
export const EXPIRED_LABEL = 'Süresi doldu';
export const EXPIRED_NOTE = 'Bu öneri artık onaylanamaz. Asistandan yeni öneri isteyin.';
export const USED_NOTE = 'Bu onay daha önce gönderildi. İşlem yeniden yapılmadı.';

/**
 * Onay ve form bloklarının karar durumu.
 *
 * Karar iki yerden gelir. Birincisi sohbet geçmişidir (`decided`). Blok yeniden
 * çizilse de karar kaybolmaz. İkincisi bu çizimde verilen karardır.
 * Sohbet kararı almazsa neden ekranda yazar.
 */
export function useDecision(decided: GenUIDecision | undefined) {
  const [local, setLocal] = useState<GenUIDecision | null>(null);
  const [notice, setNotice] = useState<Exclude<GenUIActionResult, 'accepted'> | null>(null);
  const decision = decided ?? local;

  const apply = (next: GenUIDecision, result: GenUIActionResult) => {
    if (result === 'accepted') {
      setLocal(next);
      setNotice(null);
    } else {
      setNotice(result);
    }
  };

  return {
    decision,
    notice,
    /** Karar verildiyse ya da onay daha önce kullanıldıysa blok kilitlidir. */
    locked: decision !== null || notice === 'used',
    apply,
  };
}
