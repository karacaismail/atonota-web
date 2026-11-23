/**
 * Opening focus of the menu (Linux WebKit flake, 23 November 2026).
 * The menu moves focus into the popup one frame after it opens. On a slow device the person can
 * already be inside the popup by then: typing in the search box, or an arrow on an item.
 * That frame must not take focus back.
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ThemeModeProvider } from '@/app';

import { Dropdown } from '.';
import type { DropdownItem } from '.';

const items: DropdownItem[] = [
  { key: 'edit', label: 'Düzenle' },
  { key: 'copy', label: 'Kopyala' },
];

let frames: FrameRequestCallback[] = [];

beforeEach(() => {
  frames = [];
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    frames.push(callback);
    return frames.length;
  });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** Runs every waiting frame, including frames that the callbacks request. */
function flushFrames() {
  act(() => {
    for (let round = 0; round < 10 && frames.length > 0; round += 1) {
      const pending = frames;
      frames = [];
      for (const callback of pending) callback(performance.now());
    }
  });
}

function open(style: 'classic' | 'searchable') {
  render(
    <ThemeModeProvider initialChoice="light">
      <Dropdown label="Menü" style={style} items={items} onSelect={() => undefined} />
    </ThemeModeProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Menü' }));
}

describe('menu opening focus', () => {
  it('searchable: the first frame focuses the search box', () => {
    open('searchable');
    flushFrames();
    expect(screen.getByRole('textbox', { name: 'Menüde ara' })).toHaveFocus();
  });

  it('classic: the first frame focuses the first item', () => {
    open('classic');
    flushFrames();
    expect(screen.getByRole('menuitem', { name: 'Düzenle' })).toHaveFocus();
  });

  for (const style of ['classic', 'searchable'] as const) {
    it(`${style}: the first frame keeps focus that already moved into the popup`, () => {
      open(style);
      const copy = screen.getByRole('menuitem', { name: 'Kopyala' });
      act(() => copy.focus());
      flushFrames();
      expect(copy).toHaveFocus();
    });
  }
});

/**
 * The popup freezes its content while it leaves, so a rendered `aria-hidden={!open}` never updates.
 * A closed menu must leave the accessibility tree and the tab order at once, before its motion ends.
 */
describe('closed menu', () => {
  it('is aria-hidden and inert while its leave motion runs', () => {
    open('classic');
    flushFrames();
    const menu = screen.getByRole('menu');
    expect(menu.closest('[aria-hidden="true"]')).toBeNull();
    fireEvent.keyDown(screen.getByRole('menuitem', { name: 'Düzenle' }), { key: 'Escape' });
    expect(screen.getByRole('button', { name: 'Menü' })).toHaveAttribute('aria-expanded', 'false');
    expect(menu.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(menu.closest('[inert]')).not.toBeNull();
    expect(screen.queryByRole('menu')).toBeNull();
  });
});
