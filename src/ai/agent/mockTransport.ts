/**
 * Sahte ajan sunucusu. `src/mocks/` hazır olunca oradaki sunucu kullanılacak.
 *
 * Gerçek sunucuyla aynı SSE olaylarını üretir. Arayüz bu yanıtı açıkça
 * "Sahte sunucu" diye etiketler (AX-7). Hiçbir gerçek işlem yapmaz.
 */
import { encodeAgentEvent } from './events';
import type { AgentEvent, AgentRequest, AgentTransport } from './types';

interface Plan {
  steps: string[];
  text: string;
  ui?: unknown[];
}

function planFor(request: AgentRequest): Plan {
  const { action } = request.message;
  if (action?.kind === 'confirm' || action?.kind === 'form') {
    if (action.decision === 'rejected') {
      return { steps: [], text: 'Vazgeçtiğinizi kaydettim. Hiçbir işlem yapılmadı.' };
    }
    return {
      steps: ['Onayınız alındı'],
      text: 'Onayınızı aldım. Bu bir sahte sunucu. Bu yüzden gerçek bir işlem yapılmadı.',
    };
  }

  const text = request.message.text.toLocaleLowerCase('tr');
  if (/sat[ıi]ş|özet|rapor/.test(text)) {
    return {
      steps: [
        'Sipariş ve ödeme verileri okundu (7 gün)',
        'Gelir, sipariş ve iade hesaplandı',
        'Grafik ve özet hazırlandı',
      ],
      text: 'Bu hafta gelir geçen haftaya göre %12 arttı. En güçlü gün perşembe oldu. İade oranı %2,1 ile hedefin altında kaldı.',
      ui: [
        {
          type: 'kpis',
          items: [
            { label: 'Gelir', value: '₺ 482.300', delta: 12, unit: '%' },
            { label: 'Sipariş', value: '1.148', delta: 6, unit: '%' },
            { label: 'İade oranı', value: '%2,1', delta: -0.4, unit: ' puan', goodWhen: 'down' },
          ],
        },
        {
          type: 'chart',
          title: 'Günlük gelir (₺ bin)',
          bars: [
            { label: 'Pzt', value: 58 },
            { label: 'Sal', value: 61 },
            { label: 'Çar', value: 66 },
            { label: 'Per', value: 84 },
            { label: 'Cum', value: 79 },
            { label: 'Cmt', value: 72 },
            { label: 'Paz', value: 62 },
          ],
        },
        {
          type: 'choices',
          items: ['Geçen ayla karşılaştır', 'En çok satan 5 ürünü göster'],
        },
      ],
    };
  }
  if (/sipari[şs]|gecik|kargo/.test(text)) {
    return {
      steps: [
        'Kargo durumları okundu (148 sipariş)',
        'Gecikme riski sınıflandırıldı',
        'Müşteri bildirim taslağı hazırlandı',
      ],
      text: '12 sipariş gecikme riskinde. Bunlardan 3 tanesi kritik. Müşterilere bildirim göndermemi isterseniz onay verin.',
      ui: [
        {
          type: 'table',
          title: 'Gecikme riski olan siparişler',
          rowKey: 'order',
          columns: [
            { key: 'order', title: 'Sipariş' },
            { key: 'customer', title: 'Müşteri' },
            { key: 'state', title: 'Durum' },
            { key: 'delay', title: 'Gecikme' },
          ],
          rows: [
            { order: '#10482', customer: 'Örnek Kişi 1', state: 'Kritik', delay: '3 gün' },
            { order: '#10477', customer: 'Örnek Kişi 2', state: 'Kritik', delay: '2 gün' },
            { order: '#10469', customer: 'Örnek Kişi 3', state: 'Kritik', delay: '2 gün' },
            { order: '#10451', customer: 'Örnek Kişi 4', state: 'Riskli', delay: '1 gün' },
          ],
        },
        {
          type: 'confirm',
          id: 'notify-delay',
          title: '12 müşteriye gecikme bildirimi gönderilsin mi?',
          detail:
            'E-posta ve SMS ile gönderilir. Şablon: “Siparişiniz yolda, kısa bir gecikme var.”',
          confirmLabel: 'Gönder',
          cancelLabel: 'Vazgeç',
        },
      ],
    };
  }
  if (/otomasyon|kural|stok/.test(text)) {
    return {
      steps: [
        'Stok seviyeleri incelendi',
        'Eşik önerisi hesaplandı (son 30 gün satış hızı)',
        'Kural formu oluşturuldu',
      ],
      text: 'Stok uyarısı için bir kural önerdim. Değerleri düzenleyebilirsiniz. Kaydetmeden önce onayınızı bekliyorum.',
      ui: [
        {
          type: 'form',
          id: 'stock-rule',
          title: 'Stok uyarı kuralı',
          submitLabel: 'Kaydet',
          fields: [
            {
              name: 'name',
              label: 'Kural adı',
              kind: 'text',
              value: 'Düşük stok uyarısı',
              required: true,
            },
            {
              name: 'threshold',
              label: 'Eşik',
              kind: 'select',
              value: 'p20',
              options: [
                { value: 'p10', label: 'Stok %10 altı' },
                { value: 'p20', label: 'Stok %20 altı (önerilen)' },
                { value: 'd7', label: '7 günlük satışın altı' },
              ],
            },
            {
              name: 'channels',
              label: 'Kanal',
              kind: 'checks',
              value: ['email'],
              options: [
                { value: 'email', label: 'E-posta' },
                { value: 'sms', label: 'SMS' },
              ],
            },
          ],
        },
      ],
    };
  }
  return {
    steps: ['İstek okundu'],
    text: 'Bunu yapabilirim. Hangi yönden ilerleyelim?',
    ui: [
      {
        type: 'choices',
        items: [
          'Bu haftanın satış özetini çıkar',
          'Geciken siparişleri bul',
          'Stok uyarısı için otomasyon kur',
        ],
      },
    ],
  };
}

