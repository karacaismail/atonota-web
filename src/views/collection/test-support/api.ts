import { createApiClient, createCsrfStore, readApiConfig } from '@/api';
import { SAMPLE_CSRF_TOKEN } from '@/mocks/fixtures';
import { createApiSource } from '../api-source';

/** Testlerde ortak API istemcisini sahte sunucuya (MSW) bağlar. */
export function sampleApiClient() {
  return createApiClient({
    config: readApiConfig({}, 'https://kiraci.example.test'),
    csrf: createCsrfStore(SAMPLE_CSRF_TOKEN),
  });
}
export function sampleSource() {
  return createApiSource(sampleApiClient());
}
/** Tembel yüklenen görünüm ilk koşuda derlenir. Soğuk koşuda 1 saniye yetmeyebilir. */
export const LAZY_VIEW = { timeout: 5000 };
