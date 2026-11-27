import { useXAgent, useXChat } from '@ant-design/x';
import { useCallback, useLayoutEffect, useMemo, useRef } from 'react';

import type { GenUIAction, GenUIActionResult, GenUIDecisions } from '@/genui';

import { emptyAssistant, runAgent } from '../agent';
import type { AgentIntent, AgentTransport, ChatMessage, UserMessage } from '../agent';
import { acceptChunk } from './generation';
import type { Generation } from './generation';
import { createKeyStore } from './idempotencyStore';
import type { KeyScope } from './idempotencyStore';

interface AgentInput {
  message: ChatMessage;
  messages: ChatMessage[];
  intent?: AgentIntent;
  actionId?: string;
  /** IDs every chunk of this reply carries. */
  generation: Generation;
  controller: AbortController;
  idempotencyKey?: string;
  /** Approval block whose stored key is removed when a final result arrives. */
  settles?: string;
}

/** User message shown for a regenerate request. Carries no approval data. */
export const REGENERATE_TEXT = 'Son yanıtı yeniden yaz.';
/** User message shown for a status query. Carries no approval data. */
export const STATUS_TEXT = 'İşlemin durumunu sor.';

/** Turns a user decision into a new message shown in the conversation (U4). */
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

/**
 * ID of the operation the message is tied to.
 * For an approval or form decision it is the block ID. For a status query it is the queried ID.
 * A question action has no ID.
 */
export function actionIdOf(message: ChatMessage | undefined): string | undefined {
  if (message?.role !== 'user') return undefined;
  if (message.statusOf) return message.statusOf;
  if (!message.action || message.action.kind === 'ask') return undefined;
  return message.action.blockId;
}

/** Collects approval and form decisions from the conversation history by block ID. */
export function decisionsOf(messages: readonly ChatMessage[]): GenUIDecisions {
  const decisions: Record<string, 'approved' | 'rejected'> = {};
  for (const message of messages) {
    if (message.role !== 'user' || !message.action || message.action.kind === 'ask') continue;
    decisions[message.action.blockId] = message.action.decision;
  }
  return decisions;
}

/** Strips approval data from messages sent as history. Approval goes only in its own request. */
function withoutAction(message: ChatMessage): ChatMessage {
  if (message.role !== 'user' || !message.action) return message;
  const { action: _action, ...rest } = message;
  return rest;
}

function isFinished(message: ChatMessage): boolean {
  return message.role === 'user' || message.phase !== 'waiting';
}

/** An approved approval or form decision is a commercial action. It carries its own idempotency key. */
function isApproval(message: UserMessage): boolean {
  return (
    (message.action?.kind === 'confirm' || message.action?.kind === 'form') &&
    message.action.decision === 'approved'
  );
}

interface StoredMessage {
  id: string | number;
  message: ChatMessage;
  status: string;
}

/**
 * Closes replies that are still loading or streaming as "stopped".
 * Blocks of a stopped reply are not shown (U5).
 */
function finalize<T extends StoredMessage>(list: readonly T[]): T[] {
  return list.map((item) => {
    if (item.status !== 'loading' && item.status !== 'updating') return item;
    const { message } = item;
    if (message.role !== 'assistant') return { ...item, status: 'success' };
    const open = message.phase === 'waiting' || message.phase === 'streaming';
    return {
      ...item,
      status: 'success',
      message: open ? { ...message, phase: 'cancelled', ui: [] } : message,
    };
  });
}

/**
 * Conversation state. useXAgent runs the request, useXChat holds the messages.
 *
 * Stream rules (AJA-1780):
 * - Every chunk carries the conversation, message and generation IDs.
 * - Only chunks of the active generation in the conversation on screen are written.
 * - Stop and conversation switch end the generation at once. Its late chunks are dropped.
 * - Only one request runs at a time. A second press of the send button creates no message.
 *
 * Approval rules (AX-6):
 * - Approval data is single-use. The same operation ID is not sent twice.
 * - An approved operation carries its own idempotency key (AJA-1749).
 * - Regenerate asks only for the reply text. It does not send approval data.
 * - If an approved request drops, a retry asks for the operation's status.
 *
 * Idempotency key storage (AJA-1860, contract AJA-1749):
 * - With a team and account scope, the key lives in `localStorage`. A reload keeps it.
 * - The same approval sends the same key again while its result is unknown.
 * - A status query for that approval carries the same key.
 * - A final result removes the key: `done`, or an `error` event sent by the server.
 *   A dropped connection, a timeout or a stop leaves the result unknown. The key stays.
 * - A key older than 23 hours is not resent. The client asks for the status instead.
 */
