import { createContext, type ReactNode, useContext } from 'react';

/** Bağlantı alanının hedef kaydı. */
export interface RecordLinkTarget {
  doctype: string;
  name: string;
}

/**
 * Hedef kayda giden bağlantıyı çizer. Uygulama yönlendiricinin bağlantısını verir.
 * Kayıt görünümü yönlendiriciyi bilmez. Bağlantı kurulamıyorsa `null` döner; ad düz metin kalır.
 */
export type RecordLinkRenderer = (target: RecordLinkTarget, children: ReactNode) => ReactNode;

const RecordLinkContext = createContext<RecordLinkRenderer | undefined>(undefined);

export const RecordLinkProvider = RecordLinkContext.Provider;

export function useRecordLinkRenderer(): RecordLinkRenderer | undefined {
  return useContext(RecordLinkContext);
}
