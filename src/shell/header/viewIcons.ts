import type { Icon } from '@phosphor-icons/react';
import {
  ChartBarHorizontal,
  ChartPieSlice,
  FileText,
  Kanban,
  Rows,
  Table,
  Timer,
} from '@phosphor-icons/react';

import type { ViewType } from '../tokens';

/** Kaynak dosyadaki `header.viewTypes[].icon` eşlemesi. */
export const viewIcons: Record<ViewType, Icon> = {
  table: Rows,
  kanban: Kanban,
  pivot: Table,
  report: ChartPieSlice,
  gantt: ChartBarHorizontal,
  timesheet: Timer,
  form: FileText,
};
