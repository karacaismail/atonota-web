// Bu klasörün sahibi `api-client` işidir.
// Sahte sunucuyu başlatmak için alt yolları kullanın:
//   testte `@/mocks/node`, geliştirmede `@/mocks/browser` (yalnız `import.meta.env.DEV` koşulunda).
export { handlers, mockState, resetMockState } from './handlers';
export * from './fixtures';
