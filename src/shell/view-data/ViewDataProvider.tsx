import type { ReactNode } from 'react';

import type { ShellViewData } from './context';
import { ViewDataContext } from './context';

export function ViewDataProvider({
  value,
  children,
}: {
  value: ShellViewData | null;
  children: ReactNode;
}) {
  return <ViewDataContext.Provider value={value}>{children}</ViewDataContext.Provider>;
}
