import { CaretDown } from '@phosphor-icons/react';

import { FLOW_STEPS } from '../agent';
import type { FlowState, FlowStep } from '../agent';
import { useStudioStrings } from './strings';

/** Steps that open only in `act` mode. */
const ACT_ONLY: ReadonlySet<FlowStep> = new Set(['approval', 'apply', 'undo']);

type StepState = 'done' | 'current' | 'waiting' | 'absent';

function stateOf(flow: FlowState, step: FlowStep): StepState {
  const at = FLOW_STEPS.indexOf(flow.step);
  const index = FLOW_STEPS.indexOf(step);
  if (index < at) return 'done';
  if (index === at) return 'current';
  return ACT_ONLY.has(step) && flow.mode !== 'act' ? 'absent' : 'waiting';
}

/**
 * The flow's six steps (AJA-880 draft, version 3).
 * State comes only from server events. No percentage or time estimate is shown.
 * The list starts collapsed. The summary line shows the current step and mode.
 */
export function FlowSteps({ flow }: { flow: FlowState }) {
  const t = useStudioStrings();
  const at = FLOW_STEPS.indexOf(flow.step) + 1;
  return (
    <details className="ai-flow">
      <summary>
        <span className="ai-flow-sum">
          <span>{t.stepSummary(at, FLOW_STEPS.length, t.steps[flow.step])}</span>
          <span className="ai-flow-mode">{`${t.mode}: ${t.modes[flow.mode]}`}</span>
        </span>
        <CaretDown aria-hidden className="ai-flow-caret" />
      </summary>
      <ol className="ai-flow-list" aria-label={t.flowSteps}>
        {FLOW_STEPS.map((step) => {
          const state = stateOf(flow, step);
          return (
            <li
              key={step}
              className={`is-${state}`}
              {...(state === 'current' ? { 'aria-current': 'step' as const } : {})}
            >
              <span className="ai-flow-name">{t.steps[step]}</span>
              <span className="ai-flow-state">{t.stepStates[state]}</span>
            </li>
          );
        })}
      </ol>
    </details>
  );
}
