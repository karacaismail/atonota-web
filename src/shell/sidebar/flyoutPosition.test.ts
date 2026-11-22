import { describe, expect, it } from 'vitest';

import { flyoutPosition } from './flyoutPosition';

const base = { gap: 8, clampPadding: 8 };

describe('flyoutPosition', () => {
  it('F1: sidebar sağ kenarına 8 px boşlukla bitişir', () => {
    const p = flyoutPosition({
      ...base,
      anchor: { top: 200, height: 36 },
      sidebarRight: 288,
      flyoutHeight: 100,
      viewportHeight: 900,
    });
    expect(p.left).toBe(296);
  });

  it('F2: flyout merkezi üst öğe merkezine denk gelir', () => {
    const p = flyoutPosition({
      ...base,
      anchor: { top: 200, height: 36 },
      sidebarRight: 288,
      flyoutHeight: 100,
      viewportHeight: 900,
    });
    expect(p.top + 100 / 2).toBe(218);
    expect(p.caret).toBe(50);
  });

  it('F3: alttan taşmaz, ok yine üst öğeyi gösterir', () => {
    const p = flyoutPosition({
      ...base,
      anchor: { top: 860, height: 36 },
      sidebarRight: 288,
      flyoutHeight: 200,
      viewportHeight: 900,
    });
    expect(p.top).toBe(900 - 200 - 8);
    expect(p.top + p.caret).toBe(878);
  });

  it('F3: üstten taşmaz', () => {
    const p = flyoutPosition({
      ...base,
      anchor: { top: 4, height: 36 },
      sidebarRight: 68,
      flyoutHeight: 300,
      viewportHeight: 900,
    });
    expect(p.top).toBe(8);
    expect(p.top + p.caret).toBe(22);
  });

  it('flyout ekrandan uzunsa üstten başlar', () => {
    const p = flyoutPosition({
      ...base,
      anchor: { top: 400, height: 36 },
      sidebarRight: 288,
      flyoutHeight: 1200,
      viewportHeight: 600,
    });
    expect(p.top).toBe(8);
  });
});
