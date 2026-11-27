import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '../../../tests/setup/playwright-fixtures';
import { MOCK_SCENARIO_KEY } from '@/mocks/scenarios';
import { object, text } from '../contracts';

const PATH = '/administration/ai-providers';
const TITLE = 'Yapay zekâ sağlayıcıları';

/** Picks an antd Select option with the keyboard only: focus, down arrow and Enter. */
async function chooseByKeyboard(page: Page, label: string, option: string) {
  const input = page.getByLabel(label, { exact: true });
  await input.focus();
  await page.keyboard.press('ArrowDown');
  const item = page.locator('.ant-select-item-option', { hasText: option }).last();
  await expect(item).toBeVisible();
  // Moves the active option to the wanted option.
  for (let step = 0; step < 10; step += 1) {
    if ((await item.getAttribute('class'))?.includes('ant-select-item-option-active')) break;
    await page.keyboard.press('ArrowDown');
  }
  await page.keyboard.press('Enter');
}

async function openForm(page: Page) {
  await page.goto(PATH);
  await expect(page.getByRole('heading', { name: TITLE, level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'API ekle' }).click();
  await chooseByKeyboard(page, 'Kategori', 'AI LLM');
  await chooseByKeyboard(page, 'Sağlayıcı', 'Anthropic');
}

async function fill(page: Page, secret: string) {
  await page.getByLabel(/^Hesap adı/).fill('Ana hesap');
  await page.getByLabel(/^Bağlantı adı/).fill('Deneme bağlantısı');
  await page.getByLabel(/^API anahtarı/).fill(secret);
}

async function fillAndSave(page: Page, secret: string) {
  await fill(page, secret);
  await page.getByRole('button', { name: 'Kaydet' }).click();
  await expect(page.getByText('Bağlantı kaydedildi. Bağlantı henüz denenmedi.')).toBeVisible();
}

/** Does the focused element show the underline indicator? No surrounding ring (outline none). */
async function expectFocusIndicator(page: Page, button: Locator) {
  await expect(button).toBeFocused();
  await expect(page.locator('html')).toHaveAttribute('data-focus-mode', 'keyboard');
  const style = await button.evaluate((element) => {
    const computed = getComputedStyle(element);
    return { shadow: computed.boxShadow, outline: computed.outlineStyle };
  });
  expect(style.shadow).toMatch(/inset/);
  expect(style.outline).toBe('none');
}

/** Collects provider response bodies: the save endpoint and the connection list. */
function collectBodies(page: Page): Promise<string>[] {
  const bodies: Promise<string>[] = [];
  page.on('response', (response) => {
    const url = response.url();
    if (url.includes('save_connection') || url.includes('/api/v2/document/'))
      bodies.push(response.text().catch(() => ''));
  });
  return bodies;
}

test('lists connections without page overflow and passes axe', async ({ page }) => {
  await page.goto(PATH);
  await expect(page.getByRole('heading', { name: TITLE, level: 1 })).toBeVisible();
  const list = page.getByRole('list', { name: 'Bağlantılar' });
  await expect(list.getByText('Birincil bağlantı')).toBeVisible();
  await expect(list.getByText('Bağlandı', { exact: true })).toBeVisible();
  await expect(list.getByText('Denenmedi', { exact: true })).toBeVisible();
  const layout = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    page: document.documentElement.scrollWidth,
  }));
  expect(layout.page).toBeLessThanOrEqual(layout.viewport);
  const fontSizes = await page.locator('.module-page').evaluate((root) =>
    Array.from(root.querySelectorAll('p, h1, h2, label, button, dd, dt'))
      .filter((element) => element.getBoundingClientRect().width > 0)
      .map((element) => Number.parseFloat(getComputedStyle(element).fontSize)),
  );
  expect(fontSizes.every((size) => size >= 14)).toBe(true);
  expect((await new AxeBuilder({ page }).include('.module-page').analyze()).violations).toEqual([]);
});

