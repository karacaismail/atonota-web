// Bu klasörün sahibi `api-client` işidir.
// Sahte sunucuyu başlatmak için alt yolları kullanın:
//   testte `@/mocks/node`, geliştirmede `@/mocks/browser` (yalnız `import.meta.env.DEV` koşulunda).
export { GATEWAY_FAILURES, handlers, mockState, resetMockState } from './handlers';
export type { GatewayFailure } from './handlers';
export * from './fixtures';
