import { useXAgent, useXChat } from '@ant-design/x';
import { useCallback, useRef } from 'react';

import type { GenUIAction } from '@/genui';

import { emptyAssistant, runAgent } from '../agent';
import type { AgentIntent, AgentTransport, ChatMessage, UserMessage } from '../agent';

interface AgentInput {
  message: ChatMessage;
  messages: ChatMessage[];
  intent?: AgentIntent;
  actionId?: string;
}

/** Yeniden üretme isteğinde görünen kullanıcı mesajı. Onay verisi taşımaz. */
export const REGENERATE_TEXT = 'Son yanıtı yeniden yaz.';
/** Durum sorgusunda görünen kullanıcı mesajı. Onay verisi taşımaz. */
export const STATUS_TEXT = 'İşlemin durumunu sor.';

/** Kullanıcı kararını sohbette görünen yeni bir mesaja çevirir (U4). */
export function actionToMessage(action: GenUIAction): UserMessage {
  switch (action.kind) {
    case 'ask':
      return { role: 'user', text: action.text };
    case 'confirm':
    case 'form':
      return {
        role: 'user',
        text:
          action.decision === 'approved'
            ? `Onaylıyorum: ${action.title}`
            : `Vazgeçiyorum: ${action.title}`,
        action,
      };
  }
}

/** Onay ya da form kararının işlem kimliği. Soru eyleminde kimlik yoktur. */
export function actionIdOf(message: ChatMessage | undefined): string | undefined {
  if (message?.role !== 'user' || !message.action || message.action.kind === 'ask') {
    return undefined;
  }
  return message.action.blockId;
}

function isFinished(message: ChatMessage): boolean {
  return message.role === 'user' || message.phase !== 'waiting';
}

/**
 * Sohbet durumu. useXAgent isteği çalıştırır, useXChat mesajları tutar.
 *
 * Onay kuralları (AX-6):
 * - Onay verisi tek kullanımlıktır. Aynı işlem kimliği ikinci kez gönderilmez.
 * - "Yeniden üret" yalnız yanıt metnini ister. Onay verisini göndermez.
 * - Onaylı istek koparsa yeniden deneme işlemin durumunu sorar.
 */
export function useStudioChat(transport: AgentTransport) {
  const abortRef = useRef<AbortController | null>(null);
  const usedActions = useRef(new Set<string>());

  const [agent] = useXAgent<ChatMessage, AgentInput, ChatMessage>({
    request: (
      { message, messages, intent = 'message', actionId },
      { onUpdate, onSuccess, onStream },
    ) => {
      const controller = new AbortController();
      abortRef.current = controller;
      onStream?.(controller);
      void runAgent({
        transport,
        request: {
          intent,
          message: message as UserMessage,
          history: messages.filter((m) => m !== message && isFinished(m)),
          ...(actionId ? { actionId } : {}),
        },
        signal: controller.signal,
        onUpdate: (update) => onUpdate(update),
      }).then((final) => {
        if (abortRef.current === controller) abortRef.current = null;
        onSuccess([final]);
      });
    },
  });

  const { onRequest, messages, setMessages } = useXChat<
    ChatMessage,
    ChatMessage,
    AgentInput,
    ChatMessage
  >({
    agent,
    requestPlaceholder: () => emptyAssistant(),
    transformMessage: ({ chunk, chunks, originMessage }) =>
      chunk ?? chunks[chunks.length - 1] ?? originMessage ?? emptyAssistant(),
  });

  const last = messages[messages.length - 1];
  const busy = last?.status === 'loading' || last?.status === 'updating';

  /** Mesajı gönderir. Sohbet kabul ederse `true` döner. */
  const send = useCallback(
    (message: UserMessage): boolean => {
      if (busy) return false;
      const actionId = actionIdOf(message);
      if (actionId) {
        if (usedActions.current.has(actionId)) return false;
        usedActions.current.add(actionId);
      }
      onRequest({ message, intent: 'message' });
      return true;
    },
    [busy, onRequest],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  /**
   * Yanıtı yeniden ister.
   * - Önceki mesaj onay değilse: yanıtı ve soruyu kaldırır, soruyu yeniden sorar.
   * - Önceki mesaj onaysa: onay mesajı yerinde kalır. Onay yeniden gitmez.
   *   Yanıt hata ile bittiyse işlemin durumu sorulur. Aksi halde yalnız metin istenir.
   */
  const regenerate = useCallback(
    (assistantId: string | number) => {
      if (busy) return;
      const index = messages.findIndex((m) => m.id === assistantId);
      const answer = messages[index];
      const prompt = messages[index - 1];
      if (index < 1 || !answer || prompt?.message.role !== 'user') return;

      const actionId = actionIdOf(prompt.message);
      if (actionId) {
        const failed = answer.message.role === 'assistant' && answer.message.phase === 'error';
        setMessages((all) => all.filter((m) => m.id !== assistantId));
        onRequest(
          failed
            ? { message: { role: 'user', text: STATUS_TEXT }, intent: 'status', actionId }
            : { message: { role: 'user', text: REGENERATE_TEXT }, intent: 'regenerate' },
        );
        return;
      }

      const user = prompt.message;
      setMessages((all) => all.filter((m) => m.id !== assistantId && m.id !== prompt.id));
      onRequest({ message: user, intent: 'regenerate' });
    },
    [busy, messages, onRequest, setMessages],
  );

  /** Yanıtın yeniden deneme düğmesi ne yapar: durum sorgusu ya da yeniden deneme. */
  const retryKind = useCallback(
    (assistantId: string | number): 'status' | 'retry' => {
      const index = messages.findIndex((m) => m.id === assistantId);
      return actionIdOf(messages[index - 1]?.message) ? 'status' : 'retry';
    },
    [messages],
  );

  return { messages, setMessages, send, cancel, regenerate, retryKind, busy };
}
