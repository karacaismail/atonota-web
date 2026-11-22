import { useEffect, useState } from 'react';

import type { SampleRow } from '../sampleData';
import { sampleRows } from '../sampleData';

export type DemoState = 'normal' | 'live' | 'loading' | 'empty' | 'error';

export interface CollectionResult {
  status: 'loading' | 'ready' | 'error';
  rows: SampleRow[];
  /** Hata durumunda eski veri gösterilir ve işaretlenir. */
  stale: boolean;
  loadedAt: Date | null;
  reload: () => void;
}

const LOAD_MS = 250;

/**
 * Örnek veri kancası. Gerçek istek gibi davranır: gecikir ve iptal edilir.
 * `demo` değeri yalnız örnek sayfada veri durumunu göstermek içindir.
 */
export function useSampleCollection(doctype: string, demo: DemoState): CollectionResult {
  const [tick, setTick] = useState(0);
  const key = `${doctype}|${demo}|${tick}`;
  const [result, setResult] = useState<Omit<CollectionResult, 'reload'> & { key: string }>({
    key: '',
    status: 'loading',
    rows: [],
    stale: false,
    loadedAt: null,
  });

  useEffect(() => {
    const ctrl = new AbortController();
    if (demo === 'loading') return () => ctrl.abort();
    const id = window.setTimeout(() => {
      if (ctrl.signal.aborted) return;
      const rows = demo === 'empty' ? [] : sampleRows(doctype);
      if (demo === 'error') {
        setResult({ key, status: 'error', rows, stale: true, loadedAt: null });
      } else {
        setResult({ key, status: 'ready', rows, stale: false, loadedAt: new Date() });
      }
    }, LOAD_MS);
    return () => {
      ctrl.abort();
      window.clearTimeout(id);
    };
  }, [key, doctype, demo]);

  // Yanıt bu isteğe ait değilse veri yükleniyor sayılır. Eski yanıt yeni durumu ezmez.
  const current = result.key === key;
  return {
    status: current ? result.status : 'loading',
    rows: current ? result.rows : [],
    stale: current && result.stale,
    loadedAt: current ? result.loadedAt : null,
    reload: () => setTick((n) => n + 1),
  };
}

/** Canlı durumda son olaydan beri geçen saniye. Gerçek zamanla sayar. */
export function useSecondsSince(since: Date | null, active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return undefined;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [active]);
  if (!since) return 0;
  return Math.max(0, Math.floor((now - since.getTime()) / 1000));
}
