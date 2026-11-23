import {
  ArrowClockwise,
  FileText,
  LockKey,
  Plus,
  SignIn,
  WarningCircle,
} from '@phosphor-icons/react';
import { Button, Skeleton } from 'antd';

import { formatRecordMessage } from './messages';
import type { RecordLocale } from './types';

export function LoadingRecordState(props: { locale: RecordLocale }) {
  return (
    <div className="rv-state-card" role="status" aria-live="polite" aria-busy="true">
      <span>{formatRecordMessage(props.locale, 'loadingRecord')}</span>
      <Skeleton active paragraph={{ rows: 4 }} title />
    </div>
  );
}

export function EmptyRecordState(props: {
  locale: RecordLocale;
  reason?: 'no_record' | 'not_found' | undefined;
  onCreateNew?: (() => void) | undefined;
}) {
  const { locale, reason, onCreateNew } = props;
  const descriptionKey =
    reason === 'not_found' ? 'emptyNotFoundDescription' : 'emptySelectionDescription';

  return (
    <div className="rv-state-card" role="status">
      <div className="rv-field-header">
        <FileText weight="regular" />
        <strong>{formatRecordMessage(locale, 'emptyTitle')}</strong>
      </div>
      <p className="rv-field-help">{formatRecordMessage(locale, descriptionKey)}</p>
      {onCreateNew ? (
        <Button size="middle" type="primary" icon={<Plus weight="regular" />} onClick={onCreateNew}>
          {formatRecordMessage(locale, 'createNewRecord')}
        </Button>
      ) : null}
    </div>
  );
}

export function ErrorRecordState(props: {
  locale: RecordLocale;
  message: string;
  onRetry: () => void;
}) {
  const { locale, message, onRetry } = props;
  return (
    <div className="rv-state-card" role="alert">
      <div className="rv-field-header">
        <WarningCircle weight="regular" />
        <strong>{formatRecordMessage(locale, 'errorTitle')}</strong>
      </div>
      <p className="rv-field-help">{message}</p>
      <Button
        size="middle"
        type="primary"
        icon={<ArrowClockwise weight="regular" />}
        onClick={onRetry}
      >
        {formatRecordMessage(locale, 'retryAction')}
      </Button>
    </div>
  );
}

export function UnauthorizedRecordState(props: {
  locale: RecordLocale;
  reason: 'permission_denied' | 'session_expired';
  onSignIn?: (() => void) | undefined;
}) {
  const { locale, reason, onSignIn } = props;
  const descriptionKey =
    reason === 'session_expired'
      ? 'unauthorizedSessionDescription'
      : 'unauthorizedPermissionDescription';

  return (
    <div className="rv-state-card" role="alert">
      <div className="rv-field-header">
        <LockKey weight="regular" />
        <strong>{formatRecordMessage(locale, 'unauthorizedTitle')}</strong>
      </div>
      <p className="rv-field-help">{formatRecordMessage(locale, descriptionKey)}</p>
      {reason === 'session_expired' && onSignIn ? (
        <Button size="middle" type="primary" icon={<SignIn weight="regular" />} onClick={onSignIn}>
          {formatRecordMessage(locale, 'signInAgainAction')}
        </Button>
      ) : null}
    </div>
  );
}
