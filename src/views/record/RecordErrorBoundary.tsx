import { ArrowClockwise, WarningCircle } from '@phosphor-icons/react';
import { Button } from 'antd';
import { Component, type ErrorInfo, type ReactNode } from 'react';

import { formatRecordMessage } from './messages';
import type { RecordLocale } from './types';

export interface RecordErrorBoundaryProps {
  locale?: RecordLocale | undefined;
  resetKey?: string | number | undefined;
  onReset?: (() => void) | undefined;
  children: ReactNode;
}

interface RecordErrorBoundaryState {
  hasError: boolean;
}

class RecordErrorBoundaryInner extends Component<
  RecordErrorBoundaryProps,
  RecordErrorBoundaryState
> {
  public override state: RecordErrorBoundaryState = {
    hasError: false,
  };

  public static getDerivedStateFromError(): RecordErrorBoundaryState {
    return { hasError: true };
  }

  public override componentDidCatch(_error: Error, _info: ErrorInfo): void {
    // GV-7 & RE-1: Never log PII or expose raw error stack traces in UI.
  }

  private readonly handleReset = (): void => {
    this.setState({ hasError: false });
    this.props.onReset?.();
  };

  public override render(): ReactNode {
    if (this.state.hasError) {
      const locale: RecordLocale = this.props.locale ?? 'tr';
      return (
        <div className="rv-state-card" role="alert">
          <div className="rv-field-header">
            <WarningCircle weight="regular" />
            <strong>{formatRecordMessage(locale, 'errorBoundaryTitle')}</strong>
          </div>
          <p className="rv-field-help">{formatRecordMessage(locale, 'errorBoundaryDescription')}</p>
          <Button
            size="middle"
            type="primary"
            icon={<ArrowClockwise weight="regular" />}
            onClick={this.handleReset}
          >
            {formatRecordMessage(locale, 'errorBoundaryReset')}
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export function RecordErrorBoundary(props: RecordErrorBoundaryProps): ReactNode {
  return <RecordErrorBoundaryInner key={props.resetKey} {...props} />;
}
