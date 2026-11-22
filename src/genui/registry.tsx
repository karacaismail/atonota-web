import type { ComponentType } from 'react';

import { ChartView } from './blocks/ChartView';
import { ChoicesView } from './blocks/ChoicesView';
import { ConfirmView } from './blocks/ConfirmView';
import { FormView } from './blocks/FormView';
import { KpisView } from './blocks/KpisView';
import { TableView } from './blocks/TableView';
import type { BlockType, GenUIAction, KnownBlock } from './types';

export interface BlockProps<T extends KnownBlock> {
  block: T;
  onAction: (action: GenUIAction) => void;
}

type Registry = {
  [K in BlockType]: ComponentType<BlockProps<Extract<KnownBlock, { type: K }>>>;
};

/** Onaylı bileşen kaydı (U2). Yeni tür yalnız buraya eklenerek çizilir. */
export const GENUI_REGISTRY: Registry = {
  kpis: KpisView,
  chart: ChartView,
  table: TableView,
  confirm: ConfirmView,
  form: FormView,
  choices: ChoicesView,
};
