import { expect, test } from '../../../tests/setup/playwright-fixtures';

test.use({ hasTouch: true });

const choices = [
  { label: 'Açık', value: 'light' },
  { label: 'Koyu', value: 'dark' },
  { label: 'Sistem', value: 'system' },
] as const;

for (const choice of choices) {
  test(`theme target: ${choice.value} keeps its visible size and accepts edge taps`, async ({
    page,
  }, testInfo) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/_demo/foundation');
    const group = page.getByRole('radiogroup', { name: 'Tema' });
    const radio = group.getByRole('radio', { name: choice.label, exact: true });
    const item = group
      .locator('label')
      .filter({ has: page.getByRole('radio', { name: choice.label, exact: true }) });
    await expect(item).toHaveAttribute('data-hit-ok', '1');
    await page.evaluate(() => document.fonts.ready);
    await item.scrollIntoViewIfNeeded();

    const measurement = await item.evaluate((el) => {
      const box = el.getBoundingClientRect();
      const x = box.x + box.width / 2;
      const y = box.y + box.height / 2;
      const target = parseFloat(getComputedStyle(el).getPropertyValue('--hit-target'));
      const step = 0.25;
      const hitsItem = (px: number, py: number) => {
        const hit = document.elementFromPoint(px, py);
        return hit !== null && (hit === el || el.contains(hit));
      };
      const extent = (dx: number, dy: number) => {
        let distance = 0;
        while (distance <= target && hitsItem(x + dx * distance, y + dy * distance)) {
          distance += step;
        }
        // Count only points that hit the item, excluding the first point outside it.
        return Math.max(0, distance - step);
      };
      return {
        target,
        visibleHeight: box.height,
        visibleWidth: box.width,
        hitHeight: extent(0, -1) + extent(0, 1),
        hitWidth: extent(-1, 0) + extent(1, 0),
      };
    });
    await testInfo.attach('hit-measurement', {
      body: JSON.stringify(measurement, null, 2),
      contentType: 'application/json',
    });
    if (choice.value === 'light') {
      await testInfo.attach('theme-before-taps', {
        body: await page.screenshot(),
        contentType: 'image/png',
      });
    }
    expect(measurement.target).toBe(48);
    expect(measurement.visibleHeight).toBe(38);
    expect(measurement.hitHeight).toBeGreaterThanOrEqual(measurement.target);
    expect(measurement.hitWidth).toBeGreaterThanOrEqual(measurement.target);

    // Reset the selection before each tap so both expanded edges must activate it.
    const other = choice.value === 'light' ? choices[1] : choices[0];
    for (const direction of [-1, 1]) {
      await group.getByText(other.label, { exact: true }).tap();
      await expect(radio).not.toBeChecked();
      const box = await item.boundingBox();
      if (!box) throw new Error('Theme choice has no visible box');
      await page.touchscreen.tap(
        box.x + box.width / 2,
        box.y + box.height / 2 + direction * (measurement.target / 2 - 0.5),
      );
      await expect(radio).toBeChecked();
      expect(await page.evaluate(() => localStorage.getItem('atonota.theme-mode'))).toBe(
        choice.value,
      );
      const selectedBox = await item.boundingBox();
      expect(selectedBox?.height).toBe(measurement.visibleHeight);
      expect(selectedBox?.width).toBe(measurement.visibleWidth);
    }
  });
}
