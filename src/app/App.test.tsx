import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DESIGN_STYLE_ID } from '@/design/css-variables';

import { AppProviders } from './AppProviders';
import FoundationPage from './FoundationPage';

describe('AppProviders + FoundationPage', () => {
  it('başlığı gösterir, tasarım stilini yükler ve temayı yazar', () => {
    render(
      <AppProviders engines={false}>
        <FoundationPage />
      </AppProviders>,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Atonota' })).toBeInTheDocument();
    expect(document.getElementById(DESIGN_STYLE_ID)).not.toBeNull();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});
