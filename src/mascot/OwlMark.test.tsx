import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { OwlMark } from './OwlMark';

function mockReducedMotion(reduced: boolean) {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        matches: query.includes('prefers-reduced-motion') ? reduced : false,
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      }) as MediaQueryList,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Baykuş maskotu', () => {
  it.each([22, 28, 48] as const)('%i px boyutunda çizilir', (size) => {
    mockReducedMotion(false);
    const { container } = render(<OwlMark size={size} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', String(size));
    expect(svg).toHaveAttribute('height', String(size));
  });

  it('gradyan kullanmaz', () => {
    mockReducedMotion(false);
    const { container } = render(<OwlMark />);
    expect(container.querySelector('linearGradient, radialGradient')).toBeNull();
    expect(container.innerHTML).not.toContain('url(#');
  });

  it('üç atom parçacığını token sürelerinde döndürür', () => {
    mockReducedMotion(false);
    const { container } = render(<OwlMark />);
    const motions = [...container.querySelectorAll('animateMotion')];
    expect(motions.map((m) => m.getAttribute('dur'))).toEqual(['3200ms', '3200ms', '2400ms']);
    expect(container.querySelector('svg')).not.toHaveClass('is-still');
  });

  it('azaltılmış harekette durur', () => {
    mockReducedMotion(true);
    const { container } = render(<OwlMark />);
    expect(container.querySelectorAll('animateMotion')).toHaveLength(0);
    expect(container.querySelector('svg')).toHaveClass('is-still');
    expect(container.querySelectorAll('[data-particle]')).toHaveLength(3);
  });

  it('etiket verilince resim olarak okunur, verilmezse gizlenir', () => {
    mockReducedMotion(false);
    const { container, rerender } = render(<OwlMark label="Atonota asistanı" />);
    expect(container.querySelector('svg')).toHaveAttribute('role', 'img');
    expect(container.querySelector('svg')).toHaveAttribute('aria-label', 'Atonota asistanı');
    rerender(<OwlMark />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});
