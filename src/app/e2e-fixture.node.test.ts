// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

import { isGuardedUrl } from '../../tests/setup/dis-istek';

const ROOT = join(import.meta.dirname, '..', '..');

function specFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return specFiles(path);
    return entry.name.endsWith('.spec.ts') ? [path] : [];
  });
}

/** Tarayıcı testleri `test` ve `expect` değerlerini ortak fixture'dan alır. */
describe('tarayıcı testi gerçek sunucu koruması', () => {
  const specs = [...specFiles(join(ROOT, 'src')), ...specFiles(join(ROOT, 'tests', 'e2e'))];

  it('tarayıcı testi dosyaları bulunur', () => {
    expect(specs.length).toBeGreaterThan(10);
  });

  it('hiçbir tarayıcı testi test değerini doğrudan @playwright/test paketinden almaz', () => {
    const direct = specs.filter((file) =>
      /^import\s+(?!type\b)[^;]*from\s+'@playwright\/test';/m.test(readFileSync(file, 'utf8')),
    );
    expect(direct.map((file) => relative(ROOT, file))).toEqual([]);
  });

  it('her tarayıcı testi ortak fixture dosyasını içe aktarır', () => {
    const missing = specs.filter(
      (file) =>
        !/from\s+'[./]+(?:tests\/)?setup\/playwright-fixtures'/.test(readFileSync(file, 'utf8')),
    );
    expect(missing.map((file) => relative(ROOT, file))).toEqual([]);
  });

  it('atonota.net ve alt alan adlarını korur', () => {
    expect(isGuardedUrl(new URL('https://api.login.atonota.net/realms/platform'))).toBe(true);
    expect(isGuardedUrl(new URL('https://api.login.alpha.atonota.net/x'))).toBe(true);
    expect(isGuardedUrl(new URL('https://atonota.net/'))).toBe(true);
    expect(isGuardedUrl(new URL('http://atonota.net/'))).toBe(true);
  });

  it('yerel sunucuyu ve benzer adları korumaz', () => {
    expect(isGuardedUrl(new URL('http://127.0.0.1:4173/panel'))).toBe(false);
    expect(isGuardedUrl(new URL('https://notatonota.net/'))).toBe(false);
    expect(isGuardedUrl(new URL('https://atonota.net.example.test/'))).toBe(false);
  });
});
