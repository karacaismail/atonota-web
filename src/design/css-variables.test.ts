import { afterEach, describe, expect, it } from 'vitest';

import {
  DESIGN_STYLE_ID,
  buildDesignCss,
  darkVariables,
  ensureDesignStyles,
  rootVariables,
} from './css-variables';
import { designSource } from './source';

describe('CSS değişkenleri', () => {
  afterEach(() => {
    document.getElementById(DESIGN_STYLE_ID)?.remove();
  });

  it('kök değişkenler kaynak kararlarını taşır', () => {
    const vars = rootVariables();
    expect(vars['--radius']).toBe(`${designSource.radius.default}px`);
    expect(vars['--btn-h-md']).toBe(`${designSource.sizes.md.button.height}px`);
    expect(vars['--color-primary']).toBe(designSource.primary.color);
    expect(vars['--hit-expand']).toBe(String(designSource.hitArea.expand));
    expect(vars['--shadow-input']).toBe(designSource.derived.shadowCss.input);
    expect(vars['--motion-duration-dropdown']).toBe('500ms');
    expect(vars['--focus-dim-color']).toBe('rgba(100,116,139,0.33)');
  });

  it('koyu tema gölgeleri ve perde rengini değiştirir', () => {
    const vars = darkVariables();
    expect(vars['--shadow-input']).toBe(designSource.derived.shadowCssDark.input);
    expect(vars['--focus-dim-color']).toBe('rgba(50,58,70,0.66)');
    expect(vars['--primary-bg']).toBe('rgba(0,170,204,0.14)');
  });

  it('kaynaktaki dokunma alanı CSS’ini aynen içerir', () => {
    expect(buildDesignCss()).toContain(designSource.hitArea.css);
  });

  it('çevreleyen odak halkasını kapatır ve klavye modunda alt çizgi verir', () => {
    const css = buildDesignCss();
    expect(css).toContain(':focus-visible { outline: none; }');
    expect(css).toContain('html[data-focus-mode="keyboard"] :focus-visible { box-shadow: inset 0');
    expect(css).toContain('@media (forced-colors: active)');
  });

  it('reduced motion bloğu içerir', () => {
    expect(buildDesignCss()).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('stil öğesini bir kez ekler', () => {
    const a = ensureDesignStyles();
    const b = ensureDesignStyles();
    expect(a).toBe(b);
    expect(document.querySelectorAll(`#${DESIGN_STYLE_ID}`)).toHaveLength(1);
    expect(a.textContent).toContain('--radius: 5px');
  });
});
