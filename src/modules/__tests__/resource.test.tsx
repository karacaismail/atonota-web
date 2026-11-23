import { act, cleanup, render, screen } from '@testing-library/react';
import { useCallback } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { useRead } from '../data';
import { ModuleProvider } from '../runtime';
function Probe({ request }: { request: (signal: AbortSignal) => Promise<string> }) {
  const load = useCallback((signal: AbortSignal) => request(signal), [request]);
  const { state } = useRead(load, 'record');
  return <p>{state.status === 'ready' ? state.data : state.status}</p>;
}
afterEach(cleanup);
it('cancels the previous account request and ignores a response arriving after account change', async () => {
  let finish: (value: string) => void = () => undefined;
  let signal: AbortSignal | undefined;
  const first = vi.fn((value: AbortSignal) => {
    signal = value;
    return new Promise<string>((resolve) => {
      finish = resolve;
    });
  });
  const second = vi.fn().mockResolvedValue('new account record');
  const { rerender } = render(
    <ModuleProvider value={{ tenant: 'site-a', user: 'user-a', mode: 'example' }}>
      <Probe request={first} />
    </ModuleProvider>,
  );
  rerender(
    <ModuleProvider value={{ tenant: 'site-b', user: 'user-b', mode: 'example' }}>
      <Probe request={second} />
    </ModuleProvider>,
  );
  expect(signal?.aborted).toBe(true);
  expect(await screen.findByText('new account record')).toBeVisible();
  await act(async () => {
    finish('private old account record');
  });
  expect(screen.queryByText('private old account record')).not.toBeInTheDocument();
});
