import './genui.css';

import { ConfigProvider } from 'antd';
import type { ComponentType } from 'react';

import { JsonView } from './blocks/JsonView';
import { GENUI_REGISTRY, type BlockProps } from './registry';
import type { GenUIActionHandler, GenUIBlock, GenUIDecisions, KnownBlock } from './types';
import { useGenuiFocusTheme, useGenuiVars } from './useGenuiVars';

export interface GenUIProps {
  blocks: GenUIBlock[];
  /** Eylem sohbete kabul edilirse `true` döner (U4). */
  onAction: GenUIActionHandler;
  /** Sohbet yanıt beklerken `true`. Onay ve form düğmeleri kapanır. */
  busy?: boolean;
  /** Sohbet geçmişinden çıkarılan kararlar. Blok kimliğine göre okunur. */
  decisions?: GenUIDecisions;
}

export function GenUI({ blocks, onAction, busy = false, decisions = {} }: GenUIProps) {
  const vars = useGenuiVars();
  const focusTheme = useGenuiFocusTheme();
  if (blocks.length === 0) return null;
  return (
    <ConfigProvider theme={focusTheme}>
      <div className="genui" style={vars}>
        {blocks.map((block, index) => {
          if (block.type === 'unknown') return <JsonView key={index} raw={block.raw} />;
          const View = GENUI_REGISTRY[block.type] as ComponentType<BlockProps<KnownBlock>>;
          const decided =
            block.type === 'confirm' || block.type === 'form' ? decisions[block.id] : undefined;
          return (
            <View key={index} block={block} onAction={onAction} busy={busy} decided={decided} />
          );
        })}
      </div>
    </ConfigProvider>
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
