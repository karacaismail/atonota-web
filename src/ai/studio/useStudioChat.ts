import { useXAgent, useXChat } from '@ant-design/x';
import { useCallback, useRef } from 'react';

import type { GenUIAction } from '@/genui';

import { emptyAssistant, runAgent } from '../agent';
import type { AgentTransport, ChatMessage, UserMessage } from '../agent';

interface AgentInput {
  message: ChatMessage;
  messages: ChatMessage[];
}

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

function isFinished(message: ChatMessage): boolean {
  return message.role === 'user' || message.phase !== 'waiting';
}

/**
 * Sohbet durumu. useXAgent isteği çalıştırır, useXChat mesajları tutar.
 * İptal, son isteğin AbortController nesnesiyle yapılır.
 */
export function useStudioChat(transport: AgentTransport) {
  const abortRef = useRef<AbortController | null>(null);

  const [agent] = useXAgent<ChatMessage, AgentInput, ChatMessage>({
    request: ({ message, messages }, { onUpdate, onSuccess, onStream }) => {
      const controller = new AbortController();
      abortRef.current = controller;
      onStream?.(controller);
      const user = message as UserMessage;
      void runAgent({
        transport,
        request: {
          message: user,
          history: messages.filter((m) => m !== message && isFinished(m)),
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

  const send = useCallback(
    (message: UserMessage) => {
      if (busy) return;
      onRequest(message);
    },
    [busy, onRequest],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  /** Asistan yanıtını ve ona yol açan kullanıcı mesajını kaldırıp yeniden sorar. */
  const regenerate = useCallback(
    (assistantId: string | number) => {
      if (busy) return;
      const index = messages.findIndex((m) => m.id === assistantId);
      const prompt = messages[index - 1];
      if (index < 1 || prompt?.message.role !== 'user') return;
      const user = prompt.message;
      setMessages((all) => all.filter((m) => m.id !== assistantId && m.id !== prompt.id));
      onRequest(user);
    },
    [busy, messages, onRequest, setMessages],
  );

  return { messages, setMessages, send, cancel, regenerate, busy };
}
