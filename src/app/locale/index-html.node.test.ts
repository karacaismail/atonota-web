/** Before the script runs, the root element already carries the fallback language (IC-14, AJA-1364). */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

describe('index.html: betik çalışmadan önceki dil', () => {
  it('kök öğe yedek dille başlar: lang en-GB, dir ltr', () => {
    const source = readFileSync(join(process.cwd(), 'index.html'), 'utf8');
    expect(source).toMatch(/<html lang="en-GB" dir="ltr">/);
  });
});
