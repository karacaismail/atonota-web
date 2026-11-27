import { LocalizedXProvider } from '@/app/locale/LocalizedXProvider';
import { Typography } from 'antd';
import { useMemo } from 'react';

import { useViewData } from '@/shell/view-data';

import { MOCK_SOURCE } from '../agent';
import { AiStudio } from './AiStudio';
import { NOT_CONNECTED } from './content';
import { createFlowDemoTransport } from './flowDemo';

/** E2E build only: the mock transport is enabled. The production build has no such branch. */
const E2E = import.meta.env.MODE === 'e2e';

/** E2E build only: `?gecikme=<ms>` sets the mock stream's wait between two events. */
function e2eDelayMs(): number {
  if (!E2E || typeof window === 'undefined') return 0;
  const value = Number(new URLSearchParams(window.location.search).get('gecikme'));
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/** If there is no model gateway connection, the screen says so plainly. No fake progress is shown. */
function NotConnected() {
  return (
    <section className="ai-not-connected" aria-labelledby="ai-not-connected-title">
      <Typography.Title level={1} id="ai-not-connected-title">
        {NOT_CONNECTED.title}
      </Typography.Title>
      <Typography.Paragraph>{NOT_CONNECTED.body}</Typography.Paragraph>
      <Typography.Paragraph>{NOT_CONNECTED.next}</Typography.Paragraph>
    </section>
  );
}

/**
 * AI Studio page. The shell lazy-loads this file at the `/panel/ai` route (`src/shell/routes.ts`).
 * The transport comes from the shell's data connection (`ShellViewData.ai`). The source name is shown on screen (AX-7).
 * With no connection, the live panel says the connection is not set up (`NOT_CONNECTED`). No mock agent runs.
 * The mock transport is enabled only in the e2e build and is labelled "Sahte sunucu" (mock server).
 * Browser tests delay the mock stream with `?gecikme=` while testing the cancel flow. Production has no such delay.
 */
export default function AiStudioPage() {
  const ai = useViewData()?.ai;
  const delayMs = e2eDelayMs();
  const mock = useMemo(
    () => (E2E && !ai ? createFlowDemoTransport(delayMs > 0 ? { delayMs } : {}) : undefined),
    [ai, delayMs],
  );
  return (
    <LocalizedXProvider>
      {ai ? (
        <AiStudio transport={ai.transport} source={ai.source} />
      ) : mock ? (
        <AiStudio transport={mock} source={MOCK_SOURCE} />
      ) : (
        <NotConnected />
      )}
    </LocalizedXProvider>
  );
}
