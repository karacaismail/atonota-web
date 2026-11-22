import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DESIGN_STYLE_ID } from '@/design/css-variables';

import { App } from './App';

describe('App', () => {
  it('başlığı gösterir ve tasarım stilini yükler', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'Atonota' })).toBeInTheDocument();
    expect(document.getElementById(DESIGN_STYLE_ID)).not.toBeNull();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});
