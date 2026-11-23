import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { darkVariables, rootVariables } from '@/design';

const files = ['./controls.css', './demo/demo.css'].map((path) => ({
  path,
  css: readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8'),
}));

// antd CSS variables (cssVar enabled in the Foundation theme) and the hit-area engine's output.
const externalPrefixes = ['--ant-', '--hit-'];

describe('controls CSS', () => {
  it('defines no custom properties of its own', () => {
    for (const { path, css } of files) {
      expect(css.match(/(^|[;{\s])--[\w-]+\s*:/gm), path).toBeNull();
    }
  });

  it('uses only Foundation, antd or hit-area variables, without fallbacks', () => {
    const known = new Set([...Object.keys(rootVariables()), ...Object.keys(darkVariables())]);
    for (const { path, css } of files) {
      for (const [, name, rest] of css.matchAll(/var\((--[\w-]+)\s*([,)])/g)) {
        expect(rest, `${path}: ${name} has a fallback`).toBe(')');
        const external = externalPrefixes.some((prefix) => name?.startsWith(prefix) ?? false);
        expect(external || known.has(name ?? ''), `${path}: ${name} is not defined`).toBe(true);
      }
    }
  });
});
