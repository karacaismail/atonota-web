import { Bubble, XProvider } from '@ant-design/x';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

// Temiz `npm ci` + Node 24 altında @ant-design/x içe aktarımı yüklenmelidir (antd/es/version dizini).
describe('Ant Design X yüklemesi', () => {
  it('XProvider ve Bubble jsdom altında çizilir', () => {
    render(
      <XProvider>
        <Bubble content="Merhaba" />
      </XProvider>,
    );
    expect(screen.getByText('Merhaba')).toBeInTheDocument();
  });
});
