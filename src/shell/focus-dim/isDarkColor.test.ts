import { describe, expect, it } from 'vitest';

import { isDarkColor } from './isDarkColor';

describe('isDarkColor', () => {
  it('koyu palet yerleşim rengini koyu sayar', () => {
    expect(isDarkColor('#17171A')).toBe(true);
  });
  it('beyazı açık sayar', () => {
    expect(isDarkColor('#ffffff')).toBe(false);
  });
  it('tanınmayan biçimi açık sayar', () => {
    expect(isDarkColor('rgb(0,0,0)')).toBe(false);
  });
});
