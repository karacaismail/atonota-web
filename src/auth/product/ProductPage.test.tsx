// AtonotA Login tanıtım sayfası (G-165, G-166, G-167, G-157).
import { render, screen, within } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { createPlatformSession } from '@/auth';
import { Root } from '@/app/Root';
import { SAMPLE_CSRF_TOKEN } from '@/mocks/fixtures';
import { resetMockState } from '@/mocks/handlers';
import { mockServer } from '@/mocks/node';

import messages from './messages.json';
import ProductPage from './ProductPage';
import { valueProps } from './content';
import { PRODUCT_PATH, isPublicPath } from './path';

beforeAll(() => mockServer.listen({ onUnhandledFrame: 'error' }));
afterEach(() => resetMockState());
afterAll(() => mockServer.close());

describe('ProductPage', () => {
  it('marka adını tam yazar', () => {
    render(<ProductPage />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('AtonotA Login');
  });

  it('var olan yetenekler ile yakında gelenler ayrı bölümdedir', () => {
    render(<ProductPage />);
    const ready = screen.getByRole('region', { name: 'Bugün neler var?' });
    const soon = screen.getByRole('region', { name: 'Yakında' });
    expect(within(ready).getByText('Birçok platformla giriş')).toBeVisible();
    expect(within(soon).getByText('Geçiş anahtarıyla güçlü giriş')).toBeVisible();
    expect(within(ready).queryByText('Geçiş anahtarıyla güçlü giriş')).not.toBeInTheDocument();
  });

  it('her değer önerisi bir gereksinime bağlıdır', () => {
    expect(valueProps.length).toBeGreaterThan(0);
    for (const item of valueProps) {
      expect(item.requirement).toMatch(/^G-1(5[7-9]|6[0-7])$/);
      expect(messages.tr.values).toHaveProperty(item.key);
    }
  });

  it('fiyat yazmaz (G-166)', () => {
    const { container } = render(<ProductPage />);
    const text = container.textContent ?? '';
    expect(text).toContain('Fiyat henüz açıklanmadı.');
    expect(text).not.toMatch(/[₺$€]|\bTL\b|\bTRY\b|\bUSD\b|\bEUR\b|\d+\s*(lira|dolar|avro)/i);
  });

  it('lisans sınırını yazar (G-157)', () => {
    render(<ProductPage />);
    const license = screen.getByRole('region', { name: 'Lisans' });
    expect(license).toHaveTextContent('MIT');
    expect(license).toHaveTextContent('Apache-2.0');
  });

  it('sayfa dış adrese istek ya da bağlantı içermez (G-134)', () => {
    const { container } = render(<ProductPage />);
    for (const link of container.querySelectorAll('a')) {
      expect(link.getAttribute('href')).toMatch(/^\//);
    }
    expect(container.querySelector('script, iframe, img[src^="http"]')).toBeNull();
  });
});

describe('oturumsuz adres', () => {
  it('tanıtım adresi oturum istemez', () => {
    expect(PRODUCT_PATH).toBe('/atonota-login');
    expect(isPublicPath('/atonota-login')).toBe(true);
    expect(isPublicPath('/atonota-login/')).toBe(true);
    expect(isPublicPath('/atonota-login-x')).toBe(false);
    expect(isPublicPath('/account')).toBe(false);
  });

  it('Root tanıtım sayfasını oturum sormadan çizer', async () => {
    const get = vi.fn();
    mockServer.events.on('request:start', ({ request }) => {
      if (request.url.includes('get_logged_user')) get();
    });
    const session = createPlatformSession({
      env: { VITE_SITE_URL: 'https://kiraci.example.test' },
      origin: 'https://kiraci.example.test',
      document,
      navigate: vi.fn(),
      currentPath: () => '/atonota-login',
      csrfToken: SAMPLE_CSRF_TOKEN,
    });
    render(<Root session={session} engines={false} pathname="/atonota-login" />);
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('AtonotA Login');
    expect(get).not.toHaveBeenCalled();
    mockServer.events.removeAllListeners();
  });
});
