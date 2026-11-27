/** What a module environment was built for. */
export interface ModuleEnvironmentKey {
  session: unknown;
  user: string;
  dataMode: string;
  locale: string;
}

/**
 * Chooses the module environment the shell may use now.
 * If the session, user or data mode changed, the old environment is not used.
 * If only the language changed, the old environment stays until the new one arrives (AJA-1772).
 * So the module page is not unmounted and its form, filter and draft stay.
 */
export function usableModuleEnvironment<Env>(
  loaded: (ModuleEnvironmentKey & { env: Env }) | undefined,
  current: ModuleEnvironmentKey,
): Env | undefined {
  if (
    !loaded ||
    loaded.session !== current.session ||
    loaded.user !== current.user ||
    loaded.dataMode !== current.dataMode
  ) {
    return undefined;
  }
  return loaded.env;
}
