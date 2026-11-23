import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { WorkspaceSwitcher } from './WorkspaceSwitcher';

/**
 * Kapanan liste hemen anlamsal olarak gizlenir (Linux WebKit kararsızlığı, 23 Kasım 2026).
 * Kapanış hareketi tarayıcının karelerine bağlıdır. Yavaş cihazda kareler saniyelerce gecikebilir.
 * Hareket sürerken liste ekran okuyucuya ve klavyeye kapalı olmalıdır.
 */
describe('WorkspaceSwitcher kapanan liste', () => {
  it('kapanınca liste aria-hidden ve inert olur', () => {
    render(
      <div className="shell">
        <WorkspaceSwitcher rail={false} />
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
