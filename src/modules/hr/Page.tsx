import { Alert, Button, Checkbox } from 'antd';
import { useCallback, useState } from 'react';
import { leaveCommand, object, parseLeave, parseLeaveList, text, type Leave } from '../contracts';
import { useMutation, useRead } from '../data';
import { useCopy } from '../messages';
import { useModule } from '../context';
import { DateValue, ModuleFrame, Pager, ResourceView } from '../shared';
function LeaveReview({
  name,
  changed,
  close,
}: {
  name: string;
  changed: () => void;
  close: () => void;
}) {
  const env = useModule();
  const copy = useCopy();
  const get = env?.client?.getLeaveApplication;
  const load = useCallback(
    async (signal: AbortSignal) => {
      const leave = parseLeave(await get?.(name, { signal }));
      if (leave.name !== name) throw new Error('invalid_response');
      return leave;
    },
    [get, name],
  );
  const read = useRead(get ? load : null, name);
  return (
    <section className="module-stack module-review" aria-label={copy.inspect}>
      <Button onClick={close}>{copy.close}</Button>
      <ResourceView state={read.state} retry={read.refresh}>
        {(leave) => (
          <LeaveDecision key={`${leave.name}:${leave.modified}`} leave={leave} changed={changed} />
        )}
      </ResourceView>
    </section>
  );
}
function LeaveDecision({ leave, changed }: { leave: Leave; changed: () => void }) {
  const env = useModule();
  const copy = useCopy();
  const action = useMutation();
  const [consent, setConsent] = useState(false);
  const kind = leave.docstatus === 1 ? 'cancel' : 'approve';
  const method =
    kind === 'approve' ? env?.client?.approveLeaveApplication : env?.client?.cancelLeaveApplication;
  const canAct =
    Boolean(leave.modified) &&
    (kind === 'cancel' || (leave.status === 'Open' && leave.docstatus === 0));
  async function submit() {
    if (!method || !consent || !canAct) return;
    const result = await action.run(async (signal) => {
      const data = object(await method(leaveCommand(leave, kind), { signal }));
      if (text(data['name']) !== leave.name) throw new Error('invalid_response');
      return data;
    });
    if (result) changed();
  }
  return (
    <div className="module-stack">
      <h2>{leave.name}</h2>
      <dl>
        <dt>{copy.employee}</dt>
        <dd>{leave.employee_name ?? copy.notProvided}</dd>
        <dt>{copy.leaveType}</dt>
        <dd>{leave.leave_type ?? copy.notProvided}</dd>
        <dt>{copy.from}</dt>
        <dd>
          <DateValue value={leave.from_date} />
        </dd>
        <dt>{copy.to}</dt>
        <dd>
          <DateValue value={leave.to_date} />
        </dd>
        <dt>{copy.days}</dt>
        <dd>{leave.total_leave_days ?? copy.notProvided}</dd>
      </dl>
      {!leave.modified && <Alert type="warning" message={copy.versionMissing} />}
      {canAct && (
        <>
          <Checkbox
            checked={consent}
            disabled={action.state.status !== 'idle'}
            onChange={(event) => setConsent(event.target.checked)}
          >
            {kind === 'approve' ? copy.leaveConsent : copy.leaveCancelConsent}
          </Checkbox>
          <Button
            type="primary"
            danger={kind === 'cancel'}
            disabled={!consent || !method || action.state.status !== 'idle'}
            onClick={() => void submit()}
          >
            {kind === 'approve' ? copy.leaveApprove : copy.leaveCancel}
          </Button>
        </>
      )}
      {action.state.status === 'pending' && <p role="status">{copy.loading}</p>}
      {action.state.status === 'success' && <p role="status">{copy.leaveSuccess}</p>}
      {action.state.status === 'error' && (
        <Alert role="alert" type="error" message={copy[action.state.error]} />
      )}
    </div>
  );
}
export default function LeavePage() {
  const env = useModule();
  const copy = useCopy();
  const [start, setStart] = useState(0);
  const [selected, setSelected] = useState<string>();
  const list = env?.client?.listLeaveApplications;
  const load = useCallback(
    async (signal: AbortSignal) =>
      parseLeaveList(
        await list?.(
          { limit_start: start, limit_page_length: 20, order_by: 'modified desc, name asc' },
          { signal },
        ),
      ),
    [list, start],
  );
  const read = useRead(list ? load : null, String(start));
  return (
    <ModuleFrame title={copy.hr}>
      <div className="module-stack">
        <Button onClick={read.refresh}>{copy.refresh}</Button>
        <ResourceView state={read.state} retry={read.refresh}>
          {(records) => (
            <>
              {records.length === 0 ? (
                <p>{copy.empty}</p>
              ) : (
                <ol className="module-records">
                  {records.map((leave) => (
                    <li className="module-record" key={leave.name}>
                      <div>
                        <p>{leave.name}</p>
                        <p>{leave.employee_name}</p>
                        <p>{leave.status ? copy[leave.status] : copy.notProvided}</p>
                      </div>
                      <Button onClick={() => setSelected(leave.name)}>{copy.inspect}</Button>
                    </li>
                  ))}
                </ol>
              )}
              <Pager
                start={start}
                hasNext={records.length === 20}
                change={(value) => {
                  setStart(value);
                  setSelected(undefined);
                }}
              />
            </>
          )}
        </ResourceView>
      </div>
      {selected && (
        <LeaveReview
          key={selected}
          name={selected}
          changed={read.refresh}
          close={() => setSelected(undefined)}
        />
      )}
    </ModuleFrame>
  );
}
