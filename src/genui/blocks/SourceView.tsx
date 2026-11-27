import { FileText } from '@phosphor-icons/react';
import { useId } from 'react';

import type { SourceBlock } from '../types';
import { useGenuiStrings } from '../useGenuiStrings';
import { SourceList } from './SourceList';

/** Source card: the source's name and link. */
export function SourceView({ block }: { block: SourceBlock }) {
  const text = useGenuiStrings();
  const id = useId();
  return (
    <div role="group" data-genui="source" className="genui-source" aria-labelledby={id}>
      <FileText aria-hidden />
      <div>
        <strong id={id}>{text.source}</strong>
        <SourceList items={block.items} />
      </div>
    </div>
  );
}
