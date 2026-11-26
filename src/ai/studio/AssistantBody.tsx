import { Alert, Button } from 'antd';
import { useId, type ReactNode } from 'react';

import { GenUI, GenUISkeleton } from '@/genui';
import type { GenUIActionHandler, GenUIDecisions } from '@/genui';

import type { AssistantMessage } from '../agent';
import { groupBySteps, SIMULATED_TOOLS_NOTE, type StepGroup } from './chain';

function StepSection({ group, children }: { group: StepGroup; children: ReactNode }) {
  const id = useId();
  return (
    <section className="ai-step" aria-labelledby={id} data-step={group.step}>
      <h2 id={id} className="ai-step-h">
        {group.label}
      </h2>
      {children}
    </section>
  );
}

/**
 * Asistan yanıtı: akış adımları, akan metin ve GenUI blokları.
 * Her adım onaylı yüzeyle çizilir. Örnek: plan adımında kapsam şeridi ve araç olayları.
 * Araç olayı yalnız sunucu bildirince görünür. Modelin iç düşüncesi gösterilmez (AX-3).
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
  const done = message.phase === 'done';
  // Akış bitmeden gelen bloklar gösterilmez (U5). Araç olayları sunucu gönderdikçe görünür.
  const { groups, rest } = groupBySteps(done ? message.ui : [], message.steps);
  return (
    <div className="ai-answer">
      {groups.map((group) => (
        <StepSection key={group.step} group={group}>
          {group.step === 'plan' && simulated && message.steps.length > 0 && (
            <p className="ai-note">{SIMULATED_TOOLS_NOTE}</p>
          )}
          <GenUI blocks={group.blocks} onAction={onAction} busy={busy} decisions={decisions} />
        </StepSection>
      ))}
      {message.text && (
        <p className="ai-text">
          {message.text}
          {streaming && <span className="ai-caret" aria-hidden />}
        </p>
      )}
      {streaming && <GenUISkeleton />}
      {done && <GenUI blocks={rest} onAction={onAction} busy={busy} decisions={decisions} />}
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
