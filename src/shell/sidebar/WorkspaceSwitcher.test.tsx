import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { sampleWorkspaces } from '../sampleData';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';

/** Deneme sayfasının örnek çalışma alanları. Birden çok alan açılır liste kurar. */
const data = { items: sampleWorkspaces, current: 'a' };

/**
 * Kapanan liste hemen anlamsal olarak gizlenir (Linux WebKit kararsızlığı, 23 Kasım 2026).
 * Kapanış hareketi tarayıcının karelerine bağlıdır. Yavaş cihazda kareler saniyelerce gecikebilir.
 * Hareket sürerken liste ekran okuyucuya ve klavyeye kapalı olmalıdır.
 */
describe('WorkspaceSwitcher kapanan liste', () => {
  it('kapanınca liste aria-hidden ve inert olur', () => {
    render(
      <div className="shell">
        <WorkspaceSwitcher rail={false} data={data} />
      </div>,
    );
    const button = screen.getByRole('button', { name: /Örnek Şirket A/ });
    act(() => button.focus());
    fireEvent.keyDown(button, { key: 'Enter' });
    const menu = screen.getByRole('menu', { name: 'Çalışma alanları' });
    expect(menu.closest('[aria-hidden="true"]')).toBeNull();
    expect(menu.closest('[inert]')).toBeNull();

    fireEvent.keyDown(menu, { key: 'Escape' });

    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(menu.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(menu.closest('[inert]')).not.toBeNull();
    expect(screen.queryByRole('menu', { name: 'Çalışma alanları' })).toBeNull();
  });
});

/**
 * İnceleme 1, K-3: fareyle seçimden sonra odak sayfa gövdesine düşmez.
 * Kapanan liste hemen `inert` olur. Odak listedeyse önce tetik düğmesine döner.
 * Odak listede değilse odağa dokunulmaz.
 */
describe('WorkspaceSwitcher fareyle seçim', () => {
  function openWithMouse() {
    render(
      <div className="shell">
        <button type="button">Dış düğme</button>
        <WorkspaceSwitcher rail={false} data={data} />
      </div>,
    );
    const button = screen.getByRole('button', { name: /Örnek Şirket A/ });
    fireEvent.click(button);
    const menu = screen.getByRole('menu', { name: 'Çalışma alanları' });
    const item = screen.getAllByRole('menuitem')[1];
    if (!item) throw new Error('Listede ikinci öğe yok');
    return { button, menu, item };
  }

  it('odak listedeyse seçimden sonra tetik düğmesine döner', () => {
    const { button, item } = openWithMouse();
    // Chromium tıklanan öğeye odak verir.
    act(() => item.focus());
    expect(document.activeElement).toBe(item);

    fireEvent.click(item);

    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(document.activeElement).toBe(button);
  });

  it('odak listede değilse seçim odağa dokunmaz', () => {
    const { button, item } = openWithMouse();
    const outside = screen.getByRole('button', { name: 'Dış düğme' });
    act(() => outside.focus());

    fireEvent.click(item);

    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(document.activeElement).toBe(outside);
  });
});
