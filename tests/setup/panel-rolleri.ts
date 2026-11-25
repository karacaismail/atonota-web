/**
 * Dört panel rolünün ortak tarayıcı denetimi (AJA-831; G-62, G-168, G-169, G-170).
 * Testler koddan önce yazıldı. Her rolün listesi kendi test dosyasındadır:
 *
 * - `tests/e2e/rol-tenant-admin.spec.ts`
 * - `tests/e2e/rol-tenant-admin-assistant.spec.ts`
 * - `tests/e2e/rol-reseller-admin.spec.ts`
 * - `tests/e2e/rol-reseller-assistant.spec.ts`
 *
 * Rolü sahte sunucu verir. Test, sayfa açılmadan önce senaryo adını oturum deposuna yazar.
 * Senaryo, açılış yanıtındaki (`get_bootstrap`) kullanıcı rollerini değiştirir.
 * Senaryo adları `src/mocks/scenarios.ts` dosyasına eklenir:
 *
 * - `rol-tenant-admin`: roller "Website User" ve "Tenant Admin".
 * - `rol-tenant-admin-assistant`: roller "Website User" ve "Tenant Admin Assistant".
 * - `rol-reseller-admin`: roller "Website User" ve "Reseller Admin".
 * - `rol-reseller-assistant`: roller "Website User" ve "Reseller Assistant".
 *
 * Süzgeç yalnız ekranı düzenler. Yetkiyi sunucu denetler. Sunucu testleri
 * `backend/apps/platform_core/platform_core/access/tests/test_role_*.py` dosyalarındadır.
 */
import type { Page } from '@playwright/test';

import { expect, test } from './playwright-fixtures';

/** Sahte sunucunun senaryo anahtarı. Kaynak: `src/mocks/scenarios.ts` içindeki `MOCK_SCENARIO_KEY`. */
const SCENARIO_KEY = 'atonota.mock-senaryo';

/** Menü gruplarının adı ve sayfa yolu. "Müşteriler" grubu bayi rolleri için eklenir (G-169). */
export const MENU_GROUPS = {
  Hesap: '/account',
  Yönetim: '/administration',
  'Yapay zekâ sağlayıcıları': '/administration/ai-providers',
  'İzin talepleri': '/hr',
  'Site ve plan': '/site-plan',
  'Yapay zekâ işlemleri': '/ai-operations',
  Müşteriler: '/customers',
} as const;

export type MenuGroup = keyof typeof MENU_GROUPS;

/** Açılamayan sayfanın notu. Sayfa başlığı görünmez. Bunun yerine bu not görünür. */
export const DENIED_NOTE = /Bu sayfayı açma yetkiniz yok/;
/** Yalnız okunan sayfanın notu. Örnek: "Bu bölümü yalnız okuyabilirsiniz." */
export const READ_ONLY_NOTE = /yalnız okuyabilirsiniz/i;

export interface ButtonCheck {
  /** Düğmenin bulunduğu sayfa. */
  page: MenuGroup;
  /** Rolün gördüğü eylem düğmeleri. */
  shown: readonly string[];
  /** Rolün görmediği eylem düğmeleri. */
  hidden: readonly string[];
}

export interface RoleContract {
  /** Frappe rolünün adı. */
  role: string;
  /** Sahte sunucu senaryosu. */
  scenario: string;
  /** Rolün menüde gördüğü gruplar. `MENU_GROUPS` sırasıyla yazılır. */
  menu: readonly MenuGroup[];
  /** Rolün açabildiği sayfalar. */
  pagesOpen: readonly MenuGroup[];
  /** Rolün açamadığı sayfalar. Bu sayfalar menüde de yoktur. */
  pagesClosed: readonly MenuGroup[];
  /** Rolün yalnız okuduğu sayfalar. Sayfada yalnız okuma notu görünür. */
  readOnly: readonly MenuGroup[];
  /** Rolün gördüğü ve görmediği eylem düğmeleri. */
  buttons: readonly ButtonCheck[];
}

async function useRole(page: Page, scenario: string) {
  await page.addInitScript(([key, value]) => sessionStorage.setItem(key, value), [
    SCENARIO_KEY,
    scenario,
  ] as const);
}

async function openMenu(page: Page) {
  // Kabuk çizilmeden düğme görünmez. Önce sayfa başlığı beklenir.
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const button = page.getByRole('button', { name: 'Menüyü aç' });
  if (await button.isVisible()) {
    await button.click();
    await expect(page.getByRole('dialog', { name: 'Menü' })).toBeVisible();
  }
}

/** Menüdeki grup bağlantıları. Yalnız `MENU_GROUPS` adları sayılır. */
async function menuGroups(page: Page): Promise<MenuGroup[]> {
  const menu = page.locator('#shell-drawer');
  await expect(menu.getByRole('link', { name: 'Ana sayfa', exact: true })).toBeVisible();
  const found: MenuGroup[] = [];
  for (const group of Object.keys(MENU_GROUPS) as MenuGroup[]) {
    if ((await menu.getByRole('link', { name: group, exact: true }).count()) > 0) found.push(group);
  }
  return found;
}

async function openPage(page: Page, group: MenuGroup) {
  await page.goto(MENU_GROUPS[group]);
  // Sahte sunucunun notu, kabuğun açıldığını gösterir.
  await expect(page.getByRole('status').filter({ hasText: 'Örnek veri' })).toBeVisible();
}

/** Bir rolün bütün tarayıcı testlerini kaydeder. Her test dosyası bunu bir kez çağırır. */
export function describeRole(contract: RoleContract) {
  test.describe(`"${contract.role}" rolü`, () => {
    test.beforeEach(async ({ page }) => {
      await useRole(page, contract.scenario);
    });

    test('menüde yalnız rolün grupları görünür', async ({ page }) => {
      await page.goto('/');
      await openMenu(page);
      expect(await menuGroups(page)).toEqual([...contract.menu]);
    });

    for (const group of contract.pagesOpen) {
      test(`"${group}" sayfasını açar`, async ({ page }) => {
        await openPage(page, group);
        await expect(
          page.getByRole('heading', { level: 1, name: group, exact: true }),
        ).toBeVisible();
        await expect(page.getByText(DENIED_NOTE)).toHaveCount(0);
        const note = page.getByText(READ_ONLY_NOTE);
        if (contract.readOnly.includes(group)) await expect(note).toBeVisible();
        else await expect(note).toHaveCount(0);
      });
    }

    for (const group of contract.pagesClosed) {
      test(`"${group}" sayfasını açamaz`, async ({ page }) => {
        await openPage(page, group);
        await expect(page.getByText(DENIED_NOTE)).toBeVisible();
        await expect(page.getByRole('heading', { level: 1, name: group, exact: true })).toHaveCount(
          0,
        );
      });
    }

    for (const check of contract.buttons) {
      test(`"${check.page}" sayfasında rolün eylem düğmeleri`, async ({ page }) => {
        await openPage(page, check.page);
        await expect(
          page.getByRole('heading', { level: 1, name: check.page, exact: true }),
        ).toBeVisible();
        for (const name of check.shown) {
          await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
        }
        for (const name of check.hidden) {
          await expect(page.getByRole('button', { name, exact: true })).toHaveCount(0);
        }
      });
    }
  });
}
