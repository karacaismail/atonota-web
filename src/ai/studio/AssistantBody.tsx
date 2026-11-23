import { ThoughtChain } from '@ant-design/x';
import { Wrench } from '@phosphor-icons/react';
import { Alert, Button } from 'antd';

import { GenUI, GenUISkeleton } from '@/genui';
import type { GenUIActionHandler, GenUIDecisions } from '@/genui';

import type { AssistantMessage } from '../agent';
import { SIMULATED_TOOLS_NOTE, toChainItems } from './chain';

/**
 * Asistan yanıtı: araç işlemleri, akan metin ve GenUI blokları.
 * Araç listesi yalnız sunucunun bildirdiği izinli araç olaylarını gösterir.
 * Modelin iç düşüncesi gösterilmez. Metin düz yazıdır (AX-3).
 */
export function AssistantBody({
  message,
  onAction,
  onRetry,
  retryKind,
  busy,
  decisions,
  simulated,
}: {
  message: AssistantMessage;
  onAction: GenUIActionHandler;
  onRetry: () => void;
  /** `status`: önceki mesaj onaydır. Yeniden deneme işlemin durumunu sorar. */
  retryKind: 'status' | 'retry';
  busy: boolean;
  decisions: GenUIDecisions;
  simulated: boolean;
}) {
  const streaming = message.phase === 'streaming';
  const doneSteps = message.steps.filter((s) => s.status === 'success').length;
  return (
    <div className="ai-answer">
      {message.steps.length > 0 && (
        <details className="ai-think" open={message.phase === 'waiting' || streaming}>
          <summary>
            <Wrench aria-hidden />
            {`Araç işlemleri: ${doneSteps} / ${message.steps.length}`}
          </summary>
          {simulated && <p className="ai-note">{SIMULATED_TOOLS_NOTE}</p>}
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
      {message.phase === 'done' && (
        <GenUI blocks={message.ui} onAction={onAction} busy={busy} decisions={decisions} />
      )}
      {message.phase === 'cancelled' && <p className="ai-note">Yanıt durduruldu.</p>}
      {message.phase === 'error' && (
        <Alert
          type="error"
          showIcon
          message={message.error ?? 'Yanıt alınamadı.'}
          description={
            retryKind === 'status'
              ? 'Onayınız sunucuya ulaşmış olabilir. Onay yeniden gönderilmez. Önce işlemin durumunu sorun.'
              : undefined
          }
          action={
            <Button size="small" disabled={busy} onClick={onRetry}>
              {retryKind === 'status' ? 'İşlemin durumunu sor' : 'Yeniden dene'}
            </Button>
          }
        />
      )}
    </div>
  );
}
