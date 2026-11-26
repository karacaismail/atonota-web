import { expect, test } from '../../../tests/setup/playwright-fixtures';

test.describe('foundation small button touch target', () => {
  test.use({ hasTouch: true });

  test('keeps the visible height and accepts touches across the minimum target', async ({
    page,
  }, testInfo) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/_demo/foundation');
    const button = page.getByRole('button', { name: 'Küçük', exact: true });
    await expect(button).toHaveAttribute('data-hit-ok', '1');
    await button.scrollIntoViewIfNeeded();

    const measure = () =>
      button.evaluate((element) => {
        const box = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        const target = getComputedStyle(element, '::after');
        return {
          visibleHeight: box.height,
          targetHeight: parseFloat(target.height),
          targetWidth: parseFloat(target.width),
          minimum: parseFloat(style.getPropertyValue('--hit-target')),
          centerX: box.x + box.width / 2,
          centerY: box.y + box.height / 2,
        };
      });

    const before = await measure();
    await testInfo.attach('touch-target', {
      body: JSON.stringify(before, null, 2),
      contentType: 'application/json',
    });
    expect(before.visibleHeight).toBe(36);
    expect(before.minimum).toBe(48);
    expect(before.targetHeight).toBeGreaterThanOrEqual(before.minimum);
    expect(before.targetWidth).toBeGreaterThanOrEqual(before.minimum);

    await button.evaluate((element) => {
      element.addEventListener('click', (event) => {
        if (event.isTrusted) {
          element.setAttribute(
            'data-trusted-clicks',
            String(Number(element.getAttribute('data-trusted-clicks') ?? 0) + 1),
          );
        }
      });
    });

    for (const direction of [-1, 1]) {
      const y = before.centerY + direction * (before.minimum / 2 - 0.5);
      expect(
        await button.evaluate(
          (element, point) => element.contains(document.elementFromPoint(point.x, point.y)),
          { x: before.centerX, y },
        ),
      ).toBe(true);
      await page.touchscreen.tap(before.centerX, y);
    }
    await expect(button).toHaveAttribute('data-trusted-clicks', '2');
    expect((await measure()).visibleHeight).toBe(before.visibleHeight);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
    ).toBe(false);
    await testInfo.attach('foundation', {
      body: await page.screenshot(),
      contentType: 'image/png',
    });
  });
});
