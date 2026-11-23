import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppProviders } from './AppProviders';
import { THEME_MODE_STORAGE_KEY, readStoredChoice, resolveThemeMode } from './theme-mode';
import { ThemeModeSwitch } from './ThemeModeSwitch';

function mockMatchMedia(dark: boolean) {
  window.matchMedia = (query: string): MediaQueryList => ({
    matches: query.includes('dark') ? dark : false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  });
}

describe('tema modu', () => {
  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    vi.restoreAllMocks();
  });

  it('sistem seçimi işletim sistemi tercihini izler', () => {
    expect(resolveThemeMode('system', true)).toBe('dark');
    expect(resolveThemeMode('system', false)).toBe('light');
    expect(resolveThemeMode('dark', false)).toBe('dark');
  });

  it('saklanan seçim okunur; bozuk değer sistem olur', () => {
    localStorage.setItem(THEME_MODE_STORAGE_KEY, 'dark');
    expect(readStoredChoice()).toBe('dark');
    localStorage.setItem(THEME_MODE_STORAGE_KEY, 'mor');
    expect(readStoredChoice()).toBe('system');
  });

  it('düğme ile koyu seçilince belge koyu olur ve seçim saklanır', async () => {
    mockMatchMedia(false);
    const user = userEvent.setup();
    render(
      <AppProviders engines={false}>
        <ThemeModeSwitch />
      </AppProviders>,
    );
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    await user.click(screen.getByText('Koyu'));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(localStorage.getItem(THEME_MODE_STORAGE_KEY)).toBe('dark');
  });

  it('sistem koyuysa sistem seçimi koyu tema uygular', () => {
    mockMatchMedia(true);
    render(
      <AppProviders engines={false} initialThemeChoice="system">
        <span>içerik</span>
      </AppProviders>,
    );
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
