import { expect, test, type Page } from '../../../tests/setup/playwright-fixtures';

// G-98: the "Tenant Admin" manages the tenant's users on the "Administration" page.
// The mock server answers the user, role profile, invitation and role profile endpoints.
const PATH = '/administration';

async function open(page: Page) {
  await page.goto(PATH);
  await expect(page.getByRole('heading', { name: 'Yönetim', level: 1 })).toBeVisible();
  return page.getByRole('list', { name: 'Kullanıcı listesi' });
}

async function expectNoPageOverflow(page: Page) {
  const layout = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    page: document.documentElement.scrollWidth,
  }));
  expect(layout.page).toBeLessThanOrEqual(layout.viewport);
}

async function expectInViewport(page: Page, name: string) {
  const button = page.getByRole('button', { name, exact: true });
  await expect(button).toBeVisible();
  const box = await button.boundingBox();
  const width = page.viewportSize()?.width ?? 0;
  expect(box).not.toBeNull();
  expect((box?.x ?? -1) >= 0 && (box?.x ?? 0) + (box?.width ?? 0) <= width).toBe(true);
}

test('lists the users with a visible invite button and no page overflow', async ({ page }) => {
  const list = await open(page);
  await expect(list.getByText('Örnek Kişi')).toBeVisible();
  await expect(list.getByText('Örnek Çalışan')).toBeVisible();
  await expect(page.getByText('Bu ekrandan henüz kullanıcıları yönetemezsiniz.')).toHaveCount(0);
  await expectInViewport(page, 'Davet et');
  await expectNoPageOverflow(page);
  const fontSizes = await page.getByRole('region', { name: 'Kullanıcılar' }).evaluate((root) =>
    Array.from(root.querySelectorAll('p, h2, button, dd, dt, li, span'))
      .filter((element) => element.getBoundingClientRect().width > 0 && element.textContent)
      .map((element) => Number.parseFloat(getComputedStyle(element).fontSize)),
  );
  expect(Math.min(...fontSizes)).toBeGreaterThanOrEqual(14);
});

test('invites a user after the preview', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: 'Davet et', exact: true }).click();
  await page.getByLabel(/^E-posta/).fill('yeni.kisi@example.test');
  await expectInViewport(page, 'Daveti gönder');
  await page.getByRole('button', { name: 'Daveti gönder' }).click();
  await expect(page.getByText('Davet şu işlemleri yapacak:')).toBeVisible();
  await expectInViewport(page, 'Onayla ve gönder');
  await page.getByRole('button', { name: 'Onayla ve gönder' }).click();
  await expect(page.getByText('Davet gönderildi.')).toBeVisible();
  await expectNoPageOverflow(page);
});

test('assigns a role profile on the user record', async ({ page }) => {
  const list = await open(page);
  await list.getByRole('button', { name: /Örnek Çalışan/ }).click();
  await expect(page.getByRole('heading', { name: 'Örnek Çalışan' })).toBeVisible();
  await expectInViewport(page, 'Rol profilini değiştir');
  await page.getByRole('button', { name: 'Rol profilini değiştir' }).click();
  const dialog = page.getByRole('dialog');
  // antd Select is chosen with the keyboard: focus, down arrow and Enter.
  await dialog.getByRole('combobox', { name: 'Rol profili' }).focus();
  await page.keyboard.press('ArrowDown');
  const option = page.locator('.ant-select-item-option', { hasText: 'İzin Onaycısı' });
  await expect(option).toBeVisible();
  for (let step = 0; step < 5; step += 1) {
    if ((await option.getAttribute('class'))?.includes('ant-select-item-option-active')) break;
    await page.keyboard.press('ArrowDown');
  }
  await page.keyboard.press('Enter');
  await expect(dialog.getByText('Leave Approver')).toBeVisible();
  await dialog.getByRole('button', { name: 'Profili ata' }).click();
  await expect(page.getByText('Rol profili atandı.')).toBeVisible();
  // Escape is not needed: the dialog closes after the assignment.
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole('region', { name: 'Kullanıcılar' }).getByText('İzin Onaycısı'),
  ).toBeVisible();
  await expectNoPageOverflow(page);
});

test('the own record keeps the role profile button closed', async ({ page }) => {
  const list = await open(page);
  await list.getByRole('button', { name: /Örnek Kişi/ }).click();
  await expect(page.getByRole('button', { name: 'Rol profilini değiştir' })).toBeDisabled();
});
