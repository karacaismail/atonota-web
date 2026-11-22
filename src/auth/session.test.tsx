import { act, render, screen } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { readApiConfig } from '@/api/config';
import { readCsrfFromDocument } from '@/api/csrf';
import { SAMPLE_CSRF_TOKEN, SAMPLE_USER } from '@/mocks/fixtures';
import { resetMockState } from '@/mocks/handlers';
import { mockServer } from '@/mocks/node';

import { createPlatformSession } from './session';
import { useAuthState } from './useAuthState';

beforeAll(() => mockServer.listen({ onUnhandledFrame: 'error' }));
afterEach(() => {
  mockServer.resetHandlers();
  resetMockState();
  document.head.innerHTML = '';
});
afterAll(() => mockServer.close());

describe('readApiConfig', () => {
  it('ayar yoksa sayfanın kökünü ve aynı kök çerez politikasını kullanır', () => {
    const config = readApiConfig({}, 'https://kiraci.example.test');
    expect(config.siteUrl).toBe('https://kiraci.example.test');
    expect(config.credentials).toBe('same-origin');
    expect(config.keycloakUrl).toBe('https://id.atonota.net');
    expect(config.keycloakRealm).toBe('platform');
    expect(config.aiRoute).toBe('');
  });

  it('başka kökteki site için çerezi include ile gönderir', () => {
    const config = readApiConfig(
      { VITE_SITE_URL: 'https://api.example.test/' },
      'https://panel.example.test',
    );
    expect(config.siteUrl).toBe('https://api.example.test');
    expect(config.credentials).toBe('include');
  });
});

describe('readCsrfFromDocument', () => {
  it('meta öğesindeki belirteci okur', () => {
    document.head.innerHTML = `<meta name="csrf-token" content="${SAMPLE_CSRF_TOKEN}">`;
    expect(readCsrfFromDocument(document, 'csrf-token')).toBe(SAMPLE_CSRF_TOKEN);
  });

  it('meta öğesi yoksa boş döner', () => {
    expect(readCsrfFromDocument(document, 'csrf-token')).toBeUndefined();
  });
});

function Status({ session }: { session: ReturnType<typeof createPlatformSession> }) {
  const state = useAuthState(session.auth);
  return <p>{state.status === 'signed_in' ? `Giriş: ${state.user}` : state.status}</p>;
}

describe('createPlatformSession', () => {
  it('CSRF belirtecini sayfadan alır ve oturumu ekrana taşır', async () => {
    document.head.innerHTML = `<meta name="csrf-token" content="${SAMPLE_CSRF_TOKEN}">`;
    const navigate = vi.fn();
    const session = createPlatformSession({
      env: { VITE_SITE_URL: 'https://kiraci.example.test' },
      origin: 'https://kiraci.example.test',
      document,
      navigate,
      currentPath: () => '/panel',
    });
    expect(session.csrf.get()).toBe(SAMPLE_CSRF_TOKEN);

    render(<Status session={session} />);
    expect(screen.getByText('checking')).toBeInTheDocument();

    await act(() => session.auth.check());
    expect(screen.getByText(`Giriş: ${SAMPLE_USER}`)).toBeInTheDocument();
  });
});
