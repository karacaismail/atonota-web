// Bu klasörün sahibi `api-client` işidir.
// Web paneli erişim belirteci tutmaz. Giriş arka ucun Keycloak akışından geçer.
// Panele nasıl takılacağı README.md dosyasında yazar.
export { createAuth, isSafeRedirect, startLoginUrl } from './auth';
export type { Auth, AuthDeps, AuthState } from './auth';
export { AuthGate } from './AuthGate';
export type { AuthGateProps } from './AuthGate';
export { LoginScreen } from './LoginScreen';
export type { LoginScreenProps } from './LoginScreen';
export { createPlatformSession } from './session';
export type { PlatformSession, PlatformSessionDeps } from './session';
export { useAuthState } from './useAuthState';
