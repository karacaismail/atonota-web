// @vitest-environment node
// Check that keeps personal folder paths out of the repository.
//
// The repository is public. A test file once hard-coded the screenshot folder on a developer's
// computer. This check scans every text file tracked by Git.
// It catches the macOS user folder ("/Users/<name>/") and the Linux home folder ("/home/<name>/").
// Screenshot and temporary folders must come from an environment variable or the test output.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(import.meta.dirname, '..', '..');
// The pattern is written in parts, so this file does not match its own pattern.
const PERSONAL_PATH = new RegExp(
  ['/Use', 'rs/[A-Za-z0-9._-]+/|/ho', 'me/[A-Za-z0-9._-]+/'].join(''),
);
const SKIP = /\.(png|jpe?g|gif|webp|ico|woff2?|ttf|otf|pdf|zip)$|(^|\/)package-lock\.json$/;

function trackedFiles(): string[] {
  const result = spawnSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`git ls-files failed: ${result.stderr}`);
  return result.stdout.split('\0').filter((file) => file && !SKIP.test(file));
}

export function findPersonalPaths(files: string[], read: (file: string) => string): string[] {
  const hits: string[] = [];
  for (const file of files) {
    let text: string;
    try {
      text = read(file);
    } catch {
      continue; // File deleted but not yet committed.
    }
    text.split('\n').forEach((line, index) => {
      if (PERSONAL_PATH.test(line)) hits.push(`${file}:${index + 1}`);
    });
  }
  return hits;
}

describe('kişisel klasör yolu', () => {
  it('kalıp macOS ve Linux kullanıcı klasörünü yakalar', () => {
    const sample = ['/Use', 'rs/ornek/scratch', '\n/ho', 'me/ornek/x'].join('');
    expect(findPersonalPaths(['a.ts'], () => sample)).toEqual(['a.ts:1', 'a.ts:2']);
    expect(findPersonalPaths(['b.ts'], () => "const dir = process.env['SHOT_DIR'];")).toEqual([]);
  });

  it('Git dosyalarında kişisel klasör yolu yoktur', () => {
    const hits = findPersonalPaths(trackedFiles(), (file) =>
      readFileSync(join(ROOT, file), 'utf8'),
    );
    expect(hits).toEqual([]);
  });
});
