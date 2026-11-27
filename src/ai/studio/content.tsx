import type { PromptProps } from '@ant-design/x';
import { Lightning, Package, ChartBar, Sparkle } from '@phosphor-icons/react';

import type { StudioStrings } from './strings';

/** Categorised suggestions in the empty state (Prompts, nested). Texts follow the UI language. */
export function welcomePrompts(t: StudioStrings): PromptProps[] {
  return [
    {
      key: 'report',
      label: t.prompts.report,
      icon: <ChartBar aria-hidden />,
      children: [
        {
          key: 'report-week',
          label: t.prompts.reportWeek,
          icon: <Sparkle className="ai-spark" aria-hidden />,
        },
        {
          key: 'report-month',
          label: t.prompts.reportMonth,
          icon: <Sparkle className="ai-spark" aria-hidden />,
        },
      ],
    },
    {
      key: 'orders',
      label: t.prompts.orders,
      icon: <Package aria-hidden />,
      children: [
        {
          key: 'orders-late',
          label: t.prompts.ordersLate,
          icon: <Sparkle className="ai-spark" aria-hidden />,
        },
        {
          key: 'orders-rule',
          label: t.prompts.ordersRule,
          icon: <Lightning aria-hidden />,
        },
      ],
    },
  ];
}

/** "/" commands (Suggestion). Texts follow the UI language. */
export function slashCommands(t: StudioStrings) {
  return [
    { label: t.slash.report, value: t.prompts.reportWeek, icon: <ChartBar aria-hidden /> },
    { label: t.slash.orders, value: t.prompts.ordersLate, icon: <Package aria-hidden /> },
    { label: t.slash.automation, value: t.prompts.ordersRule, icon: <Lightning aria-hidden /> },
  ];
}

/** Text AI Studio shows when no model gateway connection is set up. No mock agent runs. */
export const NOT_CONNECTED = {
  title: 'AI Studio bağlantısı kurulmadı',
  body: 'Bu panel henüz model geçidine bağlı değil. Bu yüzden asistan yanıt veremez.',
  next: 'Bağlantı kurulunca sohbet bu sayfada açılır.',
};
