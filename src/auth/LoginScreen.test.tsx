import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { LoginScreen } from './LoginScreen';
import { Button } from 'antd';

import { tr } from './messages.json';
import { ProviderList } from './providers/ProviderSignIn';

const labels = { list: tr.providers_label, button: tr.login_button };

describe('LoginScreen', () => {
  it('kenar boşluğu, aralık ve en çok genişlik projenin CSS değişkenlerinden gelir', () => {
    render(<LoginScreen onSignIn={vi.fn()} />);
    const region = screen.getByRole('main', { name: 'Oturum açın' });
    expect(region.style.paddingInline).toBe('var(--space-md)');
    expect(region.style.paddingBlock).toBe('var(--space-xl)');
    expect(region.style.gap).toBe('var(--space-md)');
    expect(region.style.maxWidth).toBe('var(--form-max-width)');
    expect(region).toHaveStyle({ boxSizing: 'border-box', width: '100%' });
  });

  it('başlık, açıklama ve tam genişlik düğme sırayla gelir', () => {
    render(<LoginScreen onSignIn={vi.fn()} />);
    const heading = screen.getByRole('heading', { level: 1, name: 'Oturum açın' });
    const button = screen.getByRole('button', { name: 'AtonotA Login ile oturum aç' });
    expect(heading.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(button).toHaveStyle({ width: '100%' });
  });

  it('not verilmezse not satırı çizilmez', () => {
    render(<LoginScreen onSignIn={vi.fn()} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('kimlik oturumu açık kalmış olabilirse kısa bir not gösterir (K-3)', () => {
    render(<LoginScreen onSignIn={vi.fn()} notice="idp_session_may_remain" />);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Panelden çıktınız. Kimlik oturumunuz açık kalmış olabilir.',
    );
  });
  it('platform listesi boşsa yalnız AtonotA Login düğmesi görünür', () => {
    render(
      <LoginScreen
        onSignIn={vi.fn()}
        platforms={
          <ProviderList labels={labels} button={Button} providers={[]} onSignIn={vi.fn()} />
        }
      />,
    );
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'AtonotA Login ile oturum aç' })).toBeVisible();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('platform düğmeleri veriden çizilir ve platform adıyla çağrılır (G-159)', async () => {
    const onSignIn = vi.fn();
    render(
      <LoginScreen
        onSignIn={vi.fn()}
        platforms={
          <ProviderList
            labels={labels}
            button={Button}
            onSignIn={onSignIn}
            providers={[
              { alias: 'ornek-platform', display_name: 'Örnek Platform' },
              { alias: 'x', display_name: 'X' },
            ]}
          />
        }
      />,
    );
    const list = screen.getByRole('list', { name: 'Başka bir hesapla oturum açın' });
    const buttons = within(list).getAllByRole('button');
    expect(buttons.map((b) => b.textContent)).toEqual([
      'Örnek Platform ile oturum aç',
      'X ile oturum aç',
    ]);
    await userEvent.setup().click(buttons[0]!);
    expect(onSignIn).toHaveBeenCalledWith('ornek-platform');
  });

  it('AtonotA Login düğmesi platform adı vermez', async () => {
    const onSignIn = vi.fn();
    render(<LoginScreen onSignIn={onSignIn} />);
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'AtonotA Login ile oturum aç' }));
    expect(onSignIn).toHaveBeenCalledWith(undefined);
  });

  it('düğmeler klavyeyle sırayla gezilir', async () => {
    const onSignIn = vi.fn();
    render(
      <LoginScreen
        onSignIn={onSignIn}
        platforms={
          <ProviderList
            labels={labels}
            button={Button}
            onSignIn={onSignIn}
            providers={[{ alias: 'google', display_name: 'Google' }]}
          />
        }
      />,
    );
    const user = userEvent.setup();
    await user.tab();
    expect(screen.getByRole('button', { name: 'AtonotA Login ile oturum aç' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Google ile oturum aç' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(onSignIn).toHaveBeenCalledWith('google');
  });
});
