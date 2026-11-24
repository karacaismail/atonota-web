import { describe, expect, it } from 'vitest';

import { mockWorkerOptions } from './worker-url';

describe('sahte sunucu işçisi: panel yolu', () => {
  it('kök yolda işçi kökten yüklenir', () => {
    expect(mockWorkerOptions('/')).toEqual({
      url: '/mockServiceWorker.js',
      options: { scope: '/' },
    });
  });

  it('/panel/ yolunda işçi ve kapsamı /panel/ altındadır', () => {
    expect(mockWorkerOptions('/panel/')).toEqual({
      url: '/panel/mockServiceWorker.js',
      options: { scope: '/panel/' },
    });
  });
});
