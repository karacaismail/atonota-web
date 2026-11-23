import { expect, test } from '../../../../tests/setup/playwright-fixtures';
import type { Locator, Page } from '@playwright/test';

// Ortak deneme yolu (AGENTS.md, src/shell/routes.ts). Yalnız e2e derlemesinde açılır.
const demo = '/_demo/controls';

async function box(locator: Locator) {
  const bounds = await locator.boundingBox();
  if (!bounds) throw new Error('Expected an element with a visible layout box');
  return bounds;
}

test.beforeEach(async ({ page }) => {
  await page.goto(demo);
  await expect(page.getByRole('button', { name: 'İşlemler' })).toBeVisible();
});

const standardEasing = 'cubic-bezier(0.65, 0, 0.35, 1)';
// Foundation decision 5: the shared fast, mid and slow durations (src/design/motion.ts).
const sharedDurations = [100, 200, 300];

/** Turns on keyboard focus mode with a real Tab press, then focuses the target. */
async function keyboardFocus(page: Page, target: Locator) {
  await page.getByRole('button', { name: 'İşlemler' }).focus();
  await page.keyboard.press('Tab');
  await target.focus();
}

interface Run {
  property: string;
  duration: number;
  easing: string;
}

/**
 * Starts recording every CSS transition that begins inside `scope`. Each run is read at its
 * `transitionrun` event, so a short transition cannot finish before it is measured.
 */
async function recordTransitions(scope: Locator) {
  await scope.evaluate((element) => {
    const runs: Run[] = [];
    (window as unknown as { __runs: Run[] }).__runs = runs;
    element.addEventListener('transitionrun', (raw) => {
      const event = raw as TransitionEvent;
      const target = event.target;
      if (!(target instanceof Element)) return;
      for (const animation of target.getAnimations({ subtree: true })) {
        if (!(animation instanceof CSSTransition)) continue;
        if (animation.transitionProperty !== event.propertyName) continue;
        const effect = animation.effect as KeyframeEffect | null;
        if (effect?.target !== target || (effect.pseudoElement ?? '') !== event.pseudoElement) {
          continue;
        }
        const timing = effect.getComputedTiming();
        runs.push({
          property: `${target.className} ${event.pseudoElement} ${event.propertyName}`,
          duration: Number(timing.duration ?? 0),
          easing: timing.easing ?? '',
        });
      }
    });
  });
  return {
    count: () =>
      scope.page().evaluate(() => (window as unknown as { __runs: Run[] }).__runs.length),
    take: () =>
      scope.page().evaluate(() => {
        const store = window as unknown as { __runs: Run[] };
        return store.__runs.splice(0);
      }),
  };
}

/** Reads the CSS transitions that are still running inside `target`. */
async function transitions(target: Locator) {
  return target
    .evaluate((element) =>
      element
        .getAnimations({ subtree: true })
        .filter((animation) => animation instanceof CSSTransition),
    )
    .then((list) => list.length);
}

test('controls match the locked height and font size', async ({ page }) => {
  for (const [size, height, fontSize] of [
    ['small', 36, 14],
    ['middle', 42, 16],
    ['large', 48, 18],
  ] as const) {
    const row = page.getByTestId(`row-${size}`);
    for (const [surface, text] of [
      ['.ant-btn', '.ant-btn'],
      ['.ant-input-affix-wrapper', '.ant-input'],
      ['.ant-select-selector', '.ant-select-selection-item'],
      ['.ant-input-number', '.ant-input-number-input'],
    ] as const) {
      await expect(row.locator(surface), `${size} ${surface}`).toHaveCSS('height', `${height}px`);
      await expect(row.locator(text), `${size} ${text}`).toHaveCSS('font-size', `${fontSize}px`);
    }
    await expect(page.getByTestId(`link-${size}`)).toHaveCSS('font-size', `${fontSize}px`);
  }

  await expect(page.getByTestId('card')).toHaveCSS('border-radius', '10px');
});

