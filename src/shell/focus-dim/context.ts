import { createContext } from 'react';

export interface FocusDimApi {
  acquire: () => () => void;
}

export const FocusDimContext = createContext<FocusDimApi | null>(null);
