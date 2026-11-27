import {
  act,
  cleanup,
  configure,
  fireEvent,
  getConfig,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfigProvider } from 'antd';
import { useContext } from 'react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { AppProviders } from '@/app/AppProviders';
import { LanguageProvider, useSetLanguage } from '@/app/locale';
import { LocalizedXProvider } from '@/app/locale/LocalizedXProvider';

import { createMockTransport, MOCK_SOURCE } from '../agent';
import type { AgentRequest, AgentTransport } from '../agent';
import { AiStudio } from './AiStudio';

/**
 * AJA-1784. Three rules of the chat surface:
 * 1. A finished reply is announced to the screen reader once. Stream chunks are not announced.
 * 2. While the IME (candidate selection) is active, Enter does not send the message.
 * 3. When the language changes, `XProvider`, `antd` and the screen reader names switch together.
 */

const defaultAsyncTimeout = getConfig().asyncUtilTimeout;
beforeAll(() => configure({ asyncUtilTimeout: 10_000 }));
afterAll(() => configure({ asyncUtilTimeout: defaultAsyncTimeout }));

beforeAll(() => {
  Element.prototype.scrollTo ??= () => undefined;
  globalThis.ResizeObserver ??= class {
    observe = () => undefined;
    unobserve = () => undefined;
    disconnect = () => undefined;
  };
});

let streams = new AbortController();
beforeEach(() => {
  streams = new AbortController();
});
afterEach(() => {
  streams.abort();
  cleanup();
});

function mock(delayMs = 1): AgentTransport {
  const base = createMockTransport({ delayMs });
  return (request, signal) => base(request, AbortSignal.any([signal, streams.signal]));
}

function recording(base: AgentTransport = mock()) {
  const requests: AgentRequest[] = [];
  const transport: AgentTransport = (request, signal) => {
    requests.push(structuredClone(request));
    return base(request, signal);
  };
  return { requests, transport };
}

function renderTr(transport: AgentTransport) {
  return render(
    <LanguageProvider initialLanguage="tr">
      <AiStudio transport={transport} source={MOCK_SOURCE} />
    </LanguageProvider>,
  );
}

/** The studio's own announcer. Records every text it shows, in order. */
function watchAnnouncer(container: HTMLElement) {
  const node = container.querySelector<HTMLElement>('[data-ai-announcer]');
  if (!node) throw new Error('announcer not found');
  const texts: string[] = [];
  const observer = new MutationObserver(() => {
    const text = node.textContent ?? '';
    if (text && texts[texts.length - 1] !== text) texts.push(text);
  });
  observer.observe(node, { childList: true, characterData: true, subtree: true });
  return { node, texts, stop: () => observer.disconnect() };
}

/** Elements a screen reader reads out when their content changes. */
function liveRegions(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>('[aria-live], [role="log"], [role="status"]')]
    .filter((node) => node.getAttribute('aria-live') !== 'off');
}

async function typeAndSend(text: string) {
  const user = userEvent.setup({ delay: null });
  await user.type(screen.getByRole('textbox', { name: 'Asistana mesaj yazın' }), text);
  await user.click(screen.getByRole('button', { name: 'Mesajı gönder' }));
  return user;
}

describe('ekran okuyucu duyurusu', { timeout: 30_000 }, () => {
  it('mesaj akışı canlı bölge değildir: akış parçaları duyurulmaz', () => {
    const { container } = renderTr(mock());
    expect(screen.getByRole('log')).toHaveAttribute('aria-live', 'off');
    expect(liveRegions(container).every((node) => node.hasAttribute('data-ai-announcer'))).toBe(
      true,
    );
  });

  it('tamamlanan yanıt bir kez duyurulur', async () => {
    const { container } = renderTr(mock());
    const announcer = watchAnnouncer(container);
    await typeAndSend('Bu haftanın satış özetini çıkar');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Kopyala' })).toBeInTheDocument());
    await waitFor(() => expect(announcer.node).toHaveTextContent('Yanıt hazır.'));
    announcer.stop();
    expect(announcer.texts.filter((t) => t === 'Yanıt hazır.')).toHaveLength(1);
    // Only state sentences are announced. The reply text itself is not read twice.
    expect(announcer.texts.every((t) => !t.includes('%12'))).toBe(true);
    expect(announcer.texts).toEqual(['Asistan yanıt hazırlıyor.', 'Yanıt hazır.']);
  });

  it('durdurulan yanıt bir kez duyurulur', async () => {
    const { container } = renderTr(mock(40));
    const announcer = watchAnnouncer(container);
    const user = await typeAndSend('Bu haftanın satış özetini çıkar');
    await user.click(await screen.findByRole('button', { name: 'Yanıtı durdur' }));
    await waitFor(() => expect(announcer.node).toHaveTextContent('Yanıt durduruldu.'));
    announcer.stop();
    expect(announcer.texts.filter((t) => t === 'Yanıt durduruldu.')).toHaveLength(1);
    expect(announcer.texts).not.toContain('Yanıt hazır.');
  });

  it('hata veren yanıt bir kez duyurulur', async () => {
    const failing: AgentTransport = () => Promise.reject(new Error('bağlantı koptu'));
    const { container } = renderTr(failing);
    const announcer = watchAnnouncer(container);
    await typeAndSend('Bu haftanın satış özetini çıkar');
    await waitFor(() =>
      expect(announcer.node).toHaveTextContent('Yanıt hata verdi. Yeniden deneyebilirsiniz.'),
    );
    announcer.stop();
    expect(
      announcer.texts.filter((t) => t === 'Yanıt hata verdi. Yeniden deneyebilirsiniz.'),
    ).toHaveLength(1);
  });
});

