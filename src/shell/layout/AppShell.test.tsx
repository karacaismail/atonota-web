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
