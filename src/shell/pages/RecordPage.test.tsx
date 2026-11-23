import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import type { RecordAddress, ShellViewData } from '../view-data';
import { ViewDataProvider } from '../view-data';
import RecordPage from './RecordPage';

function mount(data: ShellViewData | null, path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ViewDataProvider value={data}>
        <Routes>
          <Route path="/:module/:doctype/:name" element={<RecordPage />} />
        </Routes>
      </ViewDataProvider>
    </MemoryRouter>,
  );
}

function LiveRecord({ module, doctype, name }: RecordAddress) {
  return <p>{`canlı ${module} ${doctype} ${name}`}</p>;
}

describe('RecordPage', () => {
  it('kayıt bağlantısı varsa kaydı onunla çizer', () => {
    mount({ record: { Component: LiveRecord } }, '/hr/leave-application/HR-LAP-2026-00001');
    expect(screen.getByText('canlı hr leave-application HR-LAP-2026-00001')).toBeInTheDocument();
  });

  it('canlı kaydı kabuğun sayfa çerçevesi içinde çizer', () => {
    // Kayıt bileşeni yalnız içeriği verir. Sayfa çerçevesi kabuğundur (inceleme 2, K3).
    mount({ record: { Component: LiveRecord } }, '/hr/leave-application/HR-LAP-2026-00001');
    const text = screen.getByText('canlı hr leave-application HR-LAP-2026-00001');
    expect(text.closest('.shell-page > .shell-body')).not.toBeNull();
  });

  it('kayıt bağlantısı yoksa örnek kaydı arar', () => {
    mount(null, '/hr/leave-application/HR-LAP-2026-00001');
    expect(screen.queryByText(/canlı/)).not.toBeInTheDocument();
  });
});
