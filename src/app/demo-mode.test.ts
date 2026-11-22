import { describe, expect, it } from 'vitest';

import { DEMO_PATH_PREFIX, isDemoEnabled } from './demo-mode';

describe('deneme modu', () => {
  it('yalnız e2e modunda açıktır', () => {
    expect(isDemoEnabled('e2e')).toBe(true);
    expect(isDemoEnabled('production')).toBe(false);
    expect(isDemoEnabled('development')).toBe(false);
    expect(isDemoEnabled(undefined)).toBe(false);
  });
  it('deneme yolları /_demo/ altındadır', () => {
    expect(DEMO_PATH_PREFIX).toBe('/_demo/');
  });
});