export function useStudioChat(
  transport: AgentTransport,
  conversationId = 'default',
  scope: KeyScope | null = null,
) {
  const active = useRef<{ generation: Generation; controller: AbortController } | null>(null);
  const conversation = useRef(conversationId);
  const counter = useRef(0);
  const usedActions = useRef(new Set<string>());
  const team = scope?.team;
  const user = scope?.user;
  const keys = useMemo(() => createKeyStore(team && user ? { team, user } : null), [team, user]);

  useLayoutEffect(() => {
    conversation.current = conversationId;
  }, [conversationId]);

  const [agent] = useXAgent<ChatMessage, AgentInput, ChatMessage>({
    request: (
      {
        message,
        messages,
        intent = 'message',
        actionId,
        generation,
        controller,
        idempotencyKey,
        settles,
      },
      { onUpdate, onSuccess, onStream },
    ) => {
      onStream?.(controller);
      // An `error` event comes from the server, so the result is known.
      let serverError = false;
      const current = () =>
        acceptChunk(generation, active.current?.generation ?? null, conversation.current);
      void runAgent({
        transport,
        request: {
          intent,
          message: message as UserMessage,
          history: messages.filter((m) => m !== message && isFinished(m)).map(withoutAction),
          ...(actionId ? { actionId } : {}),
          ...(idempotencyKey ? { idempotencyKey } : {}),
        },
        signal: controller.signal,
        onUpdate: (update) => {
          if (update.phase === 'error') serverError = true;
          if (current()) onUpdate(update);
        },
      }).then((final) => {
        if (settles && idempotencyKey && (final.phase === 'done' || serverError)) {
          keys.release(settles, idempotencyKey);
        }
        // A stopped or switched-away generation writes nothing. Not even its final state.
        if (!current()) return;
        active.current = null;
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

  /** Opens a new generation. The previous one must have ended. */
  const begin = useCallback((messageId?: string) => {
    counter.current += 1;
    const generation: Generation = {
      conversationId: conversation.current,
      messageId: messageId ?? `m${counter.current}`,
      generationId: `g${counter.current}`,
    };
    const controller = new AbortController();
    active.current = { generation, controller };
    return { generation, controller };
  }, []);

  /** Ends the active generation. Its later chunks are dropped. */
  const end = useCallback((): boolean => {
    const running = active.current;
    if (!running) return false;
    active.current = null;
    running.controller.abort();
    return true;
  }, []);

  /** Sends the message. The result is passed to the block. */
  const send = useCallback(
    (message: UserMessage): GenUIActionResult => {
      // The active generation is the lock. It changes at once, without waiting for a render.
      // Two presses in a row send once. A send right after stop is accepted.
      if (active.current) return 'busy';
      const actionId = actionIdOf(message);
      if (actionId) {
        if (usedActions.current.has(actionId)) return 'used';
        usedActions.current.add(actionId);
      }
      const held = actionId && isApproval(message) ? keys.acquire(actionId) : null;
      const { generation, controller } = begin();
      if (actionId && held?.expired) {
        // The key is older than 23 hours. The approval is not resent. Its status is asked.
        onRequest({
          message: {
            role: 'user',
            text: STATUS_TEXT,
            statusOf: actionId,
            clientId: generation.messageId,
          },
          intent: 'status',
          actionId,
          generation,
          controller,
          idempotencyKey: held.key,
          settles: actionId,
        });
        return 'accepted';
      }
      onRequest({
        message: { ...message, clientId: generation.messageId },
        intent: 'message',
        generation,
        controller,
        ...(actionId && held ? { idempotencyKey: held.key, settles: actionId } : {}),
      });
      return 'accepted';
    },
    [begin, keys, onRequest],
  );

  /** Stops the reply. The reply stays on screen as "stopped". */
  const cancel = useCallback(() => {
    if (end()) setMessages((all) => finalize(all));
  }, [end, setMessages]);

  /**
   * Stops the reply before a conversation switch.
   * Returns the closed message list. The caller stores it for this conversation.
   */
  const detach = useCallback(() => {
    end();
    let snapshot = finalize(messages);
    setMessages((all) => {
      snapshot = finalize(all);
      return snapshot;
    });
    return snapshot;
  }, [end, messages, setMessages]);

  /**
   * Asks for the reply again. Each regenerate opens a new generation.
   * - If the previous message is not an approval: removes the reply and question, asks again.
   * - If the previous message is an approval: the approval message stays. Approval is not resent.
   *   If the reply ended in an error, the operation's status is queried. Otherwise only text is requested.
   */
  const regenerate = useCallback(
    (assistantId: string | number) => {
      if (active.current) return;
      const index = messages.findIndex((m) => m.id === assistantId);
      const answer = messages[index];
      const prompt = messages[index - 1];
      if (index < 1 || !answer || prompt?.message.role !== 'user') return;

      const actionId = actionIdOf(prompt.message);
      if (actionId) {
        const failed = answer.message.role === 'assistant' && answer.message.phase === 'error';
        setMessages((all) => all.filter((m) => m.id !== assistantId));
        const { generation, controller } = begin();
        const message: UserMessage = failed
          ? { role: 'user', text: STATUS_TEXT, statusOf: actionId }
          : { role: 'user', text: REGENERATE_TEXT };
        // The status query carries the pending key of the approval, if there is one.
        const held = failed ? keys.peek(actionId) : null;
        onRequest({
          message: { ...message, clientId: generation.messageId },
          intent: failed ? 'status' : 'regenerate',
          ...(failed ? { actionId } : {}),
          ...(held ? { idempotencyKey: held.key, settles: actionId } : {}),
          generation,
          controller,
        });
        return;
      }

      const user = prompt.message;
      setMessages((all) => all.filter((m) => m.id !== assistantId && m.id !== prompt.id));
      const { generation, controller } = begin(user.clientId);
      onRequest({
        message: { ...user, clientId: generation.messageId },
        intent: 'regenerate',
        generation,
        controller,
      });
    },
    [begin, keys, messages, onRequest, setMessages],
  );

  /** What the reply's retry button does: a status query or a retry. */
  const retryKind = useCallback(
    (assistantId: string | number): 'status' | 'retry' => {
      const index = messages.findIndex((m) => m.id === assistantId);
      return actionIdOf(messages[index - 1]?.message) ? 'status' : 'retry';
    },
    [messages],
  );

  return { messages, setMessages, send, cancel, detach, regenerate, retryKind, busy };
}
