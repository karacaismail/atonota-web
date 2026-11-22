import type { AgentEvent } from './types';

const MAX_TEXT = 4000;

function isObj(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function shortString(value: unknown, max = 500): value is string {
  return typeof value === 'string' && value.length <= max;
}

/**
 * Tek bir SSE `data` alanını doğrular (AX-5).
 * Geçersiz parça `null` döner ve yok sayılır.
 */
export function parseAgentEvent(data: unknown): AgentEvent | null {
  if (typeof data !== 'string') return null;
  let raw: unknown;
  try {
    raw = JSON.parse(data);
  } catch {
    return null;
  }
  if (!isObj(raw)) return null;
  switch (raw['type']) {
    case 'step': {
      const status = raw['status'];
      if (!shortString(raw['key'], 64) || !shortString(raw['title'])) return null;
      if (status !== 'pending' && status !== 'success' && status !== 'error') return null;
      return { type: 'step', key: raw['key'], title: raw['title'], status };
    }
    case 'text':
      return shortString(raw['delta'], MAX_TEXT) ? { type: 'text', delta: raw['delta'] } : null;
    case 'ui':
      return { type: 'ui', blocks: raw['blocks'] };
    case 'done':
      return { type: 'done' };
    case 'error':
      return shortString(raw['message'])
        ? { type: 'error', message: raw['message'] }
        : { type: 'error', message: 'Sunucu hata bildirdi.' };
    default:
      return null;
  }
}

/** Olayı SSE satırına çevirir. Sahte sunucu ve testler kullanır. */
export function encodeAgentEvent(event: AgentEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}
