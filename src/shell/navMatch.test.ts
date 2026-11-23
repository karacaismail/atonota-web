import { describe, expect, it } from 'vitest';

import { isPathActive } from './navMatch';

describe('isPathActive', () => {
  it('ana sayfa yalnız kendi yolunda etkindir', () => {
    expect(isPathActive('/', '/')).toBe(true);
    expect(isPathActive('/', '/satis/teklif')).toBe(false);
  });

  it('alt yol etkin sayılır', () => {
    expect(isPathActive('/satis/teklif', '/satis/teklif')).toBe(true);
    expect(isPathActive('/satis/teklif', '/satis/teklif/TEK-0001')).toBe(true);
  });

  it('önek eşleşmesi etkin sayılmaz', () => {
    expect(isPathActive('/satis/teklif', '/satis/teklifler')).toBe(false);
  });

  it('sorgu parçası yok sayılır', () => {
    expect(isPathActive('/satis/teklif?gorunum=kanban', '/satis/teklif')).toBe(true);
  });
});
