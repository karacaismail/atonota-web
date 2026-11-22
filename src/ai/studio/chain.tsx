import type { ThoughtChainItem } from '@ant-design/x';
import { CheckCircle, Circle, XCircle } from '@phosphor-icons/react';

import type { AgentStep } from '../agent';

/** Sahte sunucunun araç olayları örnektir. Ekran bunu açıkça söyler (AX-7). */
export const SIMULATED_TOOLS_NOTE = 'Örnek adımlar. Gerçek araç çalışmadı.';

const STEP_ICON: Record<AgentStep['status'], ThoughtChainItem['icon']> = {
  pending: <Circle aria-hidden />,
  success: <CheckCircle weight="fill" aria-hidden />,
  error: <XCircle weight="fill" aria-hidden />,
};

const STEP_TEXT: Record<AgentStep['status'], string> = {
  pending: 'sürüyor',
  success: 'tamamlandı',
  error: 'hata',
};

export function toChainItems(steps: AgentStep[]): ThoughtChainItem[] {
  return steps.map((step) => ({
    key: step.key,
    title: step.title,
    status: step.status,
    icon: STEP_ICON[step.status],
    description: <span className="ai-visually-hidden">{STEP_TEXT[step.status]}</span>,
  }));
}
