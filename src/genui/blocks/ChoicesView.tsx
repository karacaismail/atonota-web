import { Prompts } from '@ant-design/x';
import { Sparkle } from '@phosphor-icons/react';

import type { ChoicesBlock, GenUIAction } from '../types';

export function ChoicesView({
  block,
  onAction,
}: {
  block: ChoicesBlock;
  onAction: (action: GenUIAction) => void;
}) {
  return (
    <section data-genui="choices" className="genui-choices" aria-label="Öneriler">
      <Prompts
        wrap
        items={block.items.map((label, index) => ({
          key: String(index),
          icon: <Sparkle className="ai-spark" aria-hidden />,
          label,
        }))}
        onItemClick={({ data }) => {
          if (typeof data.label === 'string') onAction({ kind: 'ask', text: data.label });
        }}
      />
    </section>
  );
}
