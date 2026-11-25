import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@ant-design/x', () => import('../testing/antdXMock'));

import type { ShellViewData } from '../view-data';
import { ViewDataProvider } from '../view-data';
import { AppShell } from './AppShell';

const original = window.matchMedia;

function mockCompact(compact: boolean) {
  window.matchMedia = (query: string) =>
    ({
      matches: compact,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

afterEach(() => {
  window.matchMedia = original;
  localStorage.clear();
});

function renderShell(viewData: ShellViewData | null = null) {
  render(
    <MemoryRouter>
      <ViewDataProvider value={viewData}>
        <AppShell>
          <p>İçerik</p>
        </AppShell>
      </ViewDataProvider>
    </MemoryRouter>,
  );
}

describe('AppShell', () => {
  it('menüde örnek grup, uydurma sayı ve örnek ajan yoktur (Ö2)', () => {
    mockCompact(false);
    renderShell();
    expect(screen.getByRole('link', { name: 'Ana sayfa' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Satış' })).not.toBeInTheDocument();
    expect(screen.queryByText('12')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'AI ajanları' })).not.toBeInTheDocument();
  });

  it('sunucunun sidebar verisinden liste grubu çizer (Ö2)', async () => {
    mockCompact(false);
    const loadSidebars = vi.fn().mockResolvedValue([
      {
        id: 'Satış',
        label: 'Satış',
        module: 'selling',
        links: [{ label: 'Teklifler', doctype: 'Quotation' }],
      },
    ]);
    renderShell({ navigation: { loadSidebars } });
    expect(await screen.findByRole('button', { name: 'Satış' })).toBeInTheDocument();
    expect(loadSidebars).toHaveBeenCalledWith(expect.any(AbortSignal));
  });

  it('menü yalnız sunucunun okumaya izin verdiği sayfaları gösterir (G-94)', async () => {
    mockCompact(false);
    const loadReadable = vi.fn().mockResolvedValue(new Set(['Leave Application']));
    renderShell({ navigation: { loadSidebars: vi.fn().mockResolvedValue([]), loadReadable } });
    expect(await screen.findByRole('link', { name: 'İzin talepleri' })).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Yapay zekâ sağlayıcıları' }),
    ).not.toBeInTheDocument();
    expect(loadReadable).toHaveBeenCalledWith(
      expect.arrayContaining(['Leave Application', 'PLT AI API']),
      expect.any(AbortSignal),
    );
  });

  it('yetki bilgisi gelmezse yetki isteyen sayfa menüde görünmez (G-94)', async () => {
    mockCompact(false);
    const loadReadable = vi.fn().mockRejectedValue(new Error('ağ'));
    renderShell({ navigation: { loadSidebars: vi.fn().mockResolvedValue([]), loadReadable } });
    await act(async () => Promise.resolve());
    expect(screen.getByRole('link', { name: 'Hesap' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'İzin talepleri' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Yapay zekâ sağlayıcıları' }),
    ).not.toBeInTheDocument();
  });

  it('veri bağlantısı yoksa yetki isteyen sayfa menüde görünmez (G-94)', () => {
    mockCompact(false);
    renderShell();
    expect(screen.getByRole('link', { name: 'Hesap' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'İzin talepleri' })).not.toBeInTheDocument();
  });

  it('geniş ekranda sidebar görünür, menü düğmesi yoktur', () => {
    mockCompact(false);
    renderShell();
    expect(screen.getByRole('navigation', { name: 'Ana gezinme' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Menüyü aç' })).not.toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveTextContent('İçerik');
  });

  it('telefonda sidebar çekmecedir; açılır ve Escape ile kapanır', async () => {
    mockCompact(true);
    renderShell();
    const user = userEvent.setup();
    const menu = screen.getByRole('button', { name: 'Menüyü aç' });
    const drawer = screen.getByRole('dialog', { hidden: true, name: 'Menü' });
    expect(drawer).toHaveAttribute('data-open', 'false');

    await user.click(menu);
    expect(drawer).toHaveAttribute('data-open', 'true');
    expect(drawer).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('main')).toHaveAttribute('inert');

    await user.keyboard('{Escape}');
    expect(drawer).toHaveAttribute('data-open', 'false');
    expect(menu).toHaveFocus();
  });

  it('telefonda sayfa bağlantısına dokununca çekmece kapanır', async () => {
    mockCompact(true);
    renderShell();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Menüyü aç' }));
    await user.click(screen.getByRole('link', { name: 'Ana sayfa' }));
    expect(screen.getByRole('dialog', { hidden: true, name: 'Menü' })).toHaveAttribute(
      'data-open',
      'false',
    );
  });

  it('rail tercihi saklanır', async () => {
    mockCompact(false);
    renderShell();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Dar görünüme geç' }));
    expect(localStorage.getItem('atonota.shell.sidebar')).toBe('rail');
    act(() => undefined);
  });
});

/**
 * MVP denetimi: panelde örnek veri kalmaz (23 Kasım 2026).
 * Çalışma alanı, hızlı eylemler ve AI kredisi yalnız sunucu verisinden gelir.
 */
describe('AppShell örnek veri yok', () => {
  const sidebars = [
    {
      id: 'Satış',
      label: 'Satış',
      module: 'selling',
      links: [
        { label: 'Teklifler', doctype: 'Quotation' },
        { label: 'Siparişler', doctype: 'Sales Order' },
      ],
    },
  ];

  it('çalışma alanı verisi yoksa örnek şirket görünmez', () => {
    mockCompact(false);
    renderShell({});
    expect(screen.queryByText(/Örnek Şirket/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Çalışma alanı/ })).not.toBeInTheDocument();
  });

  it('tek çalışma alanı açılır liste olmadan sade görünür', () => {
    mockCompact(false);
    renderShell({
      workspaces: { items: [{ id: 'site', name: 'site.example.test' }], current: 'site' },
    });
    expect(screen.getByText('site.example.test')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /site\.example\.test/ })).not.toBeInTheDocument();
    expect(document.querySelector('[aria-haspopup="menu"]')).toBeNull();
  });

  it('birden çok çalışma alanı varsa seçici açılır liste olur', async () => {
    mockCompact(false);
    renderShell({
      workspaces: {
        items: [
          { id: 'a', name: 'birinci.example.test' },
          { id: 'b', name: 'ikinci.example.test' },
        ],
        current: 'a',
      },
    });
    const button = screen.getByRole('button', { name: /birinci\.example\.test/ });
    await userEvent.setup().click(button);
    expect(
      await screen.findByRole('menuitem', { name: /ikinci\.example\.test/ }),
    ).toBeInTheDocument();
  });

  it('sunucu menüsü yoksa hızlı eylem görünmez, örnek öneri görünmez', () => {
    mockCompact(false);
    renderShell({});
    expect(screen.queryByRole('group', { name: 'Hızlı eylemler' })).not.toBeInTheDocument();
    expect(screen.queryByText('Günün özeti')).not.toBeInTheDocument();
  });

  it('hızlı eylemler sunucunun izin süzgecinden geçmiş sayfalarından gelir', async () => {
    mockCompact(false);
    renderShell({ navigation: { loadSidebars: vi.fn().mockResolvedValue(sidebars) } });
    const group = await screen.findByRole('group', { name: 'Hızlı eylemler' });
    const chips = Array.from(group.querySelectorAll('button')).map((b) => b.textContent);
    expect(chips).toEqual(['Teklifler', 'Siparişler']);
  });

  it('kredi ucu yoksa sayaç görünmez', () => {
    mockCompact(false);
    renderShell({});
    expect(screen.queryByText('AI kredisi')).not.toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /Kredinin/ })).not.toBeInTheDocument();
  });

  it('kredi ucu boş yanıt verirse sayaç görünmez', async () => {
    mockCompact(false);
    const load = vi.fn().mockResolvedValue(null);
    renderShell({ credit: { load } });
    await act(async () => Promise.resolve());
    expect(load).toHaveBeenCalledWith(expect.any(AbortSignal));
    expect(screen.queryByText('AI kredisi')).not.toBeInTheDocument();
  });

  it('kredi ucundan gelen sayıyı gösterir', async () => {
    mockCompact(false);
    renderShell({ credit: { load: vi.fn().mockResolvedValue({ used: 250, total: 1000 }) } });
    expect(await screen.findByText('AI kredisi')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Kredinin yüzde 25 kısmı kullanıldı' })).toBeVisible();
  });
});
