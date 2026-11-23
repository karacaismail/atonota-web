import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { sampleUser } from '../sampleData';
import { ViewDataProvider } from '../view-data';
import { SidebarFooter } from './SidebarFooter';

describe('SidebarFooter kullanıcı kartı', () => {
  it('oturumdaki kişiyi gösterir, örnek kişiyi göstermez', () => {
    render(
      <ViewDataProvider
        value={{ account: { fullName: 'Deneme Kullanıcı', user: 'deneme@example.test' } }}
      >
        <SidebarFooter rail={false} />
      </ViewDataProvider>,
    );
    expect(screen.getByText('Deneme Kullanıcı')).toBeInTheDocument();
    expect(screen.getByText('deneme@example.test')).toBeInTheDocument();
    expect(screen.getByText('DK')).toBeInTheDocument();
    expect(screen.queryByText(sampleUser.name)).toBeNull();
  });

  it('ad yoksa kullanıcı kimliğini ad olarak gösterir', () => {
    render(
      <ViewDataProvider value={{ account: { user: 'deneme@example.test' } }}>
        <SidebarFooter rail={false} />
      </ViewDataProvider>,
    );
    expect(screen.getAllByText('deneme@example.test').length).toBeGreaterThan(0);
    expect(screen.getByText('D')).toBeInTheDocument();
  });

  it('bağlantı yoksa deneme sayfasındaki örnek kişiyi gösterir', () => {
    render(<SidebarFooter rail={false} />);
    expect(screen.getByText(sampleUser.name)).toBeInTheDocument();
  });
});
