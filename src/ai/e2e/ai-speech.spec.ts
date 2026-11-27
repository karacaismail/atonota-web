import { expect, test, type Page } from '../../../tests/setup/playwright-fixtures';

/**
 * AJA-1784 in a real browser.
 * - A finished reply is announced once. The message log is not a live region.
 * - While the IME is active, Enter does not send the message.
 */
const PAGE = '/panel/ai';
const BOX = 'Asistana mesaj yazın';

async function open(page: Page) {
  await page.goto(PAGE);
  await expect(page.getByRole('textbox', { name: BOX })).toBeVisible();
}

/** Records every text the announcer shows, in order. */
async function watchAnnouncer(page: Page) {
  await page.evaluate(() => {
    const node = document.querySelector('[data-ai-announcer]');
    const texts: string[] = [];
    (window as unknown as { __announced: string[] }).__announced = texts;
    if (!node) return;
    new MutationObserver(() => {
      const text = node.textContent ?? '';
      if (text && texts[texts.length - 1] !== text) texts.push(text);
    }).observe(node, { childList: true, characterData: true, subtree: true });
  });
}

function announced(page: Page) {
  return page.evaluate(() => (window as unknown as { __announced: string[] }).__announced);
}

/** Sends Enter the way the browser does while a candidate is being chosen. */
async function imeEnter(page: Page, keyCode: number, isComposing: boolean) {
  await page.getByRole('textbox', { name: BOX }).evaluate(
    (el, init) => {
      el.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          keyCode: init.keyCode,
          isComposing: init.isComposing,
          bubbles: true,
          cancelable: true,
        }),
      );
    },
    { keyCode, isComposing },
  );
}

test.describe('AI Studio: duyuru ve aday seçimi', () => {
  test('mesaj akışı canlı bölge değildir ve yanıt bir kez duyurulur', async ({ page }) => {
    await open(page);
    await expect(page.getByRole('log')).toHaveAttribute('aria-live', 'off');
    await watchAnnouncer(page);
    await page.getByRole('textbox', { name: BOX }).fill('Bu haftanın satış özetini çıkar');
    await page.getByRole('button', { name: 'Mesajı gönder' }).click();
    await expect(page.getByRole('button', { name: 'Kopyala' })).toBeVisible();
    await expect(page.locator('[data-ai-announcer]')).toHaveText('Yanıt hazır.');
    expect(await announced(page)).toEqual(['Asistan yanıt hazırlıyor.', 'Yanıt hazır.']);
  });

  test('aday seçimi sürerken Enter göndermez, bitince bir kez gönderir', async ({ page }) => {
    await open(page);
    const box = page.getByRole('textbox', { name: BOX });
    await box.fill('こんにちは');
    await imeEnter(page, 229, true);
    await imeEnter(page, 13, true);
    await imeEnter(page, 229, false);
    await expect(box).toHaveValue('こんにちは');
    await expect(page.locator('.ai-user')).toHaveCount(0);

    await box.press('Enter');
    await expect(page.locator('.ai-user')).toHaveCount(1);
    await expect(page.locator('.ai-user')).toContainText('こんにちは');
  });
});
