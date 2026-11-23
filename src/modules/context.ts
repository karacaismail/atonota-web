import { createContext, useContext } from 'react';
import type { ModuleEnvironment } from './runtime';
export const ModuleContext = createContext<ModuleEnvironment | null>(null);
export const useModule = () => useContext(ModuleContext);