/** Planı olay sırasına çevirir: adımlar, metin parçaları, bloklar, bitiş. */
export function planEvents(request: AgentRequest): AgentEvent[] {
  const plan = planFor(request);
  const events: AgentEvent[] = [];
  plan.steps.forEach((title, index) => {
    events.push({ type: 'step', key: `s${index}`, title, status: 'pending' });
    events.push({ type: 'step', key: `s${index}`, title, status: 'success' });
  });
  for (const delta of plan.text.match(/\S+\s*/g) ?? [plan.text]) {
    events.push({ type: 'text', delta });
  }
  if (plan.ui) events.push({ type: 'ui', blocks: plan.ui });
  events.push({ type: 'done' });
  return events;
}

export interface MockTransportOptions {
  /** İki olay arasındaki bekleme, ms. */
  delayMs?: number;
  /** Testler için olay listesini değiştirir. */
  events?: (request: AgentRequest) => AgentEvent[];
}

export function createMockTransport({
  delayMs = 45,
  events = planEvents,
}: MockTransportOptions = {}): AgentTransport {
  return (request, signal) => {
    const queue = events(request);
    const encoder = new TextEncoder();
    let index = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        return new Promise<void>((resolve) => {
          const timer = setTimeout(() => {
            signal.removeEventListener('abort', stop);
            const next = queue[index];
            if (signal.aborted || next === undefined) {
              controller.close();
            } else {
              index += 1;
              controller.enqueue(encoder.encode(encodeAgentEvent(next)));
            }
            resolve();
          }, delayMs);
          const stop = () => {
            clearTimeout(timer);
            controller.close();
            resolve();
          };
          signal.addEventListener('abort', stop, { once: true });
        });
      },
    });
    return Promise.resolve(stream);
  };
}
