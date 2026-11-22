import { useCallback, useEffect, useRef, useState } from 'react';
export type FailureKind = 'forbidden' | 'expired' | 'invalid' | 'failure' | 'uncertain';
export function failureKind(error: unknown, writing = false): FailureKind {
  const kind =
    typeof error === 'object' && error !== null && 'kind' in error ? error.kind : undefined;
  if (kind === 'permission' || kind === 'forbidden') return 'forbidden';
  if (kind === 'session_expired' || kind === 'unauthenticated') return 'expired';
  if (
    kind === 'invalid_response' ||
    (error instanceof Error && error.message === 'invalid_response')
  )
    return writing ? 'uncertain' : 'invalid';
  return writing ? 'uncertain' : 'failure';
}
export type Resource<T> =
  | { status: 'loading' }
  | { status: 'unavailable' }
  | { status: 'error'; error: FailureKind }
  | { status: 'ready'; data: T };
export function useRead<T>(load: ((signal: AbortSignal) => Promise<T>) | null, key: string) {
  const [revision, setRevision] = useState(0);
  const requestKey = `${key}:${revision}`;
  const [result, setResult] = useState<{ key: string; state: Resource<T> }>();
  useEffect(() => {
    if (!load) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const data = await load(controller.signal);
        if (!controller.signal.aborted)
          setResult({ key: requestKey, state: { status: 'ready', data } });
      } catch (error) {
        if (!controller.signal.aborted)
          setResult({ key: requestKey, state: { status: 'error', error: failureKind(error) } });
      }
    })();
    return () => controller.abort();
  }, [load, requestKey]);
  const state: Resource<T> = !load
    ? { status: 'unavailable' }
    : result?.key === requestKey
      ? result.state
      : { status: 'loading' };
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  return { state, refresh };
}
export function useMutation() {
  const request = useRef<AbortController | null>(null);
  const [state, setState] = useState<
    { status: 'idle' | 'pending' | 'success' } | { status: 'error'; error: FailureKind }
  >({ status: 'idle' });
  useEffect(() => () => request.current?.abort(), []);
  async function run<T>(action: (signal: AbortSignal) => Promise<T>): Promise<T | undefined> {
    if (request.current) return undefined;
    const controller = new AbortController();
    request.current = controller;
    setState({ status: 'pending' });
    try {
      const result = await action(controller.signal);
      if (controller.signal.aborted) return undefined;
      setState({ status: 'success' });
      return result;
    } catch (error) {
      if (!controller.signal.aborted)
        setState({ status: 'error', error: failureKind(error, true) });
      return undefined;
    }
    // One write per review. A fresh read/remount is required after any outcome.
  }
  return { state, run };
}
