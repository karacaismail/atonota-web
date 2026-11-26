import { XStream } from '@ant-design/x';
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { approveFlow, createFlow, receiveServerEvent } from '../agent';
import type { AgentMode, AgentRequest, AgentTransport, FlowState } from '../agent';
import type { ModedRequest } from './flowDemo';

/**
 * Sunucu akışının ikinci kopyasını okur. Her `data` satırını verilen işleve iletir.
 * İstek durunca okuma da durur. Okuma hatası sohbeti etkilemez.
 */
async function watch(
  body: ReadableStream<Uint8Array>,
  signal: AbortSignal,
  onData: (data: string) => void,
) {
  const reader = XStream({ readableStream: body }).getReader();
  const stop = () => void reader.cancel().catch(() => undefined);
  signal.addEventListener('abort', stop, { once: true });
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done || signal.aborted) return;
      if (typeof value.data === 'string') onData(value.data);
    }
  } catch {
    // Sohbet aynı hatayı kendi kopyasında gösterir.
  } finally {
    signal.removeEventListener('abort', stop);
  }
}

/**
 * Altı adımlı akışı sohbete bağlar (AJA-1159).
 *
 * - Kip isteğe eklenir. Sunucu kipi okur.
 * - Adım ve araç olayı yalnız sunucu satırından gelir. Ekran adım uydurmaz.
 * - Her sohbetin kendi akışı vardır. Sohbet değişince akış da değişir.
 */
export function useFlow(transport: AgentTransport, conversation: string) {
  const [flows, setFlows] = useState<Record<string, FlowState>>({});
  const flow = flows[conversation] ?? createFlow();
  // İstek anında geçerli olan sohbet ve kip. Durum güncellemesini beklemeden okunur.
  const current = useRef({ conversation, flow });
  useLayoutEffect(() => {
    current.current = { conversation, flow };
  }, [conversation, flow]);

  const update = useCallback((key: string, next: (state: FlowState) => FlowState) => {
    setFlows((all) => {
      const before = all[key] ?? createFlow();
      const after = next(before);
      return after === before ? all : { ...all, [key]: after };
    });
  }, []);

  const flowTransport = useMemo<AgentTransport>(
    () => async (request: AgentRequest, signal: AbortSignal) => {
      const { conversation: key, flow: state } = current.current;
      const moded: ModedRequest = { ...request, mode: state.mode };
      const body = await transport(moded, signal);
      const [chat, steps] = body.tee();
      void watch(steps, signal, (data) => {
        if (!signal.aborted) update(key, (s) => receiveServerEvent(s, data));
      });
      return chat;
    },
    [transport, update],
  );

  /** Yeni iş yeni akış açar. Kip bu akış boyunca değişmez. */
  const start = useCallback(
    (mode: AgentMode) => {
      const fresh = createFlow(mode);
      current.current = { ...current.current, flow: fresh };
      update(current.current.conversation, () => fresh);
    },
    [update],
  );

  /** Kullanıcının onayı. Yalnız onay adımında ve "İşlem yap" kipinde geçerlidir. */
  const approve = useCallback(() => {
    const next = approveFlow(current.current.flow);
    current.current = { ...current.current, flow: next };
    update(current.current.conversation, approveFlow);
  }, [update]);

  const forget = useCallback((key: string) => {
    setFlows((all) => Object.fromEntries(Object.entries(all).filter(([k]) => k !== key)));
  }, []);

  return { flow, flowTransport, start, approve, forget };
}
