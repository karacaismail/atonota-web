import { createApiClient, createCsrfStore, readApiConfig } from '@/api';
import { SAMPLE_CSRF_TOKEN } from '@/mocks/fixtures';
import { createApiSource } from '../api-source';

/** Connects the shared API client to the mock server (MSW) in tests. */
export function sampleApiClient() {
  return createApiClient({
    config: readApiConfig({}, 'https://kiraci.example.test'),
    csrf: createCsrfStore(SAMPLE_CSRF_TOKEN),
  });
}
export function sampleSource() {
  return createApiSource(sampleApiClient());
}
/** The lazy-loaded view compiles on the first run. On a cold run 1 second may not be enough. */
export const LAZY_VIEW = { timeout: 5000 };
