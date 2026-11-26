import type { ApiClient } from '@/api';
import { ApiError, userMessage } from '@/api';

import type { ShellHomeData } from './home-data';
import { HomeDataError } from './home-data';

/** Bilinmeyen hatanın metni. Ortak hata metinleriyle aynıdır. */
const UNKNOWN = 'Bir sorun çıktı. Daha sonra yeniden deneyin.';

function toHomeError(error: unknown): HomeDataError {
  return new HomeDataError(error instanceof ApiError ? userMessage(error) : UNKNOWN);
}

async function guarded<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    // İptal hatası olduğu gibi geçer. Sayfa iptali hata saymaz.
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw toHomeError(error);
  }
}

/** Ana sayfa bağlantısını ortak API istemcisinden kurar. */
export function createShellHomeData(
  api: Pick<ApiClient, 'getHomeSummary' | 'approveLeave' | 'rejectLeave'>,
): ShellHomeData {
  return {
    load: (signal) => guarded(() => api.getHomeSummary({ signal })),
    approve: ({ name, version }) =>
      guarded(async () => {
        await api.approveLeave(name, version, {});
      }),
    reject: ({ name, version }) =>
      guarded(async () => {
        await api.rejectLeave(name, version, {});
      }),
  };
}
