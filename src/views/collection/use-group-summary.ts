import { useEffect, useState } from 'react';
import { toCollectionError } from './api-source';
import { parseGroupSummary } from './summary';
import { CollectionError } from './types';
import type { CollectionSummarySource, GroupSummaryRequest, SummaryState } from './types';

/**
 * Reads the server summary. With no source or request, the state is `off`.
 * An old response does not change the new request's result. When the source changes, the old
 * summary is not shown. The request is aborted when the component unmounts.
 */
export function useGroupSummary(
  source: CollectionSummarySource | undefined,
  request: GroupSummaryRequest | undefined,
): SummaryState {
  const key = request ? JSON.stringify(request) : '';
  const [result, setResult] = useState<{
    key: string;
    source: CollectionSummarySource;
    state: SummaryState;
  }>();
  useEffect(() => {
    if (!source || !key) return undefined;
    // The request is rebuilt from the key. A new object with equal content starts no new request.
    const current = JSON.parse(key) as GroupSummaryRequest;
    const controller = new AbortController();
    source
      .groupSummary(current, controller.signal)
      .then((response) => {
        if (!controller.signal.aborted)
          setResult({
            key,
            source,
            state: { status: 'ready', summary: parseGroupSummary(response) },
          });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const mapped = toCollectionError(error, controller.signal);
        const unauthorized = mapped instanceof CollectionError && mapped.kind === 'unauthorized';
        setResult({ key, source, state: { status: unauthorized ? 'unauthorized' : 'error' } });
      });
    return () => {
      controller.abort();
    };
  }, [source, key]);
  if (!source || !request) return { status: 'off' };
  return result?.key === key && result.source === source ? result.state : { status: 'loading' };
}
