import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AuthLayout } from './AuthLayout';

describe('AuthLayout', () => {
  it('giriş ekranının içeriği ana bölgededir (K2)', () => {
    render(
      <>
        <h1 id="baslik">Oturum açın</h1>
        <AuthLayout labelledBy="baslik">
          <p>İçerik</p>
        </AuthLayout>
      </>,
    );
    const main = screen.getByRole('main', { name: 'Oturum açın' });
    expect(main).toContainElement(screen.getByText('İçerik'));
  });
});
