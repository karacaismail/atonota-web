// Tarayıcı testlerinin seçtiği sahte sunucu senaryoları.
// Sahte sunucu tarayıcıda çalışır. Playwright'ın `page.route` yöntemi bu istekleri görmez.
// Bu yüzden test, sayfa açılmadan önce `sessionStorage` içine bir senaryo adı yazar. Örnek:
//   await page.addInitScript(() => sessionStorage.setItem('atonota.mock-senaryo', 'cikis-hatasi'));
// Sahte sunucu açılırken bu adı okur. Bu dosya yalnız sahte sunucuyla pakete girer.
import { type LogoutOutcome, mockState } from './handlers';

export const MOCK_SCENARIO_KEY = 'atonota.mock-senaryo';

const SCENARIOS: Record<string, () => void> = {
  'cikis-hatasi': () => setLogout('failure'),
  'cikis-yabanci-adres': () => setLogout('foreign_url'),
};

function setLogout(outcome: LogoutOutcome): void {
  mockState.logoutOutcome = outcome;
}

/** Oturum deposundaki senaryo adını okur. Depo yoksa ya da erişilemezse `null` döner. */
export function readMockScenario(): string | null {
  try {
    return globalThis.sessionStorage?.getItem(MOCK_SCENARIO_KEY) ?? null;
  } catch {
    return null;
  }
}

/** Senaryoyu uygular. Ad tanınırsa `true` döner. Bilinmeyen ad yok sayılır. */
export function applyMockScenario(name: string | null): boolean {
  const apply = name ? SCENARIOS[name] : undefined;
  if (!apply) return false;
  apply();
  return true;
}
