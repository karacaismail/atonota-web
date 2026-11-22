import { ThoughtChain } from '@ant-design/x';
import { Brain } from '@phosphor-icons/react';
import { Alert, Button } from 'antd';

import { GenUI, GenUISkeleton } from '@/genui';
import type { GenUIAction } from '@/genui';

import type { AssistantMessage } from '../agent';
import { toChainItems } from './chain';

/**
 * Asistan yanıtı: düşünce zinciri, akan metin ve GenUI blokları.
 * Düşünce zinciri yalnız sunucunun gönderdiği adımları gösterir.
 * Metin düz yazıdır. Model çıktısı HTML olarak çizilmez (AX-3).
 */
export function AssistantBody({
  message,
  onAction,
  onRetry,
}: {
  message: AssistantMessage;
  onAction: (action: GenUIAction) => void;
  onRetry: () => void;
}) {
  const streaming = message.phase === 'streaming';
  const doneSteps = message.steps.filter((s) => s.status === 'success').length;
  return (
    <div className="ai-answer">
      {message.steps.length > 0 && (
        <details className="ai-think" open={message.phase === 'waiting' || streaming}>
          <summary>
            <Brain className="ai-brain" aria-hidden />
            {`Düşünce zinciri: ${doneSteps} / ${message.steps.length} adım`}
          </summary>
          <ThoughtChain size="small" items={toChainItems(message.steps)} />
        </details>
      )}
      {message.text && (
        <p className="ai-text">
          {message.text}
          {streaming && <span className="ai-caret" aria-hidden />}
        </p>
      )}
      {streaming && <GenUISkeleton />}
      {message.phase === 'done' && <GenUI blocks={message.ui} onAction={onAction} />}
      {message.phase === 'cancelled' && <p className="ai-note">Yanıt durduruldu.</p>}
      {message.phase === 'error' && (
        <Alert
          type="error"
          showIcon
          message={message.error ?? 'Yanıt alınamadı.'}
          action={
            <Button size="small" onClick={onRetry}>
              Yeniden dene
            </Button>
          }
        />
      )}
    </div>
  );
}
