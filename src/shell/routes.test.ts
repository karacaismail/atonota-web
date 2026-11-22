import { describe, expect, it } from 'vitest';

import { menuEntries, routeRegistry, toRouteObjects } from './routes';

describe('routeRegistry', () => {
  it('her kayıt yol, menü etiketi, ikon ve yükleyici taşır', () => {
    expect(routeRegistry.length).toBeGreaterThan(0);
    for (const r of routeRegistry) {
      expect(Object.keys(r).sort()).toEqual(['icon', 'label', 'load', 'path']);
      expect(r.path.startsWith('/')).toBe(true);
      expect(r.label.trim()).not.toBe('');
      expect(r.icon).toBeTruthy();
      expect(typeof r.load).toBe('function');
    }
  });

  it('yollar tekildir', () => {
    const paths = routeRegistry.map((r) => r.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('her yükleyici varsayılan dışa aktarımda bir bileşen verir', async () => {
    for (const r of routeRegistry) {
      const mod = await r.load();
      expect(typeof mod.default).toBe('function');
    }
    // Sayfa modülleri antd yükler. jsdom içinde ilk yükleme yavaştır.
  }, 30_000);

  it('router kayıtları tembel yüklenir', () => {
    const objs = toRouteObjects(routeRegistry);
    expect(objs).toHaveLength(routeRegistry.length);
    for (const o of objs) {
      // React.lazy bileşeni. Kabuk beklemez, yalnız sayfa bekler.
      expect((o.Component as unknown as { $$typeof: symbol }).$$typeof).toBe(
        Symbol.for('react.lazy'),
      );
      expect('lazy' in o).toBe(false);
    }
  });

  it('menü yalnız parametresiz yolları gösterir', () => {
    const menu = menuEntries(routeRegistry);
    expect(menu.length).toBeGreaterThan(0);
    for (const m of menu) expect(m.path).not.toContain(':');
    expect(menu.map((m) => m.label)).toContain('Ana sayfa');
  });
});
