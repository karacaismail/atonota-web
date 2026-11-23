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
    // Koyu birincil düğme zemini saydam değildir (türetilmiş karar 1).
    expect(vars['--primary-bg']).toMatch(/^#[0-9a-f]{6}$/);
    expect(vars['--primary-bg-hover']).toMatch(/^#[0-9a-f]{6}$/);
    expect(vars['--primary-bg-active']).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('koyu basılı düğme kuralı metni de %100 yapar (klavyeyle basılı durum)', () => {
    const css = buildDesignCss();
    const active = css
      .split('\n')
      .find((line) => line.includes('[data-theme="dark"] .ant-btn-primary') && line.includes(':active'));
    expect(active).toBeDefined();
    expect(active).toContain('background: var(--primary-bg-active)');
    expect(active).toContain('color: var(--primary-text-hover)');
  });

  it('birincil düğme kuralları tehlikeli (danger) düğmeyi dışarıda bırakır', () => {
    const rules = buildDesignCss()
      .split('\n')
      .filter((line) => line.includes('.ant-btn-primary') && !line.trim().startsWith('/*'));
    expect(rules.length).toBeGreaterThanOrEqual(5);
    for (const rule of rules) {
      expect(rule, rule).toContain('.ant-btn-primary:not(.ant-btn-dangerous)');
    }
    // antd düz düğmenin üzerine gelme metnini primaryColor yapar; tehlike düğmesi beyaz kalır.
    expect(rootVariables()['--danger-text']).toBe('#ffffff');
    expect(darkVariables()['--danger-text']).toBe('#ffffff');
    const dangerHover = buildDesignCss()
      .split('\n')
      .find((line) => line.includes('.ant-btn-dangerous.ant-btn-variant-solid') && line.includes(':hover'));
    expect(dangerHover).toBeDefined();
    expect(dangerHover).toContain(':active');
    expect(dangerHover).toContain('color: var(--danger-text)');
  });

  it('dar form sütunu değişkeni orta buton yüksekliğinin 10 katıdır', () => {
    const vars = rootVariables();
    expect(vars['--form-max-width']).toBe(`${designSource.sizes.md.button.height * 10}px`);
    expect(vars['--form-max-width']).toBe('420px');
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
