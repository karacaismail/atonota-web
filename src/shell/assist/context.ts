import { createContext, useContext } from 'react';

/**
 * Yardımcı panelin açık durumu. Kabuk durumu tutar.
 * Başka bir düğme de paneli açabilir. Örneğin telefonun alt çubuğu.
 * Panel kapanınca odak paneli açan düğmeye döner.
 */
export interface AssistPanelApi {
  open: boolean;
  /** Paneli açar ya da kapatır. `opener` odağın döneceği düğmedir. */
  toggle: (opener?: HTMLElement | null) => void;
  close: () => void;
}

export const AssistPanelContext = createContext<AssistPanelApi | null>(null);

export function useAssistPanel(): AssistPanelApi | null {
  return useContext(AssistPanelContext);
}