describe('aday seçimi (IME) ve Enter', { timeout: 30_000 }, () => {
  it('aday seçimi sürerken Enter mesaj göndermez', async () => {
    const { requests, transport } = recording();
    renderTr(transport);
    const box = screen.getByRole('textbox', { name: 'Asistana mesaj yazın' });
    fireEvent.compositionStart(box);
    fireEvent.change(box, { target: { value: 'こんにちは' } });
    fireEvent.keyDown(box, { key: 'Enter', code: 'Enter', keyCode: 229, isComposing: true });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(requests).toHaveLength(0);
    expect(box).toHaveValue('こんにちは');
  });

  it('isComposing değeri doğruysa Enter göndermez: compositionstart olayı gelmese bile', async () => {
    const { requests, transport } = recording();
    renderTr(transport);
    const box = screen.getByRole('textbox', { name: 'Asistana mesaj yazın' });
    fireEvent.change(box, { target: { value: '你好' } });
    fireEvent.keyDown(box, { key: 'Enter', code: 'Enter', keyCode: 13, isComposing: true });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(requests).toHaveLength(0);
  });

  it('Safari sırası: compositionend sonra gelen 229 kodlu Enter göndermez', async () => {
    const { requests, transport } = recording();
    renderTr(transport);
    const box = screen.getByRole('textbox', { name: 'Asistana mesaj yazın' });
    fireEvent.compositionStart(box);
    fireEvent.change(box, { target: { value: 'こんにちは' } });
    fireEvent.compositionEnd(box);
    fireEvent.keyDown(box, { key: 'Enter', code: 'Enter', keyCode: 229 });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(requests).toHaveLength(0);
  });

  it('aday seçimi bitince Enter mesajı bir kez gönderir', async () => {
    const { requests, transport } = recording();
    renderTr(transport);
    const box = screen.getByRole('textbox', { name: 'Asistana mesaj yazın' });
    fireEvent.compositionStart(box);
    fireEvent.change(box, { target: { value: 'こんにちは' } });
    fireEvent.keyDown(box, { key: 'Enter', code: 'Enter', keyCode: 229, isComposing: true });
    fireEvent.compositionEnd(box);
    fireEvent.keyDown(box, { key: 'Enter', code: 'Enter', keyCode: 13 });
    fireEvent.keyDown(box, { key: 'Enter', code: 'Enter', keyCode: 13 });
    await waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0]?.message.text).toBe('こんにちは');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Kopyala' })).toBeInTheDocument());
    expect(requests).toHaveLength(1);
  });
});

function AntdLocaleProbe({ name }: { name: string }) {
  const { locale } = useContext(ConfigProvider.ConfigContext);
  return <output aria-label={name}>{locale?.locale ?? ''}</output>;
}

function LanguageSwitch() {
  const setLanguage = useSetLanguage();
  return (
    <button type="button" onClick={() => setLanguage('en')}>
      switch-en
    </button>
  );
}

describe('dil değişimi', () => {
  it('XProvider, antd ve ekran okuyucu adları aynı dile geçer', async () => {
    const { container } = render(
      <AppProviders engines={false} initialLanguage="tr">
        <LanguageSwitch />
        <AntdLocaleProbe name="antd" />
        <LocalizedXProvider>
          <AntdLocaleProbe name="x" />
          <AiStudio transport={mock()} source={MOCK_SOURCE} />
        </LocalizedXProvider>
      </AppProviders>,
    );
    const studio = container.querySelector<HTMLElement>('.ai-studio');
    expect(studio).toHaveAttribute('lang', 'tr');
    expect(screen.getByRole('status', { name: 'antd' })).toHaveTextContent('tr');
    expect(screen.getByRole('status', { name: 'x' })).toHaveTextContent('tr');
    expect(screen.getByRole('textbox', { name: 'Asistana mesaj yazın' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mesajı gönder' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sohbetleri aç' })).toBeInTheDocument();

    await userEvent.setup({ delay: null }).click(screen.getByRole('button', { name: 'switch-en' }));

    expect(studio).toHaveAttribute('lang', 'en');
    expect(screen.getByRole('status', { name: 'antd' })).toHaveTextContent('en-gb');
    expect(screen.getByRole('status', { name: 'x' })).toHaveTextContent('en-gb');
    expect(screen.getByRole('textbox', { name: 'Message the assistant' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send message' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open conversations' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Asistana mesaj yazın' })).toBeNull();
  });
});
