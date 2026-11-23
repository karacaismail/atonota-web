import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { FOREIGN_LOGOUT_URL, SAMPLE_CSRF_TOKEN, sampleLogoutUrl } from './fixtures';
import { mockState, resetMockState } from './handlers';
import { mockServer } from './node';
import { applyMockScenario, MOCK_SCENARIO_KEY, readMockScenario } from './scenarios';

const LOGOUT = 'https://kiraci.example.test/api/method/platform_core.api.auth.logout';

function logout() {
  return fetch(LOGOUT, {
    method: 'POST',
    headers: { 'X-Frappe-CSRF-Token': SAMPLE_CSRF_TOKEN },
  });
}

beforeAll(() => mockServer.listen({ onUnhandledFrame: 'error' }));
afterEach(() => {
  mockServer.resetHandlers();
  resetMockState();
  sessionStorage.clear();
});
afterAll(() => mockServer.close());

describe('sahte sunucu senaryoları', () => {
  it('senaryo yoksa çıkış örnek adresi verir', async () => {
    expect(applyMockScenario(null)).toBe(false);
    const response = await logout();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ message: sampleLogoutUrl });
  });

  it('"cikis-hatasi" senaryosunda çıkış sunucu hatası verir ve oturum açık kalır', async () => {
    expect(applyMockScenario('cikis-hatasi')).toBe(true);
    const response = await logout();
    expect(response.status).toBe(500);
    expect(mockState.signedIn).toBe(true);
  });

  it('"cikis-yabanci-adres" senaryosunda çıkış başka kökenli bir adres verir', async () => {
    expect(applyMockScenario('cikis-yabanci-adres')).toBe(true);
    const response = await logout();
    expect(await response.json()).toEqual({ message: { logout_url: FOREIGN_LOGOUT_URL } });
    expect(new URL(FOREIGN_LOGOUT_URL).hostname).toBe('baska.example.test');
  });

  it('bilinmeyen senaryo yok sayılır', () => {
    expect(applyMockScenario('bilinmeyen')).toBe(false);
    expect(mockState.logoutOutcome).toBe('ok');
  });

  it('senaryo adı oturum deposundan okunur', () => {
    expect(readMockScenario()).toBeNull();
    sessionStorage.setItem(MOCK_SCENARIO_KEY, 'cikis-hatasi');
    expect(readMockScenario()).toBe('cikis-hatasi');
  });

  it('sıfırlama çıkışı olağan yanıta döndürür', () => {
    applyMockScenario('cikis-hatasi');
    resetMockState();
    expect(mockState.logoutOutcome).toBe('ok');
  });
});
