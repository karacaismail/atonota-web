import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/api';
import type { ApiClient } from '@/api';

import { createShellHomeData } from './home-client';
import { HomeDataError, homeDataForModules } from './home-data';
import { createShellModuleEnvironment } from './modules';

function fakeApi(over: Partial<ApiClient> = {}) {
  return {
    getHomeSummary: vi.fn(() => Promise.resolve({ ok: true })),
    approveLeave: vi.fn(() => Promise.resolve({ name: 'ORNEK-IZIN-0003' })),
    rejectLeave: vi.fn(() => Promise.resolve({ name: 'ORNEK-IZIN-0003' })),
    ...over,
  } as unknown as ApiClient;
}

describe('createShellHomeData', () => {
  it('özet, onay ve ret isteklerini ortak istemciye iletir', async () => {
    const api = fakeApi();
    const home = createShellHomeData(api);
    const signal = new AbortController().signal;
    await home.load(signal);
    expect(api.getHomeSummary).toHaveBeenCalledWith({ signal });
    await home.approve({ name: 'ORNEK-IZIN-0003', version: 'v3' });
    expect(api.approveLeave).toHaveBeenCalledWith('ORNEK-IZIN-0003', 'v3', {});
    await home.reject({ name: 'ORNEK-IZIN-0003', version: 'v3' });
    expect(api.rejectLeave).toHaveBeenCalledWith('ORNEK-IZIN-0003', 'v3', {});
  });

  it('API hatasını kullanıcının okuyacağı cümleye çevirir', async () => {
    const api = fakeApi({
      approveLeave: vi.fn(() => Promise.reject(new ApiError({ kind: 'conflict', status: 417 }))),
    });
    const error = await createShellHomeData(api)
      .approve({ name: 'ORNEK-IZIN-0003', version: 'eski' })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(HomeDataError);
    expect((error as Error).message).toBe(
      'Bu kaydı başka biri değiştirdi. Kaydın son hâlini açın ve yeniden deneyin.',
    );
  });

  it('bilinmeyen hatada genel cümle yazar', async () => {
    const api = fakeApi({ getHomeSummary: vi.fn(() => Promise.reject(new Error('x'))) });
    const error = await createShellHomeData(api)
      .load(new AbortController().signal)
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(HomeDataError);
    expect((error as Error).message).toBe('Bir sorun çıktı. Daha sonra yeniden deneyin.');
  });

  it('modül ortamı kurulunca ana sayfa bağlantısı da kurulur', () => {
    const env = createShellModuleEnvironment({
      api: fakeApi(),
      tenant: 'ornek.test',
      user: 'kisi@example.test',
    });
    expect(homeDataForModules(env)).toBeDefined();
  });
});
