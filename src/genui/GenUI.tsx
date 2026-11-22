import './genui.css';

import type { ComponentType } from 'react';

import { JsonView } from './blocks/JsonView';
import { GENUI_REGISTRY, type BlockProps } from './registry';
import type { GenUIActionHandler, GenUIBlock, KnownBlock } from './types';
import { useGenuiVars } from './useGenuiVars';

export interface GenUIProps {
  blocks: GenUIBlock[];
  /** Eylem sohbete kabul edilirse `true` döner (U4). */
  onAction: GenUIActionHandler;
  /** Sohbet yanıt beklerken `true`. Onay ve form düğmeleri kapanır. */
  busy?: boolean;
}

export function GenUI({ blocks, onAction, busy = false }: GenUIProps) {
  const vars = useGenuiVars();
  if (blocks.length === 0) return null;
  return (
    <div className="genui" style={vars}>
      {blocks.map((block, index) => {
        if (block.type === 'unknown') return <JsonView key={index} raw={block.raw} />;
        const View = GENUI_REGISTRY[block.type] as ComponentType<BlockProps<KnownBlock>>;
        return <View key={index} block={block} onAction={onAction} busy={busy} />;
      })}
    </div>
  );
}

/** Akış sürerken blokların yerinde iskelet görünür (U5). */
export function GenUISkeleton() {
  const vars = useGenuiVars();
  return (
    <div className="genui genui-skel" style={vars} aria-hidden>
      <i />
      <i />
      <i />
    </div>
  );
}
