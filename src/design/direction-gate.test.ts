/**
 * Direction gate (IC-14, AJA-1364). New CSS uses logical direction properties.
 * Example: `margin-inline-start` instead of `margin-left`. Existing rules are on the allow list.
 * The tests were written before the code.
 */
import { describe, expect, it } from 'vitest';

import {
  applyAllowList,
  findDirectionViolations,
  isDirectionExempt,
  scanProject,
} from '../../scripts/direction-gate.mjs';
import pkg from '../../package.json';

describe('yön kapısı', () => {
  it.each([
    '.a { margin-left: 4px; }',
    '.a { margin-right: auto; }',
    '.a { padding-left: var(--space-2); }',
    '.a { padding-right: 0; }',
    '.a { border-left: 1px solid; }',
    '.a { border-right-width: 2px; }',
    '.a { left: 0; }',
    '.a { right: var(--x); }',
    '.a { text-align: left; }',
    '.a { text-align: right; }',
    '.a { float: left; }',
    '.a { border-top-left-radius: 4px; }',
    '.a { scroll-margin-left: 4px; }',
  ])('CSS dosyasında fiziksel yön özelliğini yakalar: %s', (css) => {
    expect(findDirectionViolations(css, 'src/shell/a.css')).toHaveLength(1);
  });

  it.each([
    '.a { margin-inline-start: 4px; }',
    '.a { padding-inline: 0; }',
    '.a { inset-inline-start: 0; }',
    '.a { text-align: start; }',
    '.a { border-inline-end: 1px solid; }',
    '.a { border-start-start-radius: 4px; }',
    '.a { margin: 0 auto; }',
    '.a { top: 0; bottom: 0; }',
    '.a { --space-left: 4px; }',
  ])('mantıksal özelliği geçirir: %s', (css) => {
    expect(findDirectionViolations(css, 'src/shell/a.css')).toEqual([]);
  });

  it('TSX satır içi stilinde fiziksel yön özelliğini yakalar', () => {
    expect(findDirectionViolations('<p style={{ marginLeft: 4 }} />', 'src/x/A.tsx')).toHaveLength(1);
    expect(findDirectionViolations("const s = { textAlign: 'right' };", 'src/x/a.ts')).toHaveLength(1);
    expect(findDirectionViolations('const css = `.a { padding-right: 0; }`;', 'src/x/a.ts')).toHaveLength(1);
  });

  it('TS kodundaki geometri adlarını yakalamaz', () => {
    expect(findDirectionViolations('const box = { left: 0, right: 10 };', 'src/x/a.ts')).toEqual([]);
    expect(findDirectionViolations('const w = cs.borderLeftWidth;', 'src/x/a.ts')).toEqual([]);
    expect(findDirectionViolations("const s = { marginInlineStart: 4 };", 'src/x/a.ts')).toEqual([]);
  });

  it('yorumdaki örneği yakalamaz', () => {
    expect(findDirectionViolations('/* margin-left yerine margin-inline-start */', 'src/a.css')).toEqual([]);
    expect(findDirectionViolations('// marginLeft: 4 yazmayın', 'src/a.ts')).toEqual([]);
  });

  it('test, e2e ve araç dosyaları kapsam dışıdır', () => {
    expect(isDirectionExempt('src/shell/a.test.ts')).toBe(true);
    expect(isDirectionExempt('src/shell/e2e/a.spec.ts')).toBe(true);
    expect(isDirectionExempt('src/testing/gilt/playwright.ts')).toBe(true);
    expect(isDirectionExempt('tests/setup/x.ts')).toBe(true);
    expect(isDirectionExempt('src/shell/shell.css')).toBe(false);
  });

  it('bugünkü depoda izin listesi dışında ihlal yoktur', () => {
    expect(scanProject(process.cwd()).violations).toEqual([]);
  });

  it('izinli dosyaya eklenen yeni fiziksel kural yine hata verir', () => {
    const allow = new Map([['src/shell/a.css', [{ bildirim: 'margin-left: auto', adet: 1 }]]]);
    const css = '.a { margin-left: auto; }\n.b { margin-left: 4px; }\n.c { margin-left: auto; }';
    const { violations, allowed } = applyAllowList(
      findDirectionViolations(css, 'src/shell/a.css'),
      allow,
    );
    expect(allowed).toHaveLength(1);
    expect(violations.map((v) => v.text)).toEqual(['margin-left: 4px', 'margin-left: auto']);
  });

  it('kapı npm run lint içinde koşar', () => {
    expect(pkg.scripts['check:direction']).toBe('node scripts/direction-gate.mjs');
    expect(pkg.scripts.lint).toContain('npm run check:direction');
  });
});
