// G-98 (AJA-794): "Yönetim" sayfasının rol matrisi, kullanıcı izinleri, erişim kuralları,
// değişiklik kaydı ve "Erişimi açıkla" formu. Sahte sunucu `src/mocks/admin.ts` dosyasındadır.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '../../../tests/setup/playwright-fixtures';

const PATH = '/administration';
const ROLE = 'Örnek Satış Rolü';

/** antd Select'i yalnız klavyeyle seçer: odak, aşağı ok ve Enter. */
async function chooseByKeyboard(page: Page, label: string, option: string) {
  const input = page.getByLabel(label, { exact: true });
  await input.focus();
  await page.keyboard.press('ArrowDown');
  const item = page.locator('.ant-select-item-option', { hasText: option }).last();
  await expect(item).toBeVisible();
  for (let step = 0; step < 10; step += 1) {
    if ((await item.getAttribute('class'))?.includes('ant-select-item-option-active')) break;
    await page.keyboard.press('ArrowDown');
  }
  await page.keyboard.press('Enter');
}

async function open(page: Page) {
  await page.goto(PATH);
  await expect(page.getByRole('heading', { name: 'Yönetim', level: 1 })).toBeVisible();
}

async function openMatrix(page: Page) {
  await open(page);
  await chooseByKeyboard(page, 'Rol', ROLE);
  const matrix = page.getByRole('region', { name: `Rol matrisi: ${ROLE}` });
  await expect(matrix).toBeVisible();
  return matrix;
}

test('the old "cannot manage roles" text is gone', async ({ page }) => {
  await open(page);
  await expect(page.getByRole('heading', { name: 'Roller', level: 2 })).toBeVisible();
  await expect(page.getByText('Bu ekrandan henüz rolleri yönetemezsiniz.')).toHaveCount(0);
});

test('the role matrix saves a change after a before and after review', async ({ page }) => {
  const writes: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('set_role_permission')) writes.push(request.method());
  });
  const matrix = await openMatrix(page);
  const box = matrix.getByRole('checkbox', { name: 'Leave Application, düzey 0, Silme' });
  await expect(box).not.toBeChecked();
  await box.focus();
  await page.keyboard.press('Space');
  await expect(box).toBeChecked();
  await expect(page.getByText('1 değişiklik var')).toBeVisible();
  expect(writes).toEqual([]);

  const save = page.getByRole('button', { name: 'Kaydet', exact: true });
  await save.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Leave Application, Silme: önce kapalı, sonra açık');
  // Escape pencereyi kapatır ve odak açan düğmeye döner. Hiçbir şey gönderilmez.
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(save).toBeFocused();
  expect(writes).toEqual([]);

  await save.click();
  await page.getByRole('button', { name: 'Değişiklikleri kaydet' }).click();
  await expect(page.getByText('Değişiklikler kaydedildi.')).toBeVisible();
  expect(writes).toEqual(['POST']);
  // Panel matrisi sunucudan yeniden okur. Sunucu da değişikliği tutar.
  await expect(box).toBeChecked();
  await expect(page.getByText('1 değişiklik var')).toHaveCount(0);
});

test('a standard role is read only', async ({ page }) => {
  await open(page);
  await chooseByKeyboard(page, 'Rol', 'Employee');
  await expect(page.getByText('Bu rol standart roldür. İzinlerini değiştiremezsiniz.')).toBeVisible();
  const matrix = page.getByRole('region', { name: 'Rol matrisi: Employee' });
  await expect(matrix.getByRole('checkbox').first()).toBeDisabled();
});

