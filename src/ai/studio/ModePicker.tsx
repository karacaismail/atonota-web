import { Radio } from 'antd';
import { useId } from 'react';

import { AGENT_MODES, MODE_LABELS } from '../agent';
import type { AgentMode } from '../agent';

/**
 * Kip seçici. Yerel radyo düğmeleridir: oklar kipi değiştirir, Tab gruptan çıkar.
 * Seçilen kip bir sonraki işe uygulanır. Yalnız "İşlem yap" kipi değişiklik önerir.
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
  return (
    <div className="ai-mode" role="radiogroup" aria-labelledby={legend}>
      <span id={legend} className="ai-mode-legend">
        Kip
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
            {MODE_LABELS[mode]}
          </Radio.Button>
        ))}
      </Radio.Group>
    </div>
  );
}
