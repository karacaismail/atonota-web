import type { EventsBlock, GenUIBlock, ToolEventStatus } from '@/genui';

import { STEP_LABELS } from '../agent';
import type { AgentStep, FlowStep } from '../agent';

/** Sahte sunucunun araç olayları örnektir. Ekran bunu açıkça söyler (AX-7). */
export const SIMULATED_TOOLS_NOTE = 'Örnek adımlar. Gerçek araç çalışmadı.';

const STATUS: Record<AgentStep['status'], ToolEventStatus> = {
  pending: 'running',
  success: 'done',
  error: 'failed',
};

/**
 * Sunucunun bildirdiği araç olaylarını onaylı "Araç olayları" yüzeyine çevirir.
 * Liste boşsa yüzey yoktur. Ekran kendi başına olay eklemez.
 */
export function toEventsBlock(steps: readonly AgentStep[]): EventsBlock | null {
  if (steps.length === 0) return null;
  return {
    type: 'events',
    items: steps.map((step) => ({
      id: step.key,
      tool: step.tool,
      summary: step.title,
      status: STATUS[step.status],
    })),
  };
}

/** Yüzeyin ait olduğu akış adımı. Listede olmayan blok adımsız kalır. */
const STEP_OF: Partial<Record<GenUIBlock['type'], FlowStep>> = {
  scope: 'plan',
  events: 'plan',
  review: 'preview',
  source: 'preview',
  queue: 'approval',
  confirm: 'approval',
  result: 'apply',
};

export interface StepGroup {
  step: FlowStep;
  label: string;
  blocks: GenUIBlock[];
}

/**
 * Yanıtın bloklarını akış adımlarına ayırır.
 * Araç olayları yanıtın ilk adımında, o adımın yüzeylerinden sonra yer alır.
 * Adımsız bloklar (tablo, grafik, form) `rest` listesinde sırasını korur.
 */
export function groupBySteps(
  blocks: readonly GenUIBlock[],
  steps: readonly AgentStep[],
): { groups: StepGroup[]; rest: GenUIBlock[] } {
  const byStep = new Map<FlowStep, GenUIBlock[]>();
  const rest: GenUIBlock[] = [];
  const add = (step: FlowStep, block: GenUIBlock) =>
    byStep.set(step, [...(byStep.get(step) ?? []), block]);
  for (const block of blocks) {
    const step = STEP_OF[block.type];
    if (step) add(step, block);
    else rest.push(block);
  }
  const order: FlowStep[] = ['plan', 'preview', 'approval', 'apply'];
  // Araç olayları bu yanıtın ilk adımına aittir. Yanıtta yüzey yoksa plan adımına girer.
  // Örnek: onaydan sonraki yanıtta olay "Uygulama" başlığı altında görünür.
  const events = toEventsBlock(steps);
  if (events) add(order.find((step) => byStep.has(step)) ?? 'plan', events);
  const groups = order
    .filter((step) => byStep.has(step))
    .map((step) => ({ step, label: STEP_LABELS[step], blocks: byStep.get(step) ?? [] }));
  return { groups, rest };
}
