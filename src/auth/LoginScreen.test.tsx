import { render, screen } from '@testing-library/react';
import { theme } from 'antd';
import { describe, expect, it, vi } from 'vitest';

import { LoginScreen } from './LoginScreen';

const token = theme.getDesignToken();

describe('LoginScreen', () => {
  it('telefon için kenar boşluğu ve en çok genişlik tokenlardan gelir', () => {
    render(<LoginScreen onSignIn={vi.fn()} />);
    const region = screen.getByRole('region', { name: 'Oturum açın' });
    expect(region).toHaveStyle({
      paddingInline: `${token.padding}px`,
      paddingBlock: `${token.paddingXL}px`,
      maxWidth: `${token.screenSM}px`,
      boxSizing: 'border-box',
      width: '100%',
    });
  });

  it('başlık, açıklama ve tam genişlik düğme sırayla gelir', () => {
    render(<LoginScreen onSignIn={vi.fn()} />);
    const heading = screen.getByRole('heading', { level: 1, name: 'Oturum açın' });
    const button = screen.getByRole('button', { name: 'Atonota ile oturum aç' });
    expect(heading.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(button).toHaveStyle({ width: '100%' });
  });
});