test('choice controls match the locked height and font size', async ({ page }) => {
  // Source: control-size-config.json choice.C3 and the per-control antdTheme blocks.
  for (const [control, height, fontSize] of [
    ['.ant-checkbox-wrapper', 32, 14],
    ['.ant-radio-button-wrapper', 32, 14],
    ['.atonota-switch', 28, 14],
    ['.ant-switch', 24, 14],
    ['.ant-segmented', 32, 16],
    ['.ant-tag', 24, 12],
  ] as const) {
    const target = page.locator('.controls-demo').locator(control).first();
    await expect.soft(target, control).toHaveCSS('height', `${height}px`, { timeout: 1000 });
    await expect.soft(target, control).toHaveCSS('font-size', `${fontSize}px`, { timeout: 1000 });
  }
  await expect(page.locator('.controls-demo-row').first().locator('.ant-checkbox-inner')).toHaveCSS(
    'width',
    '20px',
  );
  for (const control of ['.ant-checkbox-wrapper', '.ant-radio-button-wrapper', '.ant-switch']) {
    await expect(page.locator('.controls-demo').locator(control).first(), control).toHaveClass(
      /\bhit\b/,
    );
  }
});

for (const style of ['İşlemler', 'shortcut', 'described', 'selectable', 'searchable']) {
  test(`${style} menu handles arrows, Space, Enter and Escape`, async ({ page }) => {
    const trigger = page.getByRole('button', { name: style, exact: true });
    await trigger.focus();
    await page.keyboard.press('Space');

    const menu = page.getByRole('menu');
    const role = style === 'selectable' ? 'menuitemradio' : 'menuitem';
    const edit = menu.getByRole(role, { name: /^Düzenle/ });
    const copy = menu.getByRole(role, { name: /^Kopyala/ });
    if (style === 'selectable') {
      await expect(edit).toHaveAttribute('aria-checked', 'false');
      await expect(copy).toHaveAttribute('aria-checked', 'true');
    }
    if (style === 'searchable') {
      await expect(page.getByRole('textbox', { name: 'Menüde ara' })).toBeFocused();
      await page.keyboard.press('ArrowDown');
    }
    await expect(edit).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(copy).toBeFocused();
    await page.keyboard.press('ArrowUp');
    await expect(edit).toBeFocused();
    await page.keyboard.press('Space');
    await expect(page.getByTestId('action')).toHaveText('edit');
    await expect(trigger).toBeFocused();

    await page.keyboard.press('Enter');
    if (style === 'searchable') {
      await page.getByRole('textbox', { name: 'Menüde ara' }).fill('KOPYALA');
      await expect(edit).toHaveCount(0);
      await page.keyboard.press('ArrowDown');
    } else {
      await expect(edit).toBeFocused();
      await page.keyboard.press('ArrowDown');
    }
    await expect(copy).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('action')).toHaveText('copy');

    await page.keyboard.press('Enter');
    await expect(menu).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(trigger).toBeFocused();
  });
}

test('Tab enables a single focus indicator and pointer input turns it off', async ({
  page,
  browserName,
}) => {
  const trigger = page.getByRole('button', { name: 'İşlemler' });
  const next = page.getByRole('button', { name: 'shortcut' });
  await trigger.focus();
  if (browserName === 'webkit') {
    await page.keyboard.press('Tab');
    await trigger.focus();
  }
  await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
  await expect(next).toBeFocused();
  await expect(next).toHaveCSS('outline-style', 'none');
  const indicator = () => next.evaluate((element) => getComputedStyle(element, '::before').content);
  expect(await indicator()).toBe('""');
  await page.keyboard.press(browserName === 'webkit' ? 'Alt+Shift+Tab' : 'Shift+Tab');
  await expect(trigger).toBeFocused();
  await next.click();
  await expect(next).toHaveCSS('outline-style', 'none');
  expect(await indicator()).toBe('none');
});

test('dropdown animation uses the shared motion and honors reduced motion', async ({ page }) => {
  const trigger = page.getByRole('button', { name: 'İşlemler' });
  const popup = page.locator('.atonota-dropdown-popup');
  await trigger.click();
  await expect(popup).toHaveCSS('animation-name', 'atonota-dropdown-in');
  await expect(popup).toHaveCSS('animation-duration', '0.5s');
  await expect(popup).toHaveCSS('animation-timing-function', 'cubic-bezier(0.2, 0.9, 0.3, 1.15)');
  await page.keyboard.press('Escape');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(popup).toHaveCSS('animation-name', 'atonota-dropdown-out');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await trigger.click();
  await expect(popup).toHaveCSS('animation-name', 'none');
});

