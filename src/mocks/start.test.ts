import { describe, expect, it } from 'vitest';

import { mocksEnabled } from './start';

describe('mocksEnabled', () => {
  it.each([
    [{ DEV: true }, true],
    [{ DEV: true, VITE_API_MOCKS: 'off' }, false],
    [{ DEV: false }, false],
    [{ DEV: false, VITE_API_MOCKS: 'on' }, true],
    [{ DEV: false, VITE_API_MOCKS: 'yes' }, false],
  ])('%o için %s döner', (env, expected) => {
    expect(mocksEnabled(env)).toBe(expected);
  });
});
