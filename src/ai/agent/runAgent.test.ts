import { describe, expect, it, vi } from 'vitest';

import { encodeAgentEvent } from './events';
import { createMockTransport } from './mockTransport';
import { runAgent } from './runAgent';
import type { AgentEvent, AgentRequest, AgentTransport, AssistantMessage } from './types';

const request = (text: string): AgentRequest => ({
  intent: 'message',
  message: { role: 'user', text },
  history: [],
});

const approval = (blockId: string): AgentRequest => ({
  intent: 'message',
  message: {
    role: 'user',
    text: 'Onaylıyorum',
    action: { kind: 'confirm', blockId, decision: 'approved', title: 't' },
  },
  history: [],
});

function streamOf(chunks: string[]): AgentTransport {
  return () =>
    Promise.resolve(
      new ReadableStream<Uint8Array>({
        start(controller) {
          const encoder = new TextEncoder();
          for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
          controller.close();
        },
      }),
    );
}

describe('runAgent', () => {
  it('adımları, metni ve blokları sunucudan kurar', async () => {
    const updates: AssistantMessage[] = [];
    const result = await runAgent({
      transport: createMockTransport({ delayMs: 1 }),
      request: request('Bu haftanın satış özetini çıkar'),
      signal: new AbortController().signal,
      onUpdate: (m) => updates.push(m),
    });
    expect(result.phase).toBe('done');
    expect(result.steps.map((s) => s.status)).toEqual(['success', 'success', 'success']);
    expect(result.steps.every((s) => s.tool.length > 0)).toBe(true);
    expect(result.text).toContain('gelir');
    expect(result.ui.map((b) => b.type)).toEqual(['kpis', 'chart', 'choices']);
    expect(updates.length).toBeGreaterThan(3);
  });

  it('sunucu araç olayı göndermezse adım göstermez', async () => {
    const events: AgentEvent[] = [{ type: 'text', delta: 'Tamam.' }, { type: 'done' }];
    const result = await runAgent({
      transport: createMockTransport({ delayMs: 1, events: () => events }),
      request: request('merhaba'),
      signal: new AbortController().signal,
      onUpdate: () => undefined,
    });
    expect(result.steps).toEqual([]);
    expect(result.phase).toBe('done');
  });

  it('adımlar sürerken iptal edilince durur ve sonra güncelleme göndermez', async () => {
    const controller = new AbortController();
    const onUpdate = vi.fn((m: AssistantMessage) => {
      if (m.steps.length === 1) controller.abort();
    });
    const result = await runAgent({
      transport: createMockTransport({ delayMs: 5 }),
      request: request('Geciken siparişleri bul'),
      signal: controller.signal,
      onUpdate,
    });
    expect(result.phase).toBe('cancelled');
    expect(result.ui).toEqual([]);
    expect(onUpdate).toHaveBeenCalledTimes(1);
    await new Promise((r) => setTimeout(r, 30));
    expect(onUpdate).toHaveBeenCalledTimes(1);
  });

  it('metin akarken iptal edilince yazılan metni korur, blokları göstermez', async () => {
    const controller = new AbortController();
    const result = await runAgent({
      transport: createMockTransport({ delayMs: 2 }),
      request: request('Geciken siparişleri bul'),
      signal: controller.signal,
      onUpdate: (m) => {
        if (m.phase === 'streaming') controller.abort();
      },
    });
    expect(result.phase).toBe('cancelled');
    expect(result.text.length).toBeGreaterThan(0);
    expect(result.ui).toEqual([]);
  });

  it('istek başlamadan iptal edilmişse sunucuyu çağırmaz', async () => {
    const controller = new AbortController();
    controller.abort();
    const transport = vi.fn(createMockTransport());
    const result = await runAgent({
      transport,
      request: request('x'),
      signal: controller.signal,
      onUpdate: () => undefined,
    });
    expect(result.phase).toBe('cancelled');
    expect(transport).not.toHaveBeenCalled();
  });

  it('geçersiz parçayı yok sayar', async () => {
    const result = await runAgent({
      transport: streamOf([
        'data: bozuk-json\n\n',
        'data: {"type":"tool","key":"a","tool":"orders.read","title":"Okundu","status":"uydurma"}\n\n',
        encodeAgentEvent({ type: 'text', delta: 'Merhaba' }),
        encodeAgentEvent({ type: 'done' }),
      ]),
      request: request('x'),
      signal: new AbortController().signal,
      onUpdate: () => undefined,
    });
    expect(result).toMatchObject({ phase: 'done', text: 'Merhaba', steps: [] });
  });

  it('akış done olmadan biterse kopma hatası verir', async () => {
    const result = await runAgent({
      transport: streamOf([encodeAgentEvent({ type: 'text', delta: 'Yarım' })]),
      request: request('x'),
      signal: new AbortController().signal,
      onUpdate: () => undefined,
    });
    expect(result.phase).toBe('error');
    expect(result.error).toBe('Bağlantı yanıt bitmeden koptu.');
  });

  it('sunucu susarsa zaman aşımı hatası verir', async () => {
    const silent: AgentTransport = () => Promise.resolve(new ReadableStream<Uint8Array>());
    const result = await runAgent({
      transport: silent,
      request: request('x'),
      signal: new AbortController().signal,
      onUpdate: () => undefined,
      idleTimeoutMs: 20,
    });
    expect(result.phase).toBe('error');
    expect(result.error).toBe('Sunucu zamanında yanıt vermedi.');
  });

  it('bağlantı kurulamazsa hata verir', async () => {
    const result = await runAgent({
      transport: () => Promise.reject(new Error('ağ yok')),
      request: request('x'),
      signal: new AbortController().signal,
      onUpdate: () => undefined,
    });
    expect(result).toMatchObject({ phase: 'error', error: 'Sunucuya bağlanılamadı.' });
  });

  it('onay kararını yeni mesaj olarak işler ve gerçek işlem yapmadığını söyler', async () => {
    const result = await runAgent({
      transport: createMockTransport({ delayMs: 1 }),
      request: approval('notify-delay'),
      signal: new AbortController().signal,
      onUpdate: () => undefined,
    });
    expect(result.text).toContain('gerçek bir işlem yapılmadı');
  });

  it('izinli olmayan araç olayını ve düşünce olayını göstermez', async () => {
    const result = await runAgent({
      transport: streamOf([
        'data: {"type":"step","key":"a","title":"Eski adım","status":"success"}\n\n',
        'data: {"type":"thought","text":"İç düşünce"}\n\n',
        'data: {"type":"reasoning","text":"İç düşünce"}\n\n',
        'data: {"type":"tool","key":"b","tool":"shell.exec","title":"Komut","status":"success"}\n\n',
        encodeAgentEvent({
          type: 'tool',
          key: 'c',
          tool: 'orders.read',
          title: 'Siparişler okundu',
          status: 'success',
        }),
        encodeAgentEvent({ type: 'done' }),
      ]),
      request: request('x'),
      signal: new AbortController().signal,
      onUpdate: () => undefined,
    });
    expect(result.steps).toEqual([
      { key: 'c', tool: 'orders.read', title: 'Siparişler okundu', status: 'success' },
    ]);
  });

  it('sahte sunucu aynı onayı ikinci kez reddeder', async () => {
    const transport = createMockTransport({ delayMs: 1 });
    const run = () =>
      runAgent({
        transport,
        request: approval('notify-delay'),
        signal: new AbortController().signal,
        onUpdate: () => undefined,
      });
    expect((await run()).phase).toBe('done');
    const second = await run();
    expect(second.phase).toBe('error');
    expect(second.error).toBe('Bu onay zaten kullanıldı. İşlem yeniden yapılmadı.');
  });

  it('durum sorgusu onayı yeniden işlemez, işlemin durumunu söyler', async () => {
    const transport = createMockTransport({ delayMs: 1 });
    await runAgent({
      transport,
      request: approval('notify-delay'),
      signal: new AbortController().signal,
      onUpdate: () => undefined,
    });
    const status = await runAgent({
      transport,
      request: {
        intent: 'status',
        actionId: 'notify-delay',
        message: { role: 'user', text: 'İşlemin durumunu sor' },
        history: [],
      },
      signal: new AbortController().signal,
      onUpdate: () => undefined,
    });
    expect(status.phase).toBe('done');
    expect(status.text).toContain('Onayınız sunucuya bir kez ulaştı');
    const unknown = await runAgent({
      transport,
      request: {
        intent: 'status',
        actionId: 'baska-islem',
        message: { role: 'user', text: 'İşlemin durumunu sor' },
        history: [],
      },
      signal: new AbortController().signal,
      onUpdate: () => undefined,
    });
    expect(unknown.text).toContain('Onayınız sunucuya ulaşmadı');
  });

  it('sahte sunucu her yanıtta yeni onay kimliği üretir', async () => {
    const transport = createMockTransport({ delayMs: 1 });
    const ids: string[] = [];
    for (let i = 0; i < 2; i += 1) {
      const result = await runAgent({
        transport,
        request: request('Geciken siparişleri bul'),
        signal: new AbortController().signal,
        onUpdate: () => undefined,
      });
      const confirm = result.ui.find((b) => b.type === 'confirm');
      if (confirm?.type === 'confirm') ids.push(confirm.id);
    }
    expect(ids).toHaveLength(2);
    expect(ids[0]).not.toBe(ids[1]);
  });
});
