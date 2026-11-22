import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import CollectionPage from './CollectionPage';

vi.mock('@ant-design/x', () => import('../testing/antdXMock'));

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/satis/teklif']}>
      <Routes>
        <Route path="/:module/:doctype" element={<CollectionPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('CollectionPage', () => {
  it('Önemli 1: kayıt sütunu kayda giden bağlantıdır', async () => {
    renderPage();
    const link = await screen.findByRole('link', { name: 'TEK-0001' });
    expect(link).toHaveAttribute('href', '/satis/teklif/TEK-0001');
  });

  it('Küçük 2: tarih gün, ay adı ve yıl ile yazılır', async () => {
    renderPage();
    expect(await screen.findByText('2 Kasım 2026')).toBeInTheDocument();
    expect(screen.queryByText('2026-11-02')).not.toBeInTheDocument();
  });
});