test('open menu with long text stays inside the viewport', async ({ page }) => {
  await page.getByRole('button', { name: 'İşlemler' }).click();
  const item = page.getByRole('menuitem', { name: /Bu kaydın daha önce/ });
  await expect(item).toBeVisible();
  const popup = page.locator('.atonota-dropdown-popup');
  await expect(popup).toHaveCSS('animation-name', 'atonota-dropdown-in');
  await expect(popup).toHaveCSS('animation-name', 'none');
  const bounds = await box(item);
  const popupBounds = await box(popup);
  const width = await page.evaluate(() => window.innerWidth);
  for (const area of [popupBounds, bounds]) {
    expect(area.x).toBeGreaterThanOrEqual(0);
    expect(area.x + area.width).toBeLessThanOrEqual(width);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    width,
  );
});

test('select joins its popup and form controls retain the inset shadow', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const row = page.getByTestId('row-small');
  const selector = row.locator('.ant-select-selector');
  await selector.click();
  const popup = page.locator('.atonota-select-popup');
  await expect(popup).toBeVisible();
  const above = (await popup.getAttribute('class'))?.includes('placement-top');
  await expect(selector).toHaveCSS(
    above ? 'border-top-left-radius' : 'border-bottom-left-radius',
    '0px',
  );
  const selectorBounds = await box(selector);
  const popupBounds = await box(popup);
  const gap = above
    ? selectorBounds.y - popupBounds.y - popupBounds.height
    : popupBounds.y - selectorBounds.y - selectorBounds.height;
  expect(Math.abs(gap)).toBeLessThanOrEqual(1);
  for (const surface of [
    selector,
    row.locator('.ant-input-affix-wrapper'),
    row.locator('.ant-input-number'),
  ]) {
    await expect(surface).toHaveCSS('box-shadow', /inset/);
  }
  await popup.getByText('Kapalı', { exact: true }).click();
  await expect(selector).toHaveText('Kapalı');
  await expect(popup).toBeHidden();
});

test('split actions stay separate and use the shared hit-area engine', async ({
  page,
  hasTouch,
}) => {
  const primary = page.getByRole('button', { name: 'Dışa aktar', exact: true });
  const trigger = page.getByRole('button', { name: 'Dışa aktarma seçenekleri' });
  await expect(primary).toHaveClass(/\bhit\b/);
  const extension = await primary.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      desiredHeight: rect.height * 0.06,
      top: parseFloat(style.getPropertyValue('--hit-t')) - parseFloat(style.borderTopWidth),
      right: parseFloat(style.getPropertyValue('--hit-r')) - parseFloat(style.borderRightWidth),
    };
  });
  expect(extension.top).toBeCloseTo(extension.desiredHeight, 1);
  expect(extension.right).toBeCloseTo(0, 1);
  await expect(page.locator('.ant-input-affix-wrapper').first()).toHaveClass(/\bhit\b/);
  await expect(page.locator('.atonota-number').first()).toHaveClass(/\bhit\b/);
  await expect(page.getByTestId('link-small')).toHaveClass(/\bhit\b/);
  const bounds = await box(primary);
  const pointer = hasTouch ? page.touchscreen : page.mouse;
  if ('tap' in pointer) await pointer.tap(bounds.x + bounds.width / 2, bounds.y - 1);
  else await pointer.click(bounds.x + bounds.width / 2, bounds.y - 1);
  await expect(page.getByTestId('action')).toHaveText('export');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await trigger.click();
  await page.getByRole('menuitem', { name: 'Düzenle' }).click();
  await expect(page.getByTestId('action')).toHaveText('edit');
});

test('form surfaces retain the shared inset shadow in dark mode', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const row = page.getByTestId('row-small');
  for (const control of ['.ant-input-affix-wrapper', '.ant-select-selector', '.ant-input-number']) {
    await expect(row.locator(control)).toHaveCSS(
      'box-shadow',
      /inset rgb\(0, 0, 0\)|rgb\(0, 0, 0\).*inset/,
    );
  }
});

