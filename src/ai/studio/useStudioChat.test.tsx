import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import type { GenUIAction } from '@/genui';

import { encodeAgentEvent } from '../agent';
import type { AgentEvent, AgentRequest, AgentTransport, UserMessage } from '../agent';
import { acceptChunk } from './generation';
import { RESEND_LIMIT_MS, storageName } from './idempotencyStore';
import { actionToMessage, useStudioChat } from './useStudioChat';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/**
 * Transport that the test drives by hand. Each request gets its own stream.
 * The stream ignores the abort signal, like a slow or stubborn server.
 */
function manual() {
  const requests: AgentRequest[] = [];
  const streams: ReadableStreamDefaultController<Uint8Array>[] = [];
  const transport: AgentTransport = (request) => {
    requests.push(structuredClone(request));
    return Promise.resolve(
      new ReadableStream<Uint8Array>({
        start(controller) {
          streams.push(controller);
        },
      }),
    );
  };
  const push = (index: number, ...events: AgentEvent[]) => {
    const controller = streams[index];
    if (!controller) throw new Error(`stream ${index} not open`);
    for (const event of events) {
      try {
        controller.enqueue(new TextEncoder().encode(encodeAgentEvent(event)));
      } catch {
        // The reader has already cancelled this stream. A late chunk goes nowhere.
      }
    }
  };
  return { requests, streams, transport, push };
}

const ask = (text: string): UserMessage => ({ role: 'user', text });

