import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@ant-design/x', () => import('../testing/antdXMock'));

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

function renderShell() {
  render(
    <MemoryRouter>
      <AppShell>
        <p>İçerik</p>
      </AppShell>
    </MemoryRouter>,
  );
}

describe('AppShell', () => {
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
