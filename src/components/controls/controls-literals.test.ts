import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Components take every color, size, shadow and duration from the central tokens (AJA-998).
 * This test reads the controls sources and fails on a written value.
 */
const root = join(process.cwd(), 'src/components/controls');

function sources(dir: string, pattern: RegExp): { path: string; text: string }[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'e2e' ? [] : sources(path, pattern);
    if (!pattern.test(entry.name) || /\.test\.tsx?$/.test(entry.name)) return [];
    return [{ path, text: readFileSync(path, 'utf8') }];
  });
}

const withoutComments = (text: string) =>
  text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

/** The single allowed written value: the forced-colors focus outline (AGENT.md focus rule). */
const forcedColorsOutline = 'outline: 2px solid CanvasText;';

const writtenValue = [
  /#[0-9a-f]{3,8}\b/i,
  /\b(?:rgba?|hsla?|hwb|lab|lch|oklch|oklab)\(/i,
  /(?<![\w-])\d*\.?\d+(?:px|rem|em|ms|s|pt)\b/,
  // A viewport limit (`100vw`, `100dvh`) is layout, not a design value. Other amounts are values.
  /(?<![\w.-])(?!100[dsl]?v[hw])\d*\.?\d+[dsl]?v[hw]\b/,
  /cubic-bezier\(/,
];

const cssFiles = sources(root, /\.css$/);
const codeFiles = sources(root, /\.tsx?$/);

describe('controls take values from tokens', () => {
  it('finds the controls sources', () => {
    expect(cssFiles.map((file) => file.path.split('/').pop())).toContain('controls.css');
    expect(codeFiles.map((file) => file.path.split('/').pop())).toContain('ChoiceControls.tsx');
  });

  it('CSS writes no color, size, shadow or duration value', () => {
    for (const { path, text } of cssFiles) {
      const css = withoutComments(text).split(forcedColorsOutline).join('');
      for (const pattern of writtenValue) {
        expect(css.match(pattern)?.[0], `${path}: ${pattern}`).toBeUndefined();
      }
    }
  });

  it('components write no color, size or duration value', () => {
    for (const { path, text } of codeFiles) {
      const code = withoutComments(text);
      for (const pattern of writtenValue) {
        expect(code.match(pattern)?.[0], `${path}: ${pattern}`).toBeUndefined();
      }
      // A style or theme size written as a number, for example `gap: 4` or `fontSize: 12`.
      const numericSize =
        /\b(?:(?:min|max)?(?:Block|Inline)?Size|height|width|fontSize|gap|padding\w*|margin\w*|borderRadius\w*|lineHeight)\s*:\s*-?\d/i;
      expect(code.match(numericSize)?.[0], `${path}: numeric size`).toBeUndefined();
    }
  });

  it('only the popup panel uses a shadow token', () => {
    for (const { path, text } of cssFiles) {
      const used = [...withoutComments(text).matchAll(/var\((--shadow-[\w-]+)\)/g)].map(
        (match) => match[1],
      );
      expect(
        used.filter((name) => name !== '--shadow-dropdown'),
        path,
      ).toEqual([]);
    }
  });
});
