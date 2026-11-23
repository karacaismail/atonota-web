import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ApiClient } from '@/api';
import { moduleRegistrations } from '@/modules';
import { useModule } from '@/modules/context';

import { lazyRoutes, menuEntries, modulePage, moduleRoutes, routeRegistry } from './routes';
import type { ShellViewData } from './view-data';
import { createShellModuleEnvironment, ViewDataProvider } from './view-data';

function EnvProbe() {
  const env = useModule();
  return <p>{env ? `ortam: ${env.tenant} ${env.user}` : 'ortam yok'}</p>;
}

async function renderModule(data: ShellViewData | null) {
  const load = vi.fn(() => Promise.resolve({ default: EnvProbe }));
  const mod = await modulePage(load)();
  const Page = mod.default;
  render(
    <ViewDataProvider value={data}>
      <Page />
    </ViewDataProvider>,
  );
  return load;
}

describe('modül rotaları', () => {
  it('her modül kaydı lazyRoutes listesinde Türkçe etiketle durur', () => {
    for (const m of moduleRegistrations) {
      const row = lazyRoutes.find((r) => r.path === m.path);
      expect(row, m.path).toBeDefined();
      expect(row?.label).toBe(m.label.tr);
      expect(row?.icon).toBeTruthy();
    }
    expect(moduleRoutes).toHaveLength(moduleRegistrations.length);
  });

  it('modül satırları koleksiyon yollarından önce gelir', () => {
    const paths = routeRegistry.map((r) => r.path);
    const list = paths.indexOf('/:module/:doctype');
    for (const m of moduleRegistrations) expect(paths.indexOf(m.path)).toBeLessThan(list);
  });

  it('modüller menüde görünür', () => {
    const labels = menuEntries(routeRegistry).map((r) => r.label);
    for (const m of moduleRegistrations) expect(labels).toContain(m.label.tr);
  });

  it('yükleyici tembeldir: sayfa yalnız load çağrılınca istenir', async () => {
    const load = vi.fn(() => Promise.resolve({ default: EnvProbe }));
    const lazyLoad = modulePage(load);
    expect(load).not.toHaveBeenCalled();
    await lazyLoad();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('modül sayfası ModuleProvider içinde açılır', async () => {
    await renderModule({
      modules: { tenant: 'ornek.atonota.net', user: 'ornek@example.com', mode: 'example' },
    });
    expect(screen.getByText('ortam: ornek.atonota.net ornek@example.com')).toBeInTheDocument();
  });

  it('modül ortamı yoksa sayfa açılmaz ve durum yazılır', async () => {
    await renderModule(null);
    expect(screen.queryByText(/^ortam/)).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Modül bağlantısı kurulmadı');
  });
});

describe('createShellModuleEnvironment', () => {
  it('istemciyi createModuleClient ile ortak API istemcisinden kurar', async () => {
    const getBootstrap = vi.fn(() =>
      Promise.resolve({
        user: { name: 'ornek@example.com', full_name: 'Örnek Kişi', roles: ['Employee'] },
      }),
    );
    const api = { getBootstrap } as unknown as ApiClient;
    const env = createShellModuleEnvironment({
      api,
      tenant: 'ornek.atonota.net',
      user: 'ornek@example.com',
    });
    expect(env.mode).toBe('live');
    expect(env.tenant).toBe('ornek.atonota.net');
    expect(env.user).toBe('ornek@example.com');
    await expect(env.client?.getProfile?.({})).resolves.toEqual({
      name: 'ornek@example.com',
      fullName: 'Örnek Kişi',
      roles: ['Employee'],
    });
    expect(getBootstrap).toHaveBeenCalledTimes(1);
  });
});
