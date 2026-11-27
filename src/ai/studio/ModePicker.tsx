import { Radio } from 'antd';
import { useId } from 'react';

import { AGENT_MODES } from '../agent';
import type { AgentMode } from '../agent';
import { useStudioStrings } from './strings';

/**
 * Mode picker. Native radio buttons: arrow keys change the mode, Tab leaves the group.
 * The chosen mode applies to the next task. Only `act` mode proposes changes.
 */
export function ModePicker({
  value,
  onChange,
  disabled,
}: {
  value: AgentMode;
  onChange: (mode: AgentMode) => void;
  disabled: boolean;
}) {
  const legend = useId();
  const t = useStudioStrings();
  return (
    <div className="ai-mode" role="radiogroup" aria-labelledby={legend}>
      <span id={legend} className="ai-mode-legend">
        {t.mode}
      </span>
      <Radio.Group
        optionType="button"
        value={value}
        disabled={disabled}
        name={`${legend}-kip`}
        onChange={(event) => onChange(event.target.value as AgentMode)}
      >
        {AGENT_MODES.map((mode) => (
          <Radio.Button key={mode} value={mode}>
            {t.modes[mode]}
          </Radio.Button>
        ))}
      </Radio.Group>
    </div>
  );
}