test('adds an API with the keyboard, saves, then checks it live', async ({ page, browserName }) => {
  await openForm(page);
  const secret = page.getByLabel(/^API anahtarı/);
  await expect(secret).toHaveAttribute('type', 'password');
  expect(await new AxeBuilder({ page }).include('.module-page').analyze()).toMatchObject({
    violations: [],
  });

  const bodies = collectBodies(page);
  const saveRequest = page.waitForRequest('**/platform_core.api.model.save_connection');
  const saveResponse = page.waitForResponse('**/platform_core.api.model.save_connection');
  await fill(page, 'ornek-gizli-deger');
  // Tab turns keyboard mode on. The form is submitted with Enter in the secret field.
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(page.getByLabel(/^API anahtarı/)).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Bağlantı kaydedildi. Bağlantı henüz denenmedi.')).toBeVisible();
  const request = await saveRequest;
  expect(request.headers()['x-frappe-csrf-token']).toBeTruthy();
  // After saving, the secret appears nowhere on the page.
  expect(await page.content()).not.toContain('ornek-gizli-deger');

  // When the form goes, focus moves to the "Test connection" button. Focus is not set by hand.
  const form = page.getByRole('region', { name: 'Yeni bağlantı' });
  await expectFocusIndicator(page, form.getByRole('button', { name: 'Bağlantıyı dene' }));
  await page.keyboard.press('Enter');
  const result = form.getByRole('status', { name: 'Deneme sonucu' });
  await expect(result.getByText('Bağlandı', { exact: true })).toBeVisible();
  await expect(result.getByText('Anahtar geçerli. Kalan kota bu denemede görünmez.')).toBeVisible();
  // The new connection enters the list.
  await expect(
    page.getByRole('list', { name: 'Bağlantılar' }).getByText('Deneme bağlantısı'),
  ).toBeVisible();
  // The save response and the list responses contain no secret.
  expect(await (await saveResponse).text()).not.toContain('ornek-gizli-deger');
  const texts = await Promise.all(bodies);
  expect(texts.length).toBeGreaterThanOrEqual(2);
  for (const body of texts) expect(body).not.toContain('ornek-gizli-deger');

  // The "Formu kapat" button is reached with the keyboard. When the form closes, focus returns to
  // the "API ekle" button.
  const close = form.getByRole('button', { name: 'Formu kapat' });
  // WebKit only puts buttons in the tab order with Option+Tab.
  const tab = browserName === 'webkit' ? 'Alt+Tab' : 'Tab';
  for (let step = 0; step < 6; step += 1) {
    if (await close.evaluate((element) => element === document.activeElement)) break;
    await page.keyboard.press(tab);
  }
  await expect(close).toBeFocused();
  await page.keyboard.press('Enter');
  await expectFocusIndicator(page, page.getByRole('button', { name: 'API ekle' }));
  const layout = await page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  );
  expect(layout).toBe(true);
});

test('shows "Invalid key" for a rejected key', async ({ page }) => {
  await openForm(page);
  await fillAndSave(page, 'gecersiz-anahtar');
  const form = page.getByRole('region', { name: 'Yeni bağlantı' });
  await form.getByRole('button', { name: 'Bağlantıyı dene' }).click();
  await expect(
    form.getByRole('status', { name: 'Deneme sonucu' }).getByText('Anahtar geçersiz'),
  ).toBeVisible();
});

for (const [secret, text] of [
  ['ag-hatasi', 'Ağ hatası'],
  ['kota-dolu', 'Kota doldu'],
] as const) {
  test(`shows "${text}" for a failed check`, async ({ page }) => {
    await openForm(page);
    await fillAndSave(page, secret);
    const form = page.getByRole('region', { name: 'Yeni bağlantı' });
    await form.getByRole('button', { name: 'Bağlantıyı dene' }).click();
    await expect(
      form.getByRole('status', { name: 'Deneme sonucu' }).getByText(text, { exact: true }),
    ).toBeVisible();
  });
}

test('marks a missing required field without sending the request', async ({ page }) => {
  await openForm(page);
  let sent = false;
  page.on('request', (request) => {
    if (request.url().includes('save_connection')) sent = true;
  });
  await page.getByRole('button', { name: 'Kaydet' }).click();
  await expect(page.getByLabel(/^API anahtarı/)).toHaveAttribute('aria-invalid', 'true');
  await expect(
    page.getByText('Sunucu bağlantıyı kaydetmedi. İşaretli alanları denetleyin.'),
  ).toBeVisible();
  expect(sent).toBe(false);
});

test('explains the gateway rate limit', async ({ page }) => {
  await page.addInitScript(([key, value]) => sessionStorage.setItem(key, value), [
    MOCK_SCENARIO_KEY,
    'saglayici-mesgul',
  ] as const);
  await page.goto(PATH);
  const list = page.getByRole('list', { name: 'Bağlantılar' });
  await list.getByRole('button', { name: 'Bağlantıyı dene' }).first().click();
  await expect(
    list.getByText('Çok sık denendi. Bir dakika bekleyin, sonra yeniden deneyin.'),
  ).toBeVisible();
});

test('page code stays out of the initial bundle', async ({ page }) => {
  const response = await page.request.get('/.vite/manifest.json');
  expect(response.ok()).toBe(true);
  const manifest = object(await response.json());
  const page_ = object(manifest['src/modules/ai-providers/Page.tsx']);
  const pageFile = text(page_['file']);
  const collect = (key: string, seen = new Set<string>()): Set<string> => {
    if (seen.has(key)) return new Set();
    seen.add(key);
    const entry = object(manifest[key]);
    const files = new Set([text(entry['file'])]);
    // Only static imports are part of the initial load.
    if (Array.isArray(entry['imports']))
      for (const dependency of entry['imports'])
        for (const file of collect(text(dependency), seen)) files.add(file);
    return files;
  };
  // Provider endpoints and check functions are not in the initial load either (separate
  // `provider-client` chunk).
  const clientFile = text(object(manifest['src/api/provider-client.ts'])['file']);
  const initial = collect('index.html');
  expect(initial.has(pageFile)).toBe(false);
  expect(initial.has(clientFile)).toBe(false);
  const requested: string[] = [];
  page.on('request', (request) => requested.push(new URL(request.url()).pathname));
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  expect(requested.some((path) => path.endsWith(pageFile))).toBe(false);
  expect(requested.some((path) => path.endsWith(clientFile))).toBe(false);
});
