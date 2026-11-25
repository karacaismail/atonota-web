export {
  moduleAccess,
  moduleRegistrations,
  TENANT_ADMIN_ASSISTANT_ROLE,
  visibleModules,
} from './registry';
export type { ModuleAccess, ModuleRegistration } from './registry';
export { createModuleClient } from './client';
export { ModuleProvider } from './runtime';
export type { ModuleClient, ModuleEnvironment } from './runtime';
