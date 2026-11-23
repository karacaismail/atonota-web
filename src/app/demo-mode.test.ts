import { describe, expect, it } from 'vitest';

import { DEMO_PATH_PREFIX, isDemoEnabled, isDemoPath } from './demo-mode';

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

  it('deneme yolunu tanır; bu yol koleksiyon sayfasına düşmez', () => {
    expect(isDemoPath('/_demo/foundation')).toBe(true);
    expect(isDemoPath('/_demo/ai')).toBe(true);
    expect(isDemoPath('/_demo/ai/alt?durum=hata')).toBe(true);
    expect(isDemoPath('/_demo')).toBe(false);
    expect(isDemoPath('/_demox/ai')).toBe(false);
    expect(isDemoPath('/satis/teklif')).toBe(false);
    expect(isDemoPath('/')).toBe(false);
  });
});