test('the role matrix scrolls in its own box and the page does not', async ({ page }) => {
  const matrix = await openMatrix(page);
  const layout = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    page: document.documentElement.scrollWidth,
  }));
  expect(layout.page).toBeLessThanOrEqual(layout.viewport);
  if (layout.viewport <= 390) {
    const box = await matrix.evaluate((element) => ({
      scroll: element.scrollWidth,
      client: element.clientWidth,
    }));
    expect(box.scroll).toBeGreaterThan(box.client);
    await expect(page.getByText('Tablo sağa kayar.')).toBeVisible();
    // Kutu klavyeyle odaklanır ve ok tuşuyla kayar.
    await matrix.focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => matrix.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
    // "Kayıt türü" sütunu kaydırmada görünür kalır.
    const header = matrix.getByRole('columnheader', { name: 'Kayıt türü' });
    const left = await header.evaluate((cell) => cell.getBoundingClientRect().left);
    const boxLeft = await matrix.evaluate((element) => element.getBoundingClientRect().left);
    expect(Math.abs(left - boxLeft)).toBeLessThanOrEqual(1);
  }
  // Kayıt türü adı kelime ortasından bölünmez.
  const cell = matrix.getByRole('rowheader', { name: 'Leave Application' }).first();
  const lines = await cell.evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    return Array.from(range.getClientRects()).map((rect) => Math.round(rect.width));
  });
  expect(lines.length).toBeLessThanOrEqual(2);
  const fontSizes = await page.locator('.module-page').evaluate((root) =>
    Array.from(root.querySelectorAll('p, h1, h2, h3, label, button, td, th, dd, dt, a, span'))
      .filter((element) => element.getBoundingClientRect().width > 0)
      .filter((element) => (element.textContent ?? '').trim().length > 0)
      .map((element) => Number.parseFloat(getComputedStyle(element).fontSize)),
  );
  expect(fontSizes.every((size) => size >= 14)).toBe(true);
  expect((await new AxeBuilder({ page }).include('.module-page').analyze()).violations).toEqual([]);
});

test('the account adds a user permission', async ({ page }) => {
  await open(page);
  const section = page.getByRole('region', { name: 'Kullanıcı izinleri ve kurallar' });
  await section.getByRole('button', { name: 'İzin ekle' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Kullanıcı', { exact: true }).fill('ornek.kisi@example.invalid');
  await dialog.getByLabel('Kayıt türü', { exact: true }).fill('Company');
  await dialog.getByLabel('Değer', { exact: true }).fill('Örnek A.Ş.');
  await dialog.getByRole('button', { name: 'İzni kaydet' }).click();
  await expect(dialog).toBeHidden();
  await expect(section.getByText('Company: Örnek A.Ş.')).toBeVisible();
});

test('the account adds an access rule', async ({ page }) => {
  await open(page);
  const section = page.getByRole('region', { name: 'Kullanıcı izinleri ve kurallar' });
  await section.getByRole('tab', { name: 'Erişim kuralları' }).click();
  await section.getByRole('button', { name: 'Kural ekle' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Başlık', { exact: true }).fill('Satış ekibi izinleri');
  await dialog.getByLabel('Kayıt türü', { exact: true }).fill('Leave Application');
  await chooseByKeyboard(page, 'Kuralın rolü', ROLE);
  await chooseByKeyboard(page, 'Kapsam', 'Ekibinin kayıtları');
  await dialog.getByRole('checkbox', { name: 'Okuma' }).check();
  await expect(dialog.getByText('Önizleme henüz bağlı değil.')).toBeVisible();
  await dialog.getByRole('button', { name: 'Kuralı kaydet' }).click();
  await expect(dialog).toBeHidden();
  await expect(section.getByText('Satış ekibi izinleri')).toBeVisible();
});

test('the account reads the permission log', async ({ page }) => {
  await open(page);
  const section = page.getByRole('region', { name: 'Değişiklik kaydı' });
  await expect(section.getByText('Role Profile: Örnek Profil')).toBeVisible();
  await expect(section.getByRole('button', { name: 'Daha eski kayıtlar' })).toBeVisible();
});

test('the explain form gives a result instead of a permission error', async ({ page }) => {
  await open(page);
  const section = page.getByRole('region', { name: 'Erişimi açıkla' });
  await section.getByLabel('Kayıt türü', { exact: true }).fill('Örnek Kayıt');
  await section.getByLabel('Kayıt', { exact: true }).fill('ORNEK-0001');
  await section.getByRole('button', { name: 'Erişimi açıkla' }).click();
  await expect(section.getByText('Bu kayda erişebilirsiniz.')).toBeVisible();
  await expect(page.getByText('Bu işlem için yetkiniz yok.')).toHaveCount(0);
});
