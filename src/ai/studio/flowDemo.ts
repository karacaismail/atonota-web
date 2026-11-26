import { createMockTransport } from '../agent';
import type { MockTransportOptions } from '../agent';

/** Geçici: akış senaryosu henüz yok (AJA-1159). */
export function createFlowDemoTransport(options: Pick<MockTransportOptions, 'delayMs'> = {}) {
  return createMockTransport(options);
}
