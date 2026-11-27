import { createContext, type ReactNode, useContext } from 'react';

/** Target record of a link field. */
export interface RecordLinkTarget {
  doctype: string;
  name: string;
}

/**
 * Renders the link to the target record. The app supplies the router's link.
 * The record view does not know the router. Returns `null` if no link can be built; the name stays
 * plain text.
 */
export type RecordLinkRenderer = (target: RecordLinkTarget, children: ReactNode) => ReactNode;

const RecordLinkContext = createContext<RecordLinkRenderer | undefined>(undefined);

export const RecordLinkProvider = RecordLinkContext.Provider;

export function useRecordLinkRenderer(): RecordLinkRenderer | undefined {
  return useContext(RecordLinkContext);
}
