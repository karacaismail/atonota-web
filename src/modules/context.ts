import { createContext, useContext } from 'react';
import { moduleAccess, type ModuleAccess } from './registry';
import type { ModuleEnvironment } from './runtime';
export const ModuleContext = createContext<ModuleEnvironment | null>(null);
export const useModule = () => useContext(ModuleContext);
/** Modülün kişiye açık kısmı (G-168). Rol yoksa bütün sayfa açıktır. */
export function useModuleAccess(id: string): ModuleAccess | null {
  const env = useModule();
  return moduleAccess(id, env?.roles ?? env?.profile?.roles);
}
