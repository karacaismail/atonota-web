import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { LoginScreen } from './LoginScreen';

describe('LoginScreen', () => {
  it('kenar boşluğu, aralık ve en çok genişlik projenin CSS değişkenlerinden gelir', () => {
    render(<LoginScreen onSignIn={vi.fn()} />);
    const region = screen.getByRole('region', { name: 'Oturum açın' });
    expect(region.style.paddingInline).toBe('var(--space-md)');
    expect(region.style.paddingBlock).toBe('var(--space-xl)');
    expect(region.style.gap).toBe('var(--space-md)');
    expect(region.style.maxWidth).toBe('var(--form-max-width)');
    expect(region).toHaveStyle({ boxSizing: 'border-box', width: '100%' });
  });

  it('başlık, açıklama ve tam genişlik düğme sırayla gelir', () => {
    render(<LoginScreen onSignIn={vi.fn()} />);
    const heading = screen.getByRole('heading', { level: 1, name: 'Oturum açın' });
    const button = screen.getByRole('button', { name: 'Atonota ile oturum aç' });
    expect(heading.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(button).toHaveStyle({ width: '100%' });
  });
});
