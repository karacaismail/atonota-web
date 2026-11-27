import { ArrowCounterClockwise, CheckCircle, Warning, XCircle } from '@phosphor-icons/react';
import { Alert, Button, Checkbox, Input } from 'antd';
import { useEffect, useId, useState } from 'react';

import type { ConfirmBlock, GenUIActionHandler, GenUIDecision } from '../types';
import { useGenuiStrings } from '../useGenuiStrings';
import { ChangeTable } from './ChangeTable';
import { useDecision } from './useDecision';

/** A browser timeout cannot exceed this number (about 24.8 days). */
const MAX_TIMEOUT_MS = 2_147_483_647;

/**
 * Returns `true` if the deadline has passed. If time runs out while the block is open,
 * the value updates by itself. State stores the expired time, so the old result does not
 * stay valid when a new deadline arrives.
 */
function useExpired(expiresAt: string | undefined): boolean {
  const at = expiresAt === undefined ? Number.NaN : Date.parse(expiresAt);
  const [expiredAt, setExpiredAt] = useState<number | null>(() =>
    Number.isFinite(at) && at <= Date.now() ? at : null,
  );
  useEffect(() => {
    if (!Number.isFinite(at)) return undefined;
    const left = Math.max(0, at - Date.now());
    if (left > MAX_TIMEOUT_MS) return undefined;
    const timer = window.setTimeout(() => setExpiredAt(at), left);
    return () => window.clearTimeout(timer);
  }, [at]);
  return Number.isFinite(at) && expiredAt === at;
}

/**
 * Fixed confirm screen (U4, AX-4, AX-6). It performs no operation itself.
 * It shows the operation summary and the changing fields as before and after.
 * Buttons are disabled while the chat is busy. The block locks only once the chat
 * accepts the decision. So the same decision is neither sent twice nor lost.
 * Every text comes from the UI language (AJA-1859). The server's button labels are not shown.
 * The decision sent to the chat carries only the block ID and the decision code. The text does not change it.
 */
export function ConfirmView({
  block,
  onAction,
  busy = false,
  decided,
}: {
  block: ConfirmBlock;
  onAction: GenUIActionHandler;
  busy?: boolean;
  decided?: GenUIDecision | undefined;
}) {
  const text = useGenuiStrings();
  const { decision, notice, locked, apply } = useDecision(decided);
  // An expired proposal cannot be approved. The server rejects it too.
  const expired = useExpired(block.expiresAt);
  const risk = block.risk ?? 'R1';
  const [checked, setChecked] = useState(false);
  const [typed, setTyped] = useState('');
  const inputId = useId();
  const noteId = useId();
  // Approve stays disabled until the R2 box or R3 name is done. Reject is open at every level.
  const nameOk = block.target !== undefined && typed.trim() === block.target.name.trim();
  const ready = risk === 'R1' || (risk === 'R2' ? checked : nameOk);

  const decide = (next: GenUIDecision) => {
    if (locked || busy || expired) return;
    if (next === 'approved' && !ready) return;
    apply(
      next,
      onAction({ kind: 'confirm', blockId: block.id, decision: next, title: block.title }),
    );
  };

  if (decision) {
    return (
      <section data-genui="confirm" className={`genui-card genui-done is-${decision}`}>
        {decision === 'approved' ? (
          <CheckCircle weight="fill" aria-hidden />
        ) : (
          <XCircle weight="fill" aria-hidden />
        )}
        <span role="status">{decision === 'approved' ? text.approvedNote : text.rejectedNote}</span>
        {/* The server has no undo. If the endpoint is advertised, only a new proposal is asked. */}
        {decision === 'approved' && block.undoProposal === true && (
          <Button
            className="genui-undo"
            icon={<ArrowCounterClockwise aria-hidden />}
            disabled={busy}
            onClick={() =>
              onAction({
                kind: 'ask',
                text: text.undoRequest(block.title),
              })
            }
          >
            {text.undoLabel}
          </Button>
        )}
      </section>
    );
  }

  return (
    <section
      data-genui="confirm"
      data-risk={risk}
      className={`genui-card genui-confirm${risk === 'R3' ? ' is-r3' : ''}`}
    >
      <header className="genui-card-h">
        <span className="genui-warn" aria-hidden>
          <Warning />
        </span>
        <strong>{block.title}</strong>
      </header>
      <p className="genui-summary">{block.summary}</p>
      <dl className="genui-facts">
        <dt>{text.riskLevel}</dt>
        <dd>
          <span className="genui-risk">{text.riskLabels[risk]}</span>
        </dd>
        {block.target && (
          <>
            <dt>{text.targetRecord}</dt>
            <dd>{block.target.label}</dd>
          </>
        )}
      </dl>
      <ChangeTable changes={block.changes} />
      {busy && <p className="genui-muted-text">{text.busyNote}</p>}
      {notice === 'busy' && <Alert type="error" showIcon message={text.failedNote} role="alert" />}
      {notice === 'used' && <Alert type="warning" showIcon message={text.usedNote} role="alert" />}
      {expired && !locked && (
        <div role="status">
          <strong>{text.expiredLabel}</strong>
          <p className="genui-muted-text">{text.expiredNote}</p>
        </div>
      )}
      {!locked && !expired && risk === 'R2' && (
        <Checkbox
          className="genui-check"
          checked={checked}
          disabled={busy}
          onChange={(event) => setChecked(event.target.checked)}
        >
          {text.r2Check}
        </Checkbox>
      )}
      {!locked && !expired && risk === 'R3' && block.target && (
        <div className="genui-type">
          <label htmlFor={inputId}>
            {text.r3Prompt} <strong>{block.target.name}</strong>
          </label>
          <Input
            id={inputId}
            autoComplete="off"
            spellCheck={false}
            value={typed}
            disabled={busy}
            aria-describedby={noteId}
            onChange={(event) => setTyped(event.target.value)}
          />
          <p id={noteId} className="genui-muted-text" role="status">
            {nameOk ? text.r3Ok : text.r3Hint}
          </p>
        </div>
      )}
      {!locked && !expired && (
        <div className="genui-actions">
          <Button
            type="primary"
            danger={(block.danger ?? false) || risk === 'R3'}
            disabled={busy || !ready}
            onClick={() => decide('approved')}
          >
            {text.approve}
          </Button>
          <Button disabled={busy} onClick={() => decide('rejected')}>
            {text.reject}
          </Button>
        </div>
      )}
    </section>
  );
}