/** Lets queued stream reads and state updates run. No fixed wait. */
async function flush() {
  for (let i = 0; i < 10; i += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
}

function texts(messages: ReturnType<typeof useStudioChat>['messages']) {
  return messages.map((m) => `${m.message.role}:${m.message.text}`);
}

describe('akış parçası kimliği', () => {
  const active = { conversationId: 'c1', messageId: 'm1', generationId: 'g1' };

  it('konuşma, mesaj ve üretim kimliği eşleşen parça kabul edilir', () => {
    expect(acceptChunk({ ...active }, active, 'c1')).toBe(true);
  });

  it('kimliklerden biri eksik parça ekrana yazılmaz', () => {
    expect(acceptChunk({ conversationId: 'c1', messageId: 'm1' }, active, 'c1')).toBe(false);
    expect(acceptChunk({ conversationId: 'c1', generationId: 'g1' }, active, 'c1')).toBe(false);
    expect(acceptChunk({ messageId: 'm1', generationId: 'g1' }, active, 'c1')).toBe(false);
    expect(acceptChunk({ conversationId: '', messageId: '', generationId: '' }, active, 'c1')).toBe(
      false,
    );
  });

  it('eski üretimin parçası kabul edilmez', () => {
    expect(acceptChunk({ ...active, generationId: 'g0' }, active, 'c1')).toBe(false);
  });

  it('başka konuşmanın parçası kabul edilmez', () => {
    expect(acceptChunk({ ...active }, active, 'c2')).toBe(false);
  });

  it('etkin üretim yoksa hiçbir parça kabul edilmez', () => {
    expect(acceptChunk({ ...active }, null, 'c1')).toBe(false);
  });
});

describe('useStudioChat akış kuralları', { timeout: 15_000 }, () => {
  it('1. gönder iki kez basılınca konuşmada tek kullanıcı mesajı oluşur', async () => {
    const { requests, transport } = manual();
    const { result } = renderHook(() => useStudioChat(transport, 'c1'));
    const outcomes: string[] = [];
    act(() => {
      outcomes.push(result.current.send(ask('Merhaba')));
      outcomes.push(result.current.send(ask('Merhaba')));
    });
    await flush();
    expect(outcomes).toEqual(['accepted', 'busy']);
    expect(result.current.messages.filter((m) => m.message.role === 'user')).toHaveLength(1);
    expect(requests).toHaveLength(1);
  });

  it('2. A sohbetinin geç parçaları B sohbetine yazılmaz', async () => {
    const { push, transport } = manual();
    const { result, rerender } = renderHook(({ id }) => useStudioChat(transport, id), {
      initialProps: { id: 'A' },
    });
    act(() => {
      result.current.send(ask('A sorusu'));
    });
    await flush();
    push(0, { type: 'text', delta: 'A yanıtı. ' });
    await flush();

    // The user switches to conversation B while A is still streaming.
    act(() => {
      const snapshotA = result.current.detach();
      expect(texts(snapshotA)).toEqual(['user:A sorusu', 'assistant:A yanıtı. ']);
      expect(snapshotA.at(-1)?.message).toMatchObject({ phase: 'cancelled' });
      result.current.setMessages([]);
    });
    rerender({ id: 'B' });

    push(0, { type: 'text', delta: 'A geç parça.' }, { type: 'done' });
    await flush();
    expect(result.current.messages).toEqual([]);
    expect(result.current.busy).toBe(false);
  });

  it('2. A sohbetine geri dönülünce gönder düğmesi açık kalır', async () => {
    const { push, transport } = manual();
    const { result, rerender } = renderHook(({ id }) => useStudioChat(transport, id), {
      initialProps: { id: 'A' },
    });
    act(() => {
      result.current.send(ask('A sorusu'));
    });
    await flush();
    push(0, { type: 'text', delta: 'Yarım' });
    await flush();
    let snapshotA: ReturnType<typeof useStudioChat>['messages'] = [];
    act(() => {
      snapshotA = result.current.detach();
      result.current.setMessages([]);
    });
    rerender({ id: 'B' });
    await flush();
    act(() => result.current.setMessages(snapshotA));
    rerender({ id: 'A' });
    await flush();
    expect(result.current.busy).toBe(false);
    expect(result.current.messages.every((m) => m.status !== 'loading')).toBe(true);
    expect(result.current.messages.every((m) => m.status !== 'updating')).toBe(true);
  });

  it('3. durdurulan üretimin geç parçaları yeni yanıta eklenmez', async () => {
    const { push, requests, transport } = manual();
    const { result } = renderHook(() => useStudioChat(transport, 'c1'));
    act(() => {
      result.current.send(ask('Birinci soru'));
    });
    await flush();
    push(0, { type: 'text', delta: 'Eski yanıt. ' });
    await flush();

    // The user stops the reply and asks again at once.
    let second = '';
    act(() => {
      result.current.cancel();
      second = result.current.send(ask('İkinci soru'));
    });
    expect(second).toBe('accepted');
    await flush();
    expect(requests).toHaveLength(2);

    push(0, { type: 'text', delta: 'Geç parça.' }, { type: 'done' });
    push(1, { type: 'text', delta: 'Yeni yanıt.' }, { type: 'done' });
    await flush();

    expect(texts(result.current.messages)).toEqual([
      'user:Birinci soru',
      'assistant:Eski yanıt. ',
      'user:İkinci soru',
      'assistant:Yeni yanıt.',
    ]);
    expect(result.current.messages[1]?.message).toMatchObject({ phase: 'cancelled' });
    expect(result.current.messages[3]?.message).toMatchObject({ phase: 'done' });
  });

  it('3. ilk parçası gelmeden durdurulan üretim yeni yanıtın yanına mesaj eklemez', async () => {
    const { push, transport } = manual();
    const { result } = renderHook(() => useStudioChat(transport, 'c1'));
    act(() => {
      result.current.send(ask('Birinci soru'));
    });
    await flush();
    act(() => {
      result.current.cancel();
      result.current.send(ask('İkinci soru'));
    });
    await flush();
    push(0, { type: 'done' });
    push(1, { type: 'text', delta: 'Yeni yanıt.' }, { type: 'done' });
    await flush();
    expect(result.current.messages).toHaveLength(4);
    expect(texts(result.current.messages).at(-1)).toBe('assistant:Yeni yanıt.');
  });

  it('4. yeniden üretme metni yeniler, onaylanmış ticari eylem ikinci kez gönderilmez', async () => {
    const { push, requests, transport } = manual();
    const { result } = renderHook(() => useStudioChat(transport, 'c1'));
    const approve: GenUIAction = {
      kind: 'confirm',
      blockId: 'buy-plan-1',
      title: 'Planı satın al',
      decision: 'approved',
    };

    // The user presses "Approve" twice.
    const outcomes: string[] = [];
    act(() => {
      outcomes.push(result.current.send(actionToMessage(approve)));
      outcomes.push(result.current.send(actionToMessage(approve)));
    });
    await flush();
    expect(outcomes[0]).toBe('accepted');
    expect(outcomes[1]).not.toBe('accepted');
    push(0, { type: 'text', delta: 'Satın alma yapıldı.' }, { type: 'done' });
    await flush();

    // The commercial request carries its own idempotency key.
    expect(requests).toHaveLength(1);
    expect(requests[0]?.idempotencyKey).toMatch(UUID_V4);

    const answerId = result.current.messages.at(-1)?.id;
    expect(answerId).toBeDefined();
    act(() => result.current.regenerate(answerId as string));
    await flush();
    push(1, { type: 'text', delta: 'Yeni metin.' }, { type: 'done' });
    await flush();

    expect(requests).toHaveLength(2);
    expect(requests[1]?.intent).toBe('regenerate');
    expect(requests[1]?.message.action).toBeUndefined();
    expect(requests[1]?.idempotencyKey).toBeUndefined();
    const commercial = requests.filter(
      (r) => r.message.action?.kind === 'confirm' && r.message.action.decision === 'approved',
    );
    expect(commercial).toHaveLength(1);
    await waitFor(() =>
      expect(texts(result.current.messages).at(-1)).toBe('assistant:Yeni metin.'),
    );
    expect(texts(result.current.messages)).not.toContain('assistant:Satın alma yapıldı.');

    // A second approval of the same block is refused. No new request goes out.
    act(() => {
      expect(result.current.send(actionToMessage(approve))).toBe('used');
    });
    await flush();
    expect(requests).toHaveLength(2);
  });

  it('4. reddedilen kararda iş anahtarı gönderilmez', async () => {
    const { requests, transport } = manual();
    const { result } = renderHook(() => useStudioChat(transport, 'c1'));
    act(() => {
      result.current.send(
        actionToMessage({
          kind: 'confirm',
          blockId: 'invite-1',
          title: 'Davet gönder',
          decision: 'rejected',
        }),
      );
    });
    await flush();
    expect(requests[0]?.idempotencyKey).toBeUndefined();
  });
});

/**
 * Idempotency key in persistent storage (AJA-1860).
 * Contract: AJA-1749, `contracts/idempotency.md`, sections 1-3.
 * - Format: lower-case UUID 4.
 * - Storage: `localStorage`. The name holds the team, the account and the action.
 * - Lifetime: the client resends a key on its own only while it is younger than 23 hours.
 * - A final result removes the key.
 */
describe(
  'AJA-1749 iş anahtarı kalıcı depoda (localStorage, küçük harfli UUID 4, 23 saat)',
  { timeout: 15_000 },
  () => {
    const teamA = { team: 'acme.atonota.net', user: 'kisi@example.test' };
    const approve: GenUIAction = {
      kind: 'confirm',
      blockId: 'buy-plan-1',
      title: 'Planı satın al',
      decision: 'approved',
    };
    const nameA = storageName(teamA, 'chat-approval', 'buy-plan-1');

    /** The stream ends without `done`. The client does not know the result. */
    const drop = (streams: ReadableStreamDefaultController<Uint8Array>[], index: number) => {
      act(() => streams[index]?.close());
    };

    beforeEach(() => localStorage.clear());

    it('1. onaydan sonra sayfa yenilenir, yeniden deneme aynı anahtarı gönderir', async () => {
      const first = manual();
      const before = renderHook(() => useStudioChat(first.transport, 'c1', teamA));
      act(() => {
        before.result.current.send(actionToMessage(approve));
      });
      await flush();
      const key = first.requests[0]?.idempotencyKey;
      expect(key).toMatch(UUID_V4);
      expect(localStorage.getItem(nameA)).toContain(key as string);

      // The page reloads before the result arrives. Memory is gone, storage stays.
      before.unmount();
      const second = manual();
      const after = renderHook(() => useStudioChat(second.transport, 'c1', teamA));
      act(() => {
        expect(after.result.current.send(actionToMessage(approve))).toBe('accepted');
      });
      await flush();
      expect(second.requests).toHaveLength(1);
      expect(second.requests[0]?.intent).toBe('message');
      expect(second.requests[0]?.idempotencyKey).toBe(key);
    });

    it('2. sonucu bilinmeyen işlem aynı anahtarla yeniden sorulur, ikinci işlem açılmaz', async () => {
      const { requests, streams, push, transport } = manual();
      const { result } = renderHook(() => useStudioChat(transport, 'c1', teamA));
      act(() => {
        result.current.send(actionToMessage(approve));
      });
      await flush();
      drop(streams, 0);
      await flush();
      const answer = result.current.messages.at(-1);
      expect(answer?.message).toMatchObject({ phase: 'error' });
      const key = requests[0]?.idempotencyKey;
      expect(localStorage.getItem(nameA)).toContain(key as string);

      act(() => result.current.regenerate(answer?.id as string));
      await flush();
      expect(requests).toHaveLength(2);
      expect(requests[1]?.intent).toBe('status');
      expect(requests[1]?.actionId).toBe('buy-plan-1');
      expect(requests[1]?.message.action).toBeUndefined();
      expect(requests[1]?.idempotencyKey).toBe(key);
      const commercial = requests.filter(
        (r) => r.message.action?.kind === 'confirm' && r.message.action.decision === 'approved',
      );
      expect(commercial).toHaveLength(1);

      // The status answer is a final result. The key leaves storage.
      push(1, { type: 'text', delta: 'Satın alma tamamlandı.' }, { type: 'done' });
      await flush();
      expect(localStorage.getItem(nameA)).toBeNull();
    });

    it('3. işlem başarıyla bitince anahtar depodan silinir', async () => {
      const { push, transport } = manual();
      const { result } = renderHook(() => useStudioChat(transport, 'c1', teamA));
      act(() => {
        result.current.send(actionToMessage(approve));
      });
      await flush();
      expect(localStorage.getItem(nameA)).not.toBeNull();
      push(0, { type: 'text', delta: 'Satın alma yapıldı.' }, { type: 'done' });
      await flush();
      expect(localStorage.getItem(nameA)).toBeNull();
    });

    it('3. sunucu hata verince sonuç kesindir, anahtar depodan silinir', async () => {
      const { push, transport } = manual();
      const { result } = renderHook(() => useStudioChat(transport, 'c1', teamA));
      act(() => {
        result.current.send(actionToMessage(approve));
      });
      await flush();
      push(0, { type: 'error', message: 'Kart reddedildi.' });
      await flush();
      expect(localStorage.getItem(nameA)).toBeNull();
    });

    it('4. başka kurumun ya da kullanıcının anahtarı kullanılmaz', async () => {
      const a = manual();
      const hookA = renderHook(() => useStudioChat(a.transport, 'c1', teamA));
      act(() => {
        hookA.result.current.send(actionToMessage(approve));
      });
      await flush();
      const keyA = a.requests[0]?.idempotencyKey;
      hookA.unmount();

      const otherTeam = { team: 'beta.atonota.net', user: teamA.user };
      const otherUser = { team: teamA.team, user: 'baska@example.test' };
      const keys: (string | undefined)[] = [];
      for (const scope of [otherTeam, otherUser]) {
        const other = manual();
        const hook = renderHook(() => useStudioChat(other.transport, 'c1', scope));
        act(() => {
          hook.result.current.send(actionToMessage(approve));
        });
        await flush();
        keys.push(other.requests[0]?.idempotencyKey);
        hook.unmount();
      }
      expect(keys[0]).toMatch(UUID_V4);
      expect(keys[1]).toMatch(UUID_V4);
      expect(keys[0]).not.toBe(keyA);
      expect(keys[1]).not.toBe(keyA);
      expect(keys[0]).not.toBe(keys[1]);
      // The first account's pending key stays as it was.
      expect(localStorage.getItem(nameA)).toContain(keyA as string);
    });

    it('anahtar ve depo adı kişisel veri taşımaz', async () => {
      const { transport } = manual();
      const { result } = renderHook(() => useStudioChat(transport, 'c1', teamA));
      act(() => {
        result.current.send(actionToMessage(approve));
      });
      await flush();
      for (let i = 0; i < localStorage.length; i += 1) {
        const name = localStorage.key(i) as string;
        expect(name.startsWith('idempotency-key:acme.atonota.net:')).toBe(true);
        expect(name).not.toContain('kisi');
        expect(localStorage.getItem(name)).not.toContain('kisi');
      }
    });

    it('23 saatten eski anahtar kendiliğinden yeniden gönderilmez, işlemin durumu sorulur', async () => {
      const old = '3f2b8c1e-6d4a-4f0b-9a7e-2c5d8e1f0a3b';
      localStorage.setItem(
        nameA,
        JSON.stringify({ key: old, createdAt: Date.now() - RESEND_LIMIT_MS - 60_000 }),
      );
      const { requests, transport } = manual();
      const { result } = renderHook(() => useStudioChat(transport, 'c1', teamA));
      act(() => {
        result.current.send(actionToMessage(approve));
      });
      await flush();
      expect(requests).toHaveLength(1);
      expect(requests[0]?.intent).toBe('status');
      expect(requests[0]?.actionId).toBe('buy-plan-1');
      expect(requests[0]?.message.action).toBeUndefined();
      expect(requests[0]?.idempotencyKey).toBe(old);
    });

    it('biçimi bozuk kayıt kullanılmaz, yeni anahtar üretilir', async () => {
      localStorage.setItem(nameA, JSON.stringify({ key: 'ABC', createdAt: Date.now() }));
      const { requests, transport } = manual();
      const { result } = renderHook(() => useStudioChat(transport, 'c1', teamA));
      act(() => {
        result.current.send(actionToMessage(approve));
      });
      await flush();
      expect(requests[0]?.idempotencyKey).toMatch(UUID_V4);
    });
  },
);
