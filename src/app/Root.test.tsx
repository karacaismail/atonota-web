import { render, screen } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { createPlatformSession } from '@/auth';
import { SAMPLE_CSRF_TOKEN } from '@/mocks/fixtures';
import { mockState, resetMockState } from '@/mocks/handlers';
import { mockServer } from '@/mocks/node';

import { Root } from './Root';

const SITE = 'https://kiraci.example.test';

type Rgba = [number, number, number, number];

function parseColor(value: string): Rgba {
  const match = /rgba?\(([^)]+)\)/.exec(value);
  if (match?.[1]) {
    const parts = match[1]
      .split(/[\s,/]+/)
      .filter(Boolean)
      .map(Number);
    return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0, parts[3] ?? 1];
  }
  const hex = /^#([0-9a-f]{6})$/i.exec(value.trim());
  if (hex?.[1]) {
    const n = Number.parseInt(hex[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
  }
  throw new Error(`Renk okunamadı: ${value}`);
}

function luminance([r, g, b]: Rgba): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(fg: string, bg: string): number {
  const base = parseColor(bg);
  const top = parseColor(fg);
  const a = top[3];
  const mixed: Rgba = [
    top[0] * a + base[0] * (1 - a),
    top[1] * a + base[1] * (1 - a),
    top[2] * a + base[2] * (1 - a),
    1,
  ];
  const [hi, lo] = [luminance(mixed), luminance(base)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

function session() {
  return createPlatformSession({
    env: { VITE_SITE_URL: SITE },
    origin: SITE,
    document,
    navigate: vi.fn(),
    currentPath: () => '/',
    csrfToken: SAMPLE_CSRF_TOKEN,
  });
}

beforeAll(() => mockServer.listen({ onUnhandledFrame: 'error' }));
afterEach(() => {
  mockServer.resetHandlers();
  resetMockState();
});
afterAll(() => mockServer.close());

describe('Root: giriş ekranı tema içinde çizilir', () => {
  it.each(['light', 'dark'] as const)(
    '%s temada başlık ve metin zeminle en az 4.5:1 kontrast verir',
    async (choice) => {
      mockState.signedIn = false;
      render(<Root session={session()} initialThemeChoice={choice} engines={false} />);
      const title = await screen.findByRole('heading', { level: 1, name: 'Oturum açın' });
      const body = screen.getByText('Paneli açmak için oturum açın.');
      const background = document.body.style.backgroundColor;
      expect(background).not.toBe('');
      expect(document.documentElement.getAttribute('data-theme')).toBe(choice);
      expect(contrast(getComputedStyle(title).color, background)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(getComputedStyle(body).color, background)).toBeGreaterThanOrEqual(4.5);
    },
  );

  it('giriş yerleşimi dar form sütununu kullanır', async () => {
    mockState.signedIn = false;
    render(<Root session={session()} initialThemeChoice="light" engines={false} />);
    const section = await screen.findByRole('region', { name: 'Oturum açın' });
    expect(section.style.maxWidth).toBe('var(--form-max-width)');
  });
});
