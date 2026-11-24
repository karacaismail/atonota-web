import { describe, expect, it } from 'vitest';

import { resolveBase } from '../../vite/base-path.ts';
import { appPathname, routerBasename } from './base-path';

describe('panel yolu: derleme ayarı', () => {
  it('üretim derlemesi ve önizleme /panel/ altında çalışır', () => {
    expect(resolveBase({ mode: 'production', env: {} })).toBe('/panel/');
  });

  it('yerel geliştirme ve e2e kök yolda çalışır', () => {
    expect(resolveBase({ mode: 'development', env: {} })).toBe('/');
    expect(resolveBase({ mode: 'e2e', env: {} })).toBe('/');
  });

  it('ATONOTA_BASE ayarı varsayılanı ezer; sonuna / eklenir', () => {
    expect(resolveBase({ mode: 'production', env: { ATONOTA_BASE: '/' } })).toBe('/');
    expect(resolveBase({ mode: 'development', env: { ATONOTA_BASE: '/panel' } })).toBe('/panel/');
  });

  it('güvensiz ATONOTA_BASE değeri reddedilir', () => {
    for (const bad of ['panel/', '//evil.example.test/', '/a/../b/', 'https://x.example.test/']) {
      expect(() => resolveBase({ mode: 'production', env: { ATONOTA_BASE: bad } })).toThrow();
    }
  });
});

describe('panel yolu: yönlendirici', () => {
  it('kök yolda basename yoktur', () => {
    expect(routerBasename('/')).toBeUndefined();
  });

  it('/panel/ yolunda basename /panel olur', () => {
    expect(routerBasename('/panel/')).toBe('/panel');
  });

  it('adres yolundan panel öneki çıkarılır', () => {
    expect(appPathname('/panel/atonota-login', '/panel/')).toBe('/atonota-login');
    expect(appPathname('/panel/', '/panel/')).toBe('/');
    expect(appPathname('/panel', '/panel/')).toBe('/');
    expect(appPathname('/atonota-login', '/')).toBe('/atonota-login');
  });

  it('önekle başlamayan yol değişmez; benzer önek eşleşmez', () => {
    expect(appPathname('/panelx/a', '/panel/')).toBe('/panelx/a');
  });
});
