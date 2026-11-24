import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { sampleAgents } from '../sampleData';
import HomePage from './HomePage';

/** MVP denetimi: canlı ana sayfada örnek ajan ve uydurma eşitleme saati yoktur. */
describe('HomePage', () => {
  it('canlı panelde örnek ajan ve uydurma saat göstermez', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <HomePage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Ana sayfa' })).toBeVisible();
    for (const agent of sampleAgents) expect(screen.queryByText(agent.name)).toBeNull();
    expect(screen.queryByText(/10:42/)).toBeNull();
    expect(screen.queryByText('Bu sayfadaki veriler örnektir.')).toBeNull();
    expect(screen.getByText('Panel özeti henüz yok. Menüden bir sayfa açın.')).toBeVisible();
  });
});
