import { Alert, Button, Checkbox } from 'antd';
import { useCallback, useState } from 'react';
import {
  displayValue,
  parseApproval,
  parseProposal,
  parseProposalList,
  proposalCanRun,
  type Proposal,
} from '../contracts';
import { useMutation, useRead } from '../data';
import { useCopy } from '../messages';
import { useModule } from '../context';
import { DateValue, ModuleFrame, Pager, ResourceView, Section } from '../shared';

function ProposalReview({
  id,
  changed,
  close,
}: {
  id: string;
  changed: () => void;
  close: () => void;
}) {
  const env = useModule();
  const copy = useCopy();
  const get = env?.client?.getProposal;
  const load = useCallback(
    async (signal: AbortSignal) => {
      const proposal = parseProposal(await get?.(id, { signal }));
      if (proposal.proposal_id !== id) throw new Error('invalid_response');
      return proposal;
    },
    [get, id],
  );
  const read = useRead(get ? load : null, id);
  return (
    <section className="module-stack module-review" aria-label={copy.inspect}>
      <Button onClick={close}>{copy.close}</Button>
      <ResourceView state={read.state} retry={read.refresh}>
        {(proposal) => (
          <ProposalDecision
            key={`${proposal.proposal_id}:${proposal.digest}`}
            proposal={proposal}
            changed={changed}
          />
        )}
      </ResourceView>
    </section>
  );
}
function ProposalDecision({ proposal, changed }: { proposal: Proposal; changed: () => void }) {
  const env = useModule();
  const copy = useCopy();
  const action = useMutation();
  const [consent, setConsent] = useState(false);
  const [outcome, setOutcome] = useState<
    'proposalSuccess' | 'proposalDenied' | 'documentChanged' | 'proposalUnknown' | 'rejected'
  >();
  const runnable = proposalCanRun(proposal);
  async function approve() {
    const method = env?.client?.approveProposal;
    if (!method || !consent || !proposalCanRun(proposal)) return;
    const result = await action.run(async (signal) =>
      parseApproval(await method(proposal.proposal_id, proposal.digest, { signal })),
    );
    if (!result) return;
    setOutcome(
      result.deny_reason === 'document_changed'
        ? 'documentChanged'
        : result.proposal.result === 'unknown'
          ? 'proposalUnknown'
          : result.executed && result.proposal.result === 'succeeded'
            ? 'proposalSuccess'
            : 'proposalDenied',
    );
    changed();
  }
  async function reject() {
    const method = env?.client?.rejectProposal;
    if (!method || !proposalCanRun(proposal)) return;
    const result = await action.run(async (signal) =>
      parseProposal(await method(proposal.proposal_id, { signal })),
    );
    if (result) {
      setOutcome(result.status === 'rejected' ? 'rejected' : 'proposalDenied');
      changed();
    }
  }
  return (
    <div className="module-stack">
      <h2>{proposal.preview.summary}</h2>
      <dl>
        <dt>{copy.doctype}</dt>
        <dd>{proposal.target_doctype ?? copy.notProvided}</dd>
        <dt>{copy.record}</dt>
        <dd>{proposal.target_name ?? copy.notProvided}</dd>
        <dt>{copy.proposalId}</dt>
        <dd>{proposal.proposal_id}</dd>
        <dt>{copy.operation}</dt>
        <dd>{proposal.tool}</dd>
        <dt>{copy.created}</dt>
        <dd>
          <DateValue value={proposal.created_at} />
        </dd>
        <dt>{copy.expires}</dt>
        <dd>
          <DateValue value={proposal.expires_at} />
        </dd>
      </dl>
      {proposal.destructive && <Alert type="warning" message={copy.destructive} />}
      {proposal.billable && <Alert type="warning" message={copy.billable} />}
      {proposal.preview.changes.length > 0 && (
        <div className="module-scroll" tabIndex={0} role="region" aria-label={copy.changeDetails}>
          <table className="module-table">
            <thead>
              <tr>
                <th scope="col">{copy.field}</th>
                <th scope="col">{copy.before}</th>
                <th scope="col">{copy.after}</th>
              </tr>
            </thead>
            <tbody>
              {proposal.preview.changes.map((change, index) => (
                <tr key={`${change.fieldname}:${index}`}>
                  <th scope="row">{change.label}</th>
                  <td className="module-value">
                    {change.old === undefined
                      ? copy.notProvided
                      : change.old === ''
                        ? copy.emptyValue
                        : displayValue(change.old)}
                  </td>
                  <td className="module-value">
                    {change.new === undefined
                      ? copy.notProvided
                      : change.new === ''
                        ? copy.emptyValue
                        : displayValue(change.new)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {proposal.preview.details && (
        <Section title={copy.details}>
          <pre className="module-scroll module-value" tabIndex={0}>
            {displayValue(proposal.preview.details)}
          </pre>
        </Section>
      )}
      {proposal.result === 'unknown' ? (
        <Alert type="warning" message={copy.proposalUnknown} />
      ) : (
        !runnable && <Alert type="info" message={copy.proposalExpired} />
      )}
      {runnable && (
        <>
          <Checkbox
            checked={consent}
            disabled={action.state.status !== 'idle'}
            onChange={(event) => setConsent(event.target.checked)}
          >
            {copy.proposalConsent}
          </Checkbox>
          <div className="module-actions">
            <Button
              type="primary"
              disabled={!consent || !env?.client?.approveProposal || action.state.status !== 'idle'}
              onClick={() => void approve()}
            >
              {copy.approve}
            </Button>
            <Button
              disabled={!env?.client?.rejectProposal || action.state.status !== 'idle'}
              onClick={() => void reject()}
            >
              {copy.reject}
            </Button>
          </div>
        </>
      )}
      {action.state.status === 'pending' && <p role="status">{copy.loading}</p>}
      {action.state.status === 'error' && (
        <Alert role="alert" type="error" message={copy[action.state.error]} />
      )}
      {outcome && <p role="status">{copy[outcome]}</p>}
    </div>
  );
}
export default function AiOperationsPage() {
  const env = useModule();
  const copy = useCopy();
  const [start, setStart] = useState(0);
  const [selected, setSelected] = useState<string>();
  const list = env?.client?.listProposals;
  const load = useCallback(
    async (signal: AbortSignal) =>
      parseProposalList(await list?.({ start, limit: 20 }, { signal })),
    [list, start],
  );
  const read = useRead(list ? load : null, String(start));
  return (
    <ModuleFrame title={copy.ai}>
      <Section title={copy.log}>
        <p>{copy.logNote}</p>
      </Section>
      <Section title={copy.proposals}>
        <Button onClick={read.refresh}>{copy.refresh}</Button>
        <ResourceView state={read.state} retry={read.refresh}>
          {(page) => (
            <>
              {page.proposals.length === 0 ? (
                <p>{copy.empty}</p>
              ) : (
                <ol className="module-records">
                  {page.proposals.map((proposal) => (
                    <li key={proposal.proposal_id} className="module-record">
                      <div>
                        <p>{proposal.preview.summary}</p>
                        <p>
                          {proposal.result
                            ? copy[proposal.result]
                            : proposal.status === 'expired'
                              ? copy.proposalExpiredLabel
                              : copy[proposal.status]}
                        </p>
                        <DateValue value={proposal.created_at} />
                      </div>
                      <Button onClick={() => setSelected(proposal.proposal_id)}>
                        {copy.inspect}
                      </Button>
                    </li>
                  ))}
                </ol>
              )}
              <Pager
                start={start}
                hasNext={page.has_next_page && start < 10000}
                change={(value) => {
                  setStart(value);
                  setSelected(undefined);
                }}
              />
            </>
          )}
        </ResourceView>
      </Section>
      {selected && (
        <ProposalReview
          key={selected}
          id={selected}
          changed={read.refresh}
          close={() => setSelected(undefined)}
        />
      )}
    </ModuleFrame>
  );
}
