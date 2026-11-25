import { describe, expect, it } from 'vitest';

import { sampleRows } from './sampleData';

// G-132: Örnek kayıt adı kayıt adresine girer. Türkçe kural "i" harfini "İ" yapardı.
describe('sampleRows', () => {
  it('kayıt adı önekini dilden bağımsız büyütür', () => {
    expect(sampleRows('Price List', 1)[0]?.name).toBe('PRI-0001');
    expect(sampleRows('item', 1)[0]?.name).toBe('ITE-0001');
  });
});
