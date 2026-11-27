import { Paperclip, ShieldCheck, Wrench } from '@phosphor-icons/react';
import { Tag } from 'antd';

import { GenUI } from '@/genui';

import type { AgentSource, AgentStep } from '../agent';
import { SIMULATED_TOOLS_NOTE, toEventsBlock } from './chain';
import { useStudioStrings } from './strings';

/**
 * Workspace on the right: tool operations, this conversation's file names and security.
 * Source and mode are always visible (AX-7).
 */
export function Workspace({
  steps,
  files,
  source,
}: {
  steps: AgentStep[];
  files: string[];
  source: AgentSource;
}) {
  const t = useStudioStrings();
  const events = toEventsBlock(steps);
  return (
    <aside className="ai-workspace" aria-label={t.workspace}>
      <section>
        <h2 className="ai-panel-h">
          <Wrench aria-hidden />
          {t.toolEvents}
        </h2>
        {events ? (
          <>
            {source.simulated && <p className="ai-note">{SIMULATED_TOOLS_NOTE}</p>}
            {/* Read-only surface. It produces no actions. */}
            <GenUI blocks={[events]} onAction={() => 'busy'} />
          </>
        ) : (
          <p className="ai-note">{t.noToolEvents}</p>
        )}
      </section>
      <section>
        <h2 className="ai-panel-h">
          <Paperclip aria-hidden />
          {t.conversationFiles}
        </h2>
        <p className="ai-note">{t.fileNameOnly}</p>
        {files.length > 0 ? (
          <ul className="ai-files">
            {files.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        ) : (
          <p className="ai-note">{t.noFiles}</p>
        )}
      </section>
      <section>
        <h2 className="ai-panel-h">
          <ShieldCheck aria-hidden />
          {t.security}
        </h2>
        <dl className="ai-facts">
          <dt>{t.source}</dt>
          <dd>
            <Tag bordered={false} color={source.simulated ? 'warning' : 'processing'}>
              {source.label}
            </Tag>
          </dd>
          <dt>{t.modeFact}</dt>
          <dd>{source.simulated ? t.trial : t.live}</dd>
          <dt>{t.actions}</dt>
          <dd>{t.noActionWithoutApproval}</dd>
        </dl>
      </section>
    </aside>
  );
}