test('forced colors outlines the focused control only in keyboard mode', async ({
  page,
  browserName,
}) => {
  test.skip(browserName === 'webkit', 'Playwright WebKit on macOS does not emulate forced colors');
  await page.emulateMedia({ forcedColors: 'active' });
  const trigger = page.getByRole('button', { name: 'İşlemler' });
  const next = page.getByRole('button', { name: 'shortcut' });
  await trigger.focus();
  await expect(trigger).toHaveCSS('outline-style', 'none');
  await page.keyboard.press('Tab');
  await expect(next).toBeFocused();
  await expect(next).toHaveCSS('outline-style', 'solid');
  await expect(next).toHaveCSS('outline-width', '2px');
  await next.click();
  await expect(next).toHaveCSS('outline-style', 'none');
});

for (const scheme of ['light', 'dark'] as const) {
  test(`danger menu item keeps 4.5:1 contrast on hover in ${scheme} mode`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', scheme);
    await page.getByRole('button', { name: 'İşlemler' }).click();
    const item = page.getByRole('menuitem', { name: 'Sil' });
    await item.hover();
    const colors = await item.evaluate((element) => {
      const style = getComputedStyle(element);
      return { text: style.color, background: style.backgroundColor };
    });
    const ratio = await page.evaluate(({ text, background }) => {
      const luminance = (value: string) => {
        const [r = 0, g = 0, b = 0] = (value.match(/[\d.]+/g) ?? []).slice(0, 3).map((part) => {
          const channel = Number(part) / 255;
          return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const [high = 0, low = 0] = [luminance(text), luminance(background)].sort((a, b) => b - a);
      return (high + 0.05) / (low + 0.05);
    }, colors);
    expect(colors.text).toBe('rgb(255, 255, 255)');
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
}

test('radio button label shows the keyboard focus underline without a ring', async ({ page }) => {
  const label = page
    .getByTestId('radio-buttons')
    .locator('.ant-radio-button-wrapper', { hasText: 'Birinci' });
  const input = label.locator('input');
  await keyboardFocus(page, input);
  await expect(input).toBeFocused();
  await expect(label).toHaveCSS('box-shadow', /inset/);
  await expect(label).toHaveCSS('box-shadow', /0px -2px 0px 0px/);
  await expect(label).toHaveCSS('outline-style', 'none');
  await label.click();
  await expect(label).not.toHaveCSS('box-shadow', /0px -2px 0px 0px/);
});

test('radio uses the 32 px card style from the source decision', async ({ page }) => {
  const group = page.getByTestId('radio-cards');
  const week = group.locator('.ant-radio-wrapper', { hasText: 'Haftalık' });
  const month = group.locator('.ant-radio-wrapper', { hasText: 'Aylık' });
  await expect(week).toHaveCSS('height', '32px');
  await expect(week).toHaveCSS('border-top-style', 'solid');
  await expect(week).toHaveCSS('border-top-width', '1px');
  await expect(week).toHaveCSS('border-radius', '5px');
  const primary = await week.evaluate((element) =>
    getComputedStyle(element).getPropertyValue('--ant-color-primary').trim(),
  );
  expect(primary).not.toBe('');
  const rgb = await page.evaluate((color) => {
    const probe = document.createElement('i');
    probe.style.color = color;
    document.body.append(probe);
    const value = getComputedStyle(probe).color;
    probe.remove();
    return value;
  }, primary);
  await expect(week).toHaveCSS('border-top-color', rgb);
  await expect(month).not.toHaveCSS('border-top-color', rgb);
  await expect(week).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(month).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await month.click();
  await expect(month).toHaveCSS('border-top-color', rgb);
});

test('switch is squared and shows its state text', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const control = page.getByRole('switch', { name: 'Etkin' });
  await expect(control).toHaveCSS('border-radius', '5px');
  await expect(control.locator('.ant-switch-handle')).toHaveCSS('border-radius', '0px');
  const handle = await control
    .locator('.ant-switch-handle')
    .evaluate((element) => getComputedStyle(element, '::before').borderRadius);
  expect(handle).toBe('3px');
  await expect(control).toHaveAttribute('aria-checked', 'false');
  await expect(control.locator('.ant-switch-inner-unchecked')).toHaveText('Kapalı');
  await expect(control.locator('.ant-switch-inner-unchecked')).toBeVisible();
  await control.click();
  await expect(control).toHaveAttribute('aria-checked', 'true');
  await expect(control.locator('.ant-switch-inner-checked')).toHaveText('Açık');
  await expect(control.locator('.ant-switch-inner-checked')).toBeVisible();
});

for (const scheme of ['light', 'dark'] as const) {
  test(`switch state text keeps 4.5:1 contrast in ${scheme} mode`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', scheme);
    const control = page.getByRole('switch', { name: 'Etkin' });
    for (const state of ['unchecked', 'checked'] as const) {
      if (state === 'checked') await control.click();
      await expect(control).toHaveAttribute('aria-checked', String(state === 'checked'));
      const text = control.locator(`.ant-switch-inner-${state}`);
      await expect(text).toBeVisible();
      await expect(control).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
      for (const interaction of ['rest', 'hover'] as const) {
        if (interaction === 'hover') await control.hover();
        else await page.mouse.move(0, 0);
        const ratio = await control.evaluate((element, which) => {
          const text = element.querySelector(`.ant-switch-inner-${which}`);
          if (!text) return 0;
          const parse = (value: string): number[] => {
            const srgb = value.startsWith('color(srgb ');
            const channels = (
              value.slice(srgb ? 'color(srgb '.length : value.indexOf('(') + 1).match(/[\d.]+/g) ??
              []
            ).map(Number);
            return srgb
              ? channels.map((channel, i) => (i < 3 ? channel * 255 : channel))
              : channels;
          };
          // First opaque background behind the switch; the canvas is white when none is set.
          let page = [255, 255, 255];
          for (let node = element.parentElement; node; node = node.parentElement) {
            const [r = 0, g = 0, b = 0, a = 1] = parse(getComputedStyle(node).backgroundColor);
            if (a === 1) {
              page = [r, g, b];
              break;
            }
          }
          const flatten = (value: string, base: number[]) => {
            const [r = 0, g = 0, b = 0, a = 1] = parse(value);
            return [r, g, b].map((c, i) => c * a + (base[i] ?? 255) * (1 - a));
          };
          const track = flatten(getComputedStyle(element).backgroundColor, page.slice(0, 3));
          const ink = flatten(getComputedStyle(text).color, track);
          const luminance = (rgb: number[]) => {
            const [r = 0, g = 0, b = 0] = rgb.map((part) => {
              const c = part / 255;
              return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
            });
            return 0.2126 * r + 0.7152 * g + 0.0722 * b;
          };
          const [high = 0, low = 0] = [luminance(ink), luminance(track)].sort((x, y) => y - x);
          return (high + 0.05) / (low + 0.05);
        }, state);
        const colors = await text.evaluate((element) => {
          const track = element.closest('.ant-switch');
          return `${getComputedStyle(element).color} on ${track ? getComputedStyle(track).backgroundColor : ''}`;
        });
        expect(ratio, `${scheme} ${state} ${interaction}: ${colors}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
}

test('choice transitions use the shared easing and duration in both directions', async ({
  page,
}) => {
  const cases = [
    { name: 'switch', root: page.getByRole('switch', { name: 'Etkin' }) },
    {
      name: 'radio card',
      root: page.getByTestId('radio-cards').locator('.ant-radio-wrapper', { hasText: 'Aylık' }),
      back: page.getByTestId('radio-cards').locator('.ant-radio-wrapper', { hasText: 'Haftalık' }),
    },
    {
      name: 'radio button',
      root: page.getByTestId('radio-buttons').locator('.ant-radio-button-wrapper', {
        hasText: 'İkinci',
      }),
      back: page.getByTestId('radio-buttons').locator('.ant-radio-button-wrapper', {
        hasText: 'Birinci',
      }),
    },
    {
      name: 'segmented',
      root: page.getByTestId('tabs').locator('.ant-segmented-item', { hasText: 'Ay' }),
      back: page.getByTestId('tabs').locator('.ant-segmented-item', { hasText: 'Gün' }),
    },
  ];
  for (const { name, root, back } of cases) {
    for (const [direction, target] of [
      ['forward', root],
      ['back', back ?? root],
    ] as const) {
      const scope = name === 'segmented' ? page.getByTestId('tabs') : root.locator('..');
      const recorder = await recordTransitions(scope);
      await target.click();
      await expect.poll(recorder.count).toBeGreaterThan(0);
      // Let every transition finish so the next click is not a shortened reversal.
      await expect.poll(() => transitions(scope)).toBe(0);
      const running = await recorder.take();
      expect(running.length, `${name} ${direction}: no transition ran`).toBeGreaterThan(0);
      for (const t of running) {
        expect(t.easing, `${name} ${direction} ${t.property}`).toBe(standardEasing);
        expect(sharedDurations, `${name} ${direction} ${t.property}`).toContain(t.duration);
      }
    }
  }
});

test('checkbox mark uses the shared transition in both directions', async ({ page }) => {
  const checkbox = page.getByRole('checkbox', { name: 'Seç', exact: true });
  const mark = page.locator('.atonota-checkbox', { has: checkbox }).locator('.ant-checkbox-inner');
  for (const checked of [true, false]) {
    await checkbox.setChecked(checked);
    const transition = await mark.evaluate((element) => {
      const style = getComputedStyle(element, '::after');
      return {
        easings: style.transitionTimingFunction.split(/,\s*(?![^()]*\))/),
        durations: style.transitionDuration.split(', '),
      };
    });
    for (const easing of transition.easings) expect(easing).toBe(standardEasing);
    for (const duration of transition.durations) {
      expect(sharedDurations).toContain(parseFloat(duration) * 1000);
    }
  }
});

test('choice transitions stop when reduced motion is on', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const control = page.getByRole('switch', { name: 'Etkin' });
  for (const target of [
    control,
    page.getByTestId('radio-cards').locator('.ant-radio-wrapper', { hasText: 'Aylık' }),
    page.getByTestId('radio-buttons').locator('.ant-radio-button-wrapper', { hasText: 'İkinci' }),
    page.getByTestId('tabs').locator('.ant-segmented-item', { hasText: 'Ay' }),
  ]) {
    const recorder = await recordTransitions(target.locator('..'));
    await target.click();
    await expect.poll(() => transitions(target.locator('..'))).toBe(0);
    for (const run of await recorder.take()) expect(run.duration, run.property).toBe(0);
  }
  await expect(control.locator('.ant-switch-handle')).toHaveCSS('transition-duration', '0s');
});

test('Tab and Shift+Tab close the menu and move to the next or previous control', async ({
  page,
  browserName,
}) => {
  const first = page.getByRole('button', { name: 'İşlemler', exact: true });
  const second = page.getByRole('button', { name: 'shortcut', exact: true });
  const menu = page.getByRole('menu');

  await first.focus();
  await page.keyboard.press('Enter');
  await expect(menu.getByRole('menuitem', { name: /^Düzenle/ })).toBeFocused();
  // WebKit uses Option+Tab to include buttons in its native tab order.
  await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
  await expect(menu).toBeHidden();
  await expect(second).toBeFocused();
  await expect(first).toHaveAttribute('aria-expanded', 'false');

  await page.keyboard.press('Enter');
  await expect(menu.getByRole('menuitem', { name: /^Düzenle/ })).toBeFocused();
  await page.keyboard.press(browserName === 'webkit' ? 'Alt+Shift+Tab' : 'Shift+Tab');
  await expect(menu).toBeHidden();
  await expect(first).toBeFocused();
  await expect(second).toHaveAttribute('aria-expanded', 'false');
});

test('Tab from the menu follows the native order past a hidden control', async ({
  page,
  browserName,
}) => {
  const first = page.getByRole('button', { name: 'İşlemler', exact: true });
  const second = page.getByRole('button', { name: 'shortcut', exact: true });
  await first.evaluate((trigger) => {
    const hidden = document.createElement('button');
    hidden.style.visibility = 'hidden';
    trigger.after(hidden);
  });

  await first.focus();
  await page.keyboard.press('Enter');
  const item = page.getByRole('menuitem', { name: /^Düzenle/ });
  await expect(item).toBeFocused();
  await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
  await expect(item).toBeHidden();
  await expect(second).toBeFocused();
});

test('unmodified Tab from the popup enables keyboard focus mode', async ({ page }) => {
  const trigger = page.getByRole('button', { name: 'İşlemler', exact: true });
  const html = page.locator('html');
  await trigger.click();
  const item = page.getByRole('menuitem', { name: /^Düzenle/ });
  await expect(item).toBeFocused();
  await expect(html).not.toHaveAttribute('data-focus-mode', 'keyboard');
  await page.keyboard.press('Tab');
  await expect(item).toBeHidden();
  await expect(html).toHaveAttribute('data-focus-mode', 'keyboard');
});
