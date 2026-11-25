import { Alert } from 'antd';
import type { ReactNode } from 'react';
import type { Resource } from '../data';
import { useCopy } from '../messages';
import { ResourceView } from '../shared';

/** Ortak okuma görünümü. Sunucu 403 dönerse bölüm "yetki yok" kutusunu gösterir. */
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
