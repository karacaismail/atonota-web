import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { Button } from 'antd';
import { useState } from 'react';

import { formatRecordInteger, formatRecordMessage } from './messages';
import type { RecordNavigatorProps } from './types';

export interface InternalRecordNavigatorProps extends RecordNavigatorProps {
  onDiscardBeforeNavigate?: (() => void) | undefined;
}

export function RecordNavigator(props: InternalRecordNavigatorProps) {
  const {
    currentIndex,
    totalCount,
    locale = 'tr',
    disabled = false,
    hasUnsavedChanges = false,
    onNavigate,
    onDiscardBeforeNavigate,
  } = props;

  const [pendingTarget, setPendingTarget] = useState<number | null>(null);

  const safeTotal = Math.max(0, totalCount);
  const safeCurrent = safeTotal === 0 ? 0 : Math.min(Math.max(1, currentIndex), safeTotal);
  const canPrev = !disabled && safeCurrent > 1;
  const canNext = !disabled && safeCurrent < safeTotal;

  const positionLabel = formatRecordMessage(locale, 'navigatorPosition', {
    current: formatRecordInteger(locale, safeCurrent),
    total: formatRecordInteger(locale, safeTotal),
  });

  const triggerNavigation = (targetIndex: number) => {
    if (hasUnsavedChanges) {
      setPendingTarget(targetIndex);
      return;
    }
    onNavigate?.(targetIndex);
  };

  return (
    <div>
      <nav
        className="rv-navigator"
        aria-label={formatRecordMessage(locale, 'recordNavigatorLabel')}
      >
        <Button
          size="middle"
          type="default"
          icon={<CaretLeft weight="regular" />}
          aria-label={formatRecordMessage(locale, 'previousRecord')}
          disabled={!canPrev}
          onClick={() => triggerNavigation(safeCurrent - 1)}
        />
        <span className="rv-navigator-pos">{positionLabel}</span>
        <Button
          size="middle"
          type="default"
          icon={<CaretRight weight="regular" />}
          aria-label={formatRecordMessage(locale, 'nextRecord')}
          disabled={!canNext}
          onClick={() => triggerNavigation(safeCurrent + 1)}
        />
      </nav>

      {pendingTarget !== null ? (
        <div className="rv-unsaved-guard" role="alert">
          <span>{formatRecordMessage(locale, 'unsavedNavigationPrompt')}</span>
          <div className="rv-banner-actions">
            <Button size="small" onClick={() => setPendingTarget(null)}>
              {formatRecordMessage(locale, 'unsavedNavigationStay')}
            </Button>
            <Button
              size="small"
              danger
              onClick={() => {
                const target = pendingTarget;
                setPendingTarget(null);
                onDiscardBeforeNavigate?.();
                onNavigate?.(target);
              }}
            >
              {formatRecordMessage(locale, 'unsavedNavigationConfirm')}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
