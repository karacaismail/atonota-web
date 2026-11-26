import type { ComponentType } from 'react';

import { ChartView } from './blocks/ChartView';
import { ChoicesView } from './blocks/ChoicesView';
import { ConfirmView } from './blocks/ConfirmView';
import { EventsView } from './blocks/EventsView';
import { FormView } from './blocks/FormView';
import { KpisView } from './blocks/KpisView';
import { QueueView } from './blocks/QueueView';
import { ResultView } from './blocks/ResultView';
import { ReviewView } from './blocks/ReviewView';
import { ScopeView } from './blocks/ScopeView';
import { SourceView } from './blocks/SourceView';
import { TableView } from './blocks/TableView';
import type { BlockType, GenUIActionHandler, GenUIDecision, KnownBlock } from './types';

export interface BlockProps<T extends KnownBlock> {
  block: T;
  onAction: GenUIActionHandler;
  /** Sohbet yanıt beklerken `true`. Eylem düğmeleri kapanır. */
  busy?: boolean;
  /** Sohbet geçmişindeki karar. Varsa blok kilitli çizilir. */
  decided?: GenUIDecision | undefined;
}

type Registry = {
  [K in BlockType]: ComponentType<BlockProps<Extract<KnownBlock, { type: K }>>>;
};

/**
 * Onaylı bileşen kaydı (U2). Yeni tür yalnız buraya eklenerek çizilir.
 * Kayıtta olmayan tür hiç çizilmez (`GenUI.tsx`).
 */
export const GENUI_REGISTRY: Registry = {
  kpis: KpisView,
  chart: ChartView,
  table: TableView,
  confirm: ConfirmView,
  form: FormView,
  choices: ChoicesView,
  // Yapay zekâ yüzeyleri (AJA-1156). Onay kartı bu listede yoktur (6b işi).
  scope: ScopeView,
  events: EventsView,
  source: SourceView,
  review: ReviewView,
  queue: QueueView,
  result: ResultView,
};
