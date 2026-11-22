import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { createMockTransport } from '../agent';
import type { AgentEvent } from '../agent';
import { MOCK_SOURCE } from '../agent';
import { AiStudio } from './AiStudio';

beforeAll(() => {
  // jsdom öğelerde kaydırma işlevi tanımlamaz. Bubble.List bunu çağırır.
  Element.prototype.scrollTo ??= () => undefined;
  // jsdom ResizeObserver tanımlamaz. antd tablosu bunu kullanır.
  globalThis.ResizeObserver ??= class {
    observe = () => undefined;
    unobserve = () => undefined;
    disconnect = () => undefined;
  };
});

afterEach(async () => {
  // Sahte sunucunun bekleyen zamanlayıcıları test bitmeden sönsün.
  await act(() => new Promise((r) => setTimeout(r, 60)));
});

async function send(text: string) {
  const user = userEvent.setup();
  const box = screen.getByRole('textbox', { name: 'Asistana mesaj yazın' });
  await user.type(box, text);
  await user.click(screen.getByRole('button', { name: 'Mesajı gönder' }));
  return user;
}

describe('AI Studio', () => {
  it('boş durumda karşılama ve kategorili önerileri gösterir', () => {
    render(<AiStudio transport={createMockTransport({ delayMs: 1 })} source={MOCK_SOURCE} />);
    expect(screen.getByRole('heading', { name: /Atonota asistanı/ })).toBeInTheDocument();
    expect(screen.getByText('Bu haftanın satış özetini çıkar')).toBeInTheDocument();
    expect(screen.getByRole('log')).toBeInTheDocument();
  });

  it('sahte sunucuyu açıkça etiketler', () => {
    render(<AiStudio transport={createMockTransport({ delayMs: 1 })} source={MOCK_SOURCE} />);
    expect(screen.getAllByText('Sahte sunucu').length).toBeGreaterThan(0);
  });

  it('yanıtı akıtır ve bloklar akış bitince belirir', async () => {
    const { container } = render(
      <AiStudio transport={createMockTransport({ delayMs: 1 })} source={MOCK_SOURCE} />,
    );
    await send('Bu haftanın satış özetini çıkar');
    await waitFor(() => expect(container.querySelector('[data-genui="kpis"]')).not.toBeNull());
    expect(screen.getByRole('log')).toHaveTextContent('%12 arttı');
    expect(screen.getByRole('button', { name: 'Kopyala' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Yeniden üret' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Beğen' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Beğenme' })).toBeInTheDocument();
  });

  it('iptal düğmesi akışı durdurur', async () => {
    const { container } = render(
      <AiStudio transport={createMockTransport({ delayMs: 40 })} source={MOCK_SOURCE} />,
    );
    const user = await send('Geciken siparişleri bul');
    const stop = await screen.findByRole('button', { name: 'Yanıtı durdur' });
    await user.click(stop);
    expect(await screen.findByText('Yanıt durduruldu.')).toBeInTheDocument();
    await act(() => new Promise((r) => setTimeout(r, 120)));
    expect(container.querySelector('[data-genui]')).toBeNull();
    expect(screen.getByRole('button', { name: 'Mesajı gönder' })).toBeInTheDocument();
  });

  it('sunucu adım göndermezse düşünce zinciri göstermez', async () => {
    const events: AgentEvent[] = [{ type: 'text', delta: 'Kısa yanıt.' }, { type: 'done' }];
    render(
      <AiStudio
        transport={createMockTransport({ delayMs: 1, events: () => events })}
        source={MOCK_SOURCE}
      />,
    );
    await send('merhaba');
    await screen.findByText('Kısa yanıt.');
    expect(screen.queryByText(/Düşünce zinciri/)).toBeNull();
  });

  it('onay bloğu onay verilmeden mesaj göndermez, onayla yeni mesaj oluşur', async () => {
    render(<AiStudio transport={createMockTransport({ delayMs: 1 })} source={MOCK_SOURCE} />);
    const user = await send('Geciken siparişleri bul');
    const log = screen.getByRole('log');
    await waitFor(() => expect(log.querySelector('[data-genui="confirm"]')).not.toBeNull());
    expect(within(log).queryAllByText(/^Onaylıyorum/)).toHaveLength(0);
    const block = log.querySelector('[data-genui="confirm"]') as HTMLElement;
    await user.click(within(block).getByRole('button', { name: 'Gönder' }));
    await waitFor(() => expect(within(log).getByText(/^Onaylıyorum/)).toBeInTheDocument());
    await waitFor(() => expect(log).toHaveTextContent('gerçek bir işlem yapılmadı'));
  });

  it('yanıt eylemleri klavyeyle çalışır', async () => {
    render(<AiStudio transport={createMockTransport({ delayMs: 1 })} source={MOCK_SOURCE} />);
    const user = await send('merhaba');
    const like = await screen.findByRole('button', { name: 'Beğen' });
    expect(like).toHaveAttribute('aria-pressed', 'false');
    like.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: 'Beğen' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('dar ekranda yan bölümler çekmeceye iner', async () => {
    const user = userEvent.setup();
    render(<AiStudio />);
    expect(screen.queryByRole('navigation', { name: 'Sohbetler' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Sohbetleri aç' }));
    expect(await screen.findByRole('navigation', { name: 'Sohbetler' })).toBeInTheDocument();
  });

  it('geniş ekranda üç sütun açılır', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (query: string) =>
        ({
          matches: query.startsWith('(min-width'),
          media: query,
          onchange: null,
          addListener: () => undefined,
          removeListener: () => undefined,
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
          dispatchEvent: () => false,
        }) as MediaQueryList,
    );
    render(<AiStudio />);
    expect(screen.getByRole('navigation', { name: 'Sohbetler' })).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Çalışma alanı' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sohbetleri aç' })).toBeNull();
  });
});
