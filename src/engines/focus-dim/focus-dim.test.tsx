import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { designSource } from '@/design/source';
import { rootVariables } from '@/design/css-variables';

import {
  FOCUS_DIM_CLASS,
  activeFocusDimKeys,
  isFocusDimActive,
  resetFocusDim,
  setFocusDim,
  subscribeFocusDim,
} from './focus-dim';
import { FocusDimOverlay } from './FocusDimOverlay';
import { useFocusDim } from './useFocusDim';

describe('odak perdesi', () => {
  afterEach(() => {
    resetFocusDim();
  });

  it('kapalı başlar', () => {
    expect(isFocusDimActive()).toBe(false);
    expect(document.body.classList.contains(FOCUS_DIM_CLASS)).toBe(false);
  });

  it('bir anahtar açılınca perde iner', () => {
    setFocusDim('dropdown:1', true);
    expect(isFocusDimActive()).toBe(true);
    expect(document.body.classList.contains(FOCUS_DIM_CLASS)).toBe(true);
  });

  it('birden çok anahtar varken son anahtar kapanınca perde kalkar', () => {
    setFocusDim('a', true);
    setFocusDim('b', true);
    setFocusDim('a', false);
    expect(isFocusDimActive()).toBe(true);
    setFocusDim('b', false);
    expect(isFocusDimActive()).toBe(false);
    expect(document.body.classList.contains(FOCUS_DIM_CLASS)).toBe(false);
  });

  it('aynı anahtarı iki kez açmak tek kayıt tutar', () => {
    setFocusDim('a', true);
    setFocusDim('a', true);
    expect(activeFocusDimKeys()).toEqual(['a']);
    setFocusDim('a', false);
    expect(isFocusDimActive()).toBe(false);
  });

  it('aboneler değişimi duyar', () => {
    const spy = vi.fn();
    const off = subscribeFocusDim(spy);
    setFocusDim('x', true);
    expect(spy).toHaveBeenCalledWith(true, ['x']);
    off();
    setFocusDim('x', false);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('useFocusDim açıkken perdeyi açar, sökülünce kapatır', () => {
    function Panel({ open }: { open: boolean }) {
      useFocusDim(open, 'panel');
      return null;
    }
    const view = render(<Panel open />);
    expect(isFocusDimActive()).toBe(true);
    view.rerender(<Panel open={false} />);
    expect(isFocusDimActive()).toBe(false);
    view.rerender(<Panel open />);
    view.unmount();
    expect(isFocusDimActive()).toBe(false);
  });

  it('perde katmanı çizilir ve ekran okuyucudan gizlidir', () => {
    const { getByTestId } = render(<FocusDimOverlay />);
    expect(getByTestId('focus-dim-overlay')).toHaveAttribute('aria-hidden', 'true');
  });

  it('perde değerleri kaynak karardan gelir', () => {
    const vars = rootVariables();
    expect(vars['--focus-dim-blur']).toBe(`${designSource.focusDim.blur}px`);
    expect(vars['--motion-duration-focus-dim']).toBe(`${designSource.focusDim.duration}ms`);
    expect(vars['--motion-easing-standard']).toBe(designSource.focusDim.easing);
  });
});
