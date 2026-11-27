import { Alert } from 'antd';
import type { ReactNode } from 'react';
import type { Resource } from '../data';
import { useCopy } from '../messages';
import { ResourceView } from '../shared';

/** Shared read view. If the server returns 403, the section shows the "no permission" box. */
export function AdminResource<T>({
  state,
  retry,
  children,
}: {
  state: Resource<T>;
  retry: () => void;
  children: (data: T) => ReactNode;
}) {
  const copy = useCopy();
  if (state.status === 'error' && state.error === 'forbidden')
    return (
      <Alert
        role="alert"
        type="warning"
        message={copy.noSectionAccess}
        description={copy.askAdmin}
      />
    );
  return (
    <ResourceView state={state} retry={retry}>
      {children}
    </ResourceView>
  );
}
