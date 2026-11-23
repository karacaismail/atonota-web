import { Prompts, Sender, XProvider } from '@ant-design/x';
import { Segmented } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { t } from '../messages';
import { routes } from '../paths';
import { samplePrompts } from '../sampleData';

type Mode = 'ask' | 'do' | 'search';

interface CommandBoxProps {
  onSubmitted?: () => void;
}

/**
 * Komut alanı. Gönderilen istek asistan sayfasına gider.
 * Bu sürümde yanıt üretilmez. Sahte yanıt gösterilmez.
 */
export function CommandBox({ onSubmitted }: CommandBoxProps) {
  const [mode, setMode] = useState<Mode>('ask');
  const [value, setValue] = useState('');
  const navigate = useNavigate();

  const submit = (text: string) => {
    const q = text.trim();
    if (!q) return;
    setValue('');
    navigate(routes.assistant(), { state: { q, mode } });
    onSubmitted?.();
  };

  return (
    <XProvider>
      <section className="shell-cmd" aria-label={t.command.label}>
        <div className="shell-cmd-box">
          <Segmented<Mode>
            size="small"
            block
            aria-label={t.command.modeLabel}
            value={mode}
            onChange={setMode}
            options={[
              { value: 'ask', label: t.command.modes.ask },
              { value: 'do', label: t.command.modes.do },
              { value: 'search', label: t.command.modes.search },
            ]}
          />
          <Sender
            className="shell-sender"
            value={value}
            onChange={(v) => setValue(v)}
            onSubmit={submit}
            placeholder={t.command.placeholder}
          />
        </div>
        <div className="shell-chips" role="group" aria-label={t.command.suggestions}>
          <Prompts
            items={samplePrompts.map((p) => ({ key: p.key, label: p.label }))}
            onItemClick={({ data }) => submit(String(data.label))}
          />
        </div>
      </section>
    </XProvider>
  );
}
