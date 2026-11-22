import type { GenUIAction, GenUIBlock } from '@/genui';

/** Sunucunun gönderdiği düşünme adımı. Arayüz adım uydurmaz. */
export interface AgentStep {
  key: string;
  title: string;
  status: 'pending' | 'success' | 'error';
}

export interface UserMessage {
  role: 'user';
  text: string;
  files?: string[];
  /** GenUI bloğundan gelen kullanıcı kararı (U4). */
  action?: GenUIAction;
}

export type AssistantPhase = 'waiting' | 'streaming' | 'done' | 'cancelled' | 'error';

/** Asistan yanıtı (U1): `{ text, steps, ui[] }` ve akış durumu. */
export interface AssistantMessage {
  role: 'assistant';
  text: string;
  steps: AgentStep[];
  ui: GenUIBlock[];
  phase: AssistantPhase;
  error?: string;
}

export type ChatMessage = UserMessage | AssistantMessage;

/** Sunucuya giden istek. Geçmiş yalnız tamamlanmış mesajları içerir. */
export interface AgentRequest {
  message: UserMessage;
  history: ChatMessage[];
}

/**
 * Akış olayları. Her olay bir SSE `data:` satırında JSON olarak gelir.
 * Örnek: `data: {"type":"text","delta":"Merhaba "}`
 */
export type AgentEvent =
  | { type: 'step'; key: string; title: string; status: AgentStep['status'] }
  | { type: 'text'; delta: string }
  | { type: 'ui'; blocks: unknown }
  | { type: 'done' }
  | { type: 'error'; message: string };

/**
 * Taşıyıcı: isteği alır, SSE bayt akışı döndürür.
 * Sahte sunucu ve gerçek bağdaştırıcı aynı sözleşmeyi uygular.
 */
export type AgentTransport = (
  request: AgentRequest,
  signal: AbortSignal,
) => Promise<ReadableStream<Uint8Array>>;

/** Ekranda gösterilecek bağlantı bilgisi (AX-7). */
export interface AgentSource {
  /** Örnek: "Sahte sunucu" ya da "Model geçidi". */
  label: string;
  /** Sahte sunucu ise `true`. Arayüz bunu açıkça yazar. */
  simulated: boolean;
}
