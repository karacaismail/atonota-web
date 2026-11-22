import { XStream } from '@ant-design/x';

import { parseBlocks } from '@/genui';

import { parseAgentEvent } from './events';
import type { AgentEvent, AgentRequest, AgentTransport, AssistantMessage } from './types';

export interface RunAgentOptions {
  transport: AgentTransport;
  request: AgentRequest;
  signal: AbortSignal;
  /** Her geçerli olaydan sonra güncel yanıtla çağrılır. */
  onUpdate: (message: AssistantMessage) => void;
  /** İki parça arasında en çok bu kadar beklenir. */
  idleTimeoutMs?: number;
}

export const DEFAULT_IDLE_TIMEOUT_MS = 30_000;

export function emptyAssistant(): AssistantMessage {
  return { role: 'assistant', text: '', steps: [], ui: [], phase: 'waiting' };
}

function reduce(message: AssistantMessage, event: AgentEvent): AssistantMessage {
  switch (event.type) {
    case 'step': {
      const exists = message.steps.some((step) => step.key === event.key);
      const step = { key: event.key, title: event.title, status: event.status };
      const steps = exists
        ? message.steps.map((s) => (s.key === event.key ? step : s))
        : [...message.steps, step];
      return { ...message, steps };
    }
    case 'text':
      return { ...message, text: message.text + event.delta, phase: 'streaming' };
    case 'ui':
      return { ...message, ui: parseBlocks(event.blocks) };
    case 'done':
      return { ...message, phase: 'done' };
    case 'error':
      return { ...message, phase: 'error', error: event.message };
  }
}

class IdleTimeout extends Error {}

/**
 * Sunucu akışını okur ve yanıtı adım adım kurar (U5).
 *
 * - İptal her an çalışır. İptalden sonra `onUpdate` bir daha çağrılmaz.
 * - Geçersiz parça yok sayılır (AX-5).
 * - Akış `done` olmadan biterse yanıt hata olur. Arayüz bunu gösterir.
 */
export async function runAgent({
  transport,
  request,
  signal,
  onUpdate,
  idleTimeoutMs = DEFAULT_IDLE_TIMEOUT_MS,
}: RunAgentOptions): Promise<AssistantMessage> {
  let message = emptyAssistant();
  const finish = (phase: AssistantMessage['phase'], error?: string): AssistantMessage => {
    message = { ...message, phase, ...(error ? { error } : {}) };
    // Akış bitmeden gelen bloklar gösterilmez (U5).
    if (phase !== 'done') message = { ...message, ui: [] };
    return message;
  };

  if (signal.aborted) return finish('cancelled');

  let reader: ReadableStreamDefaultReader<{ data?: unknown }> | null = null;
  const onAbort = () => {
    void reader?.cancel().catch(() => undefined);
  };
  signal.addEventListener('abort', onAbort);

  try {
    const body = await transport(request, signal);
    if (signal.aborted) return finish('cancelled');
    reader = XStream({ readableStream: body }).getReader();

    for (;;) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new IdleTimeout()), idleTimeoutMs);
      });
      let result: ReadableStreamReadResult<{ data?: unknown }>;
      try {
        result = await Promise.race([reader.read(), timeout]);
      } finally {
        clearTimeout(timer);
      }
      if (signal.aborted) return finish('cancelled');
      if (result.done) break;

      const event = parseAgentEvent(result.value.data);
      if (!event) continue;
      message = reduce(message, event);
      if (message.phase === 'error') {
        const failed = finish('error', message.error);
        onUpdate(failed);
        return failed;
      }
      onUpdate(message);
      if (message.phase === 'done') return message;
    }
    return finish('error', 'Bağlantı yanıt bitmeden koptu.');
  } catch (error) {
    if (signal.aborted) return finish('cancelled');
    if (error instanceof IdleTimeout) {
      void reader?.cancel().catch(() => undefined);
      return finish('error', 'Sunucu zamanında yanıt vermedi.');
    }
    return finish('error', 'Sunucuya bağlanılamadı.');
  } finally {
    signal.removeEventListener('abort', onAbort);
  }
}
