import './genui.css';

import type { ComponentType } from 'react';

import { JsonView } from './blocks/JsonView';
import { GENUI_REGISTRY, type BlockProps } from './registry';
import type { GenUIAction, GenUIBlock, KnownBlock } from './types';
import { useGenuiVars } from './useGenuiVars';

export interface GenUIProps {
  blocks: GenUIBlock[];
  onAction: (action: GenUIAction) => void;
}

export function GenUI({ blocks, onAction }: GenUIProps) {
  const vars = useGenuiVars();
  if (blocks.length === 0) return null;
  return (
    <div className="genui" style={vars}>
      {blocks.map((block, index) => {
        if (block.type === 'unknown') return <JsonView key={index} raw={block.raw} />;
        const View = GENUI_REGISTRY[block.type] as ComponentType<BlockProps<KnownBlock>>;
        return <View key={index} block={block} onAction={onAction} />;
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
